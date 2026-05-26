"""Pydantic models and SQLAlchemy ORM models for DebtFlow."""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


# ── Enums ────────────────────────────────────────────
class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ── SQLAlchemy ORM Models ───────────────────────────
class Repo(Base):
    __tablename__ = "repos"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    branch: Mapped[str] = mapped_column(String(128), default="main")
    last_scanned: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_debt: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    debt_items: Mapped[list[DebtItem]] = relationship(back_populates="repo", cascade="all, delete-orphan")
    snapshots: Mapped[list[DebtSnapshot]] = relationship(back_populates="repo", cascade="all, delete-orphan")


class DebtItem(Base):
    __tablename__ = "debt_items"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    repo_id: Mapped[str] = mapped_column(ForeignKey("repos.id", ondelete="CASCADE"), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(20), default=Severity.MEDIUM.value)
    category: Mapped[str] = mapped_column(String(50), default="code_complexity")
    estimated_hours: Mapped[float] = mapped_column(Float, default=0.0)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0)
    churn_score: Mapped[float] = mapped_column(Float, default=0.0)
    line_start: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    line_end: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    repo: Mapped[Repo] = relationship(back_populates="debt_items")


class DebtSnapshot(Base):
    __tablename__ = "debt_snapshots"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    repo_id: Mapped[str] = mapped_column(ForeignKey("repos.id", ondelete="CASCADE"), nullable=False)
    total_debt: Mapped[float] = mapped_column(Float, default=0.0)
    item_count: Mapped[int] = mapped_column(Integer, default=0)
    scanned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    repo: Mapped[Repo] = relationship(back_populates="snapshots")


# ── Pydantic Request/Response Models ────────────────
class RepoCreate(BaseModel):
    name: str
    url: str
    branch: str = "main"


class RepoResponse(BaseModel):
    id: str
    name: str
    url: str
    branch: str
    last_scanned: Optional[datetime] = None
    total_debt: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True


class DebtItemCreate(BaseModel):
    file_path: str
    title: str
    description: Optional[str] = None
    severity: Severity = Severity.MEDIUM
    category: str = "code_complexity"
    estimated_hours: float = 0.0
    line_start: Optional[int] = None
    line_end: Optional[int] = None


class DebtItemResponse(BaseModel):
    id: str
    repo_id: str
    file_path: str
    title: str
    description: Optional[str] = None
    severity: str
    category: str
    estimated_hours: float
    estimated_cost: float
    churn_score: float
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DebtSnapshotResponse(BaseModel):
    id: str
    repo_id: str
    total_debt: float
    item_count: int
    scanned_at: datetime

    class Config:
        from_attributes = True


class CostBreakdown(BaseModel):
    total_cost: float
    hourly_rate: float
    total_hours: float
    by_severity: dict[str, float]
    by_category: dict[str, float]
    projected_monthly_cost: float
    items_count: int


class TimelinePoint(BaseModel):
    date: str
    total_debt: float
    item_count: int
    change_from_previous: float


class RoiProjection(BaseModel):
    item_id: str
    item_title: str
    cost_to_fix: float
    monthly_savings: float
    break_even_months: float
    one_year_savings: float
    five_year_savings: float


class ScanRequest(BaseModel):
    url: str
    branch: str = "main"


class AiRecommendation(BaseModel):
    item_id: str
    title: str
    reason: str
    urgency_score: float
