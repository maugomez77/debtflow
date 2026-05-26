"""DebtFlow FastAPI application."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import get_db, init_db
from ..models import (
    AiRecommendation,
    CostBreakdown,
    DebtItem,
    DebtItemCreate,
    DebtItemResponse,
    DebtSnapshot,
    DebtSnapshotResponse,
    Repo,
    RepoCreate,
    RepoResponse,
    RoiProjection,
    ScanRequest,
    Severity,
    TimelinePoint,
)
from .analyzer import analyze_directory
from .cost import build_cost_breakdown, calculate_cost, calculate_roi
from .github import clone_repo, get_file_churn

app = FastAPI(
    title="DebtFlow",
    description="Technical Debt Quantifier API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_db()


# ── Health ──────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "debtflow", "version": "1.0.0"}


# ── Repos CRUD ──────────────────────────────────────
@app.get("/api/repos", response_model=list[RepoResponse])
async def list_repos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Repo).order_by(Repo.created_at.desc()))
    return result.scalars().all()


@app.post("/api/repos", response_model=RepoResponse, status_code=201)
async def create_repo(body: RepoCreate, db: AsyncSession = Depends(get_db)):
    repo = Repo(name=body.name, url=body.url, branch=body.branch)
    db.add(repo)
    await db.commit()
    await db.refresh(repo)
    return repo


@app.get("/api/repos/{repo_id}", response_model=RepoResponse)
async def get_repo(repo_id: str, db: AsyncSession = Depends(get_db)):
    repo = await db.get(Repo, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")
    return repo


@app.delete("/api/repos/{repo_id}", status_code=204)
async def delete_repo(repo_id: str, db: AsyncSession = Depends(get_db)):
    repo = await db.get(Repo, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")
    await db.delete(repo)
    await db.commit()


# ── Scan ────────────────────────────────────────────
@app.post("/api/repos/scan", response_model=RepoResponse)
async def scan_repo(body: ScanRequest, db: AsyncSession = Depends(get_db)):
    import shutil

    repo_path = clone_repo(body.url, body.branch)

    try:
        churn_data = get_file_churn(repo_path)
        items = analyze_directory(repo_path, churn_data)

        cost_breakdown = build_cost_breakdown(items)
    finally:
        shutil.rmtree(repo_path, ignore_errors=True)

    repo_name = body.url.rstrip("/").split("/")[-1].replace(".git", "")
    repo = Repo(name=repo_name, url=body.url, branch=body.branch)
    db.add(repo)
    await db.flush()

    for item in items:
        debt = DebtItem(
            repo_id=repo.id,
            file_path=item["file_path"],
            title=item["title"],
            description=item.get("description"),
            severity=item.get("severity", "medium"),
            category=item.get("category", "unknown"),
            estimated_hours=item.get("estimated_hours", 0),
            estimated_cost=calculate_cost(item.get("estimated_hours", 0)),
            churn_score=item.get("churn_score", 0),
            line_start=item.get("line_start"),
            line_end=item.get("line_end"),
        )
        db.add(debt)

    repo.total_debt = cost_breakdown["total_cost"]
    repo.last_scanned = datetime.now(timezone.utc)

    snapshot = DebtSnapshot(
        repo_id=repo.id,
        total_debt=cost_breakdown["total_cost"],
        item_count=len(items),
        scanned_at=datetime.now(timezone.utc),
    )
    db.add(snapshot)

    await db.commit()
    await db.refresh(repo)
    return repo


# ── Debt Items ──────────────────────────────────────
@app.get("/api/debt", response_model=list[DebtItemResponse])
async def list_debt(
    repo_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query("open"),
    db: AsyncSession = Depends(get_db),
):
    query = select(DebtItem)
    if repo_id:
        query = query.where(DebtItem.repo_id == repo_id)
    if severity:
        query = query.where(DebtItem.severity == severity)
    if status:
        query = query.where(DebtItem.status == status)
    query = query.order_by(DebtItem.estimated_cost.desc())
    result = await db.execute(query)
    return result.scalars().all()


@app.get("/api/debt/{item_id}", response_model=DebtItemResponse)
async def get_debt_item(item_id: str, db: AsyncSession = Depends(get_db)):
    item = await db.get(DebtItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Debt item not found")
    return item


@app.patch("/api/debt/{item_id}/resolve", response_model=DebtItemResponse)
async def resolve_debt(item_id: str, db: AsyncSession = Depends(get_db)):
    item = await db.get(DebtItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Debt item not found")
    item.status = "resolved"
    item.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)

    repo = await db.get(Repo, item.repo_id)
    if repo:
        open_items_result = await db.execute(
            select(func.coalesce(func.sum(DebtItem.estimated_cost), 0)).where(
                DebtItem.repo_id == repo.id, DebtItem.status == "open"
            )
        )
        repo.total_debt = float(open_items_result.scalar() or 0)
        await db.commit()

    return item


# ── Costs ───────────────────────────────────────────
@app.get("/api/costs", response_model=CostBreakdown)
async def get_costs(
    repo_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(DebtItem).where(DebtItem.status == "open")
    if repo_id:
        query = query.where(DebtItem.repo_id == repo_id)

    result = await db.execute(query)
    items = result.scalars().all()

    items_dict = [
        {
            "estimated_hours": i.estimated_hours,
            "severity": i.severity,
            "category": i.category,
            "estimated_cost": i.estimated_cost,
        }
        for i in items
    ]

    return build_cost_breakdown(items_dict)


# ── Timeline ────────────────────────────────────────
@app.get("/api/timeline", response_model=list[TimelinePoint])
async def get_timeline(
    repo_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(DebtSnapshot)
    if repo_id:
        query = query.where(DebtSnapshot.repo_id == repo_id)
    query = query.order_by(DebtSnapshot.scanned_at.asc())

    result = await db.execute(query)
    snapshots = result.scalars().all()

    points: list[dict] = []
    prev_debt = 0.0
    for s in snapshots:
        points.append({
            "date": s.scanned_at.isoformat() if s.scanned_at else "",
            "total_debt": s.total_debt,
            "item_count": s.item_count,
            "change_from_previous": round(s.total_debt - prev_debt, 2),
        })
        prev_debt = s.total_debt

    if not points:
        return []

    return points


# ── ROI ─────────────────────────────────────────────
@app.get("/api/roi/{item_id}", response_model=RoiProjection)
async def get_roi(item_id: str, db: AsyncSession = Depends(get_db)):
    item = await db.get(DebtItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Debt item not found")

    roi = calculate_roi(item.estimated_cost, [])
    return {
        "item_id": item.id,
        "item_title": item.title,
        **roi,
    }


# ── AI Recommendations ──────────────────────────────
@app.get("/api/ai/recommend", response_model=list[AiRecommendation])
async def ai_recommend(
    repo_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(DebtItem).where(DebtItem.status == "open")
    if repo_id:
        query = query.where(DebtItem.repo_id == repo_id)
    query = query.order_by(DebtItem.estimated_cost.desc()).limit(10)

    result = await db.execute(query)
    items = result.scalars().all()

    recommendations: list[dict] = []
    for item in items:
        urgency = 0.0
        if item.severity == "critical":
            urgency += 50
        elif item.severity == "high":
            urgency += 35
        elif item.severity == "medium":
            urgency += 20
        else:
            urgency += 10

        urgency += min(item.churn_score, 30)
        cost_factor = min(item.estimated_cost / 50000 * 20, 20)
        urgency += cost_factor

        reason = ""
        if item.churn_score > 50:
            reason = "High churn — this file changes frequently, causing repeated context-switching"
        elif item.severity in ("critical", "high"):
            reason = f"{item.severity.upper()} severity — fix this to reduce risk of production issues"
        else:
            reason = "High cost impact with relatively low risk of introducing new issues"

        recommendations.append({
            "item_id": item.id,
            "title": item.title,
            "reason": reason,
            "urgency_score": round(urgency, 1),
        })

    recommendations.sort(key=lambda r: r["urgency_score"], reverse=True)
    return recommendations[:5]
