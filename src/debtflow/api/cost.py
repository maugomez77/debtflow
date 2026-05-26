"""Cost calculator — maps dev hours to dollar amounts."""
from __future__ import annotations

from ..config import settings


def calculate_cost(hours: float, hourly_rate: float | None = None) -> float:
    rate = hourly_rate or settings.HOURLY_RATE
    return round(hours * rate, 2)


def build_cost_breakdown(items: list, hourly_rate: float | None = None) -> dict:
    rate = hourly_rate or settings.HOURLY_RATE

    total_hours = sum(item.get("estimated_hours", 0) for item in items)
    total_cost = total_hours * rate

    by_severity: dict[str, float] = {}
    by_category: dict[str, float] = {}
    for item in items:
        sev = item.get("severity", "unknown")
        cat = item.get("category", "unknown")
        cost = item.get("estimated_hours", 0) * rate
        by_severity[sev] = by_severity.get(sev, 0) + cost
        by_category[cat] = by_category.get(cat, 0) + cost

    return {
        "total_cost": round(total_cost, 2),
        "hourly_rate": rate,
        "total_hours": round(total_hours, 1),
        "by_severity": {k: round(v, 2) for k, v in by_severity.items()},
        "by_category": {k: round(v, 2) for k, v in by_category.items()},
        "projected_monthly_cost": round(total_cost * 0.15, 2),
        "items_count": len(items),
    }


def calculate_roi(cost_to_fix: float, items: list, hourly_rate: float | None = None) -> dict:
    rate = hourly_rate or settings.HOURLY_RATE
    monthly_savings = round(cost_to_fix * 0.12, 2)
    break_even = round(cost_to_fix / monthly_savings, 1) if monthly_savings > 0 else float("inf")

    return {
        "cost_to_fix": cost_to_fix,
        "monthly_savings": monthly_savings,
        "break_even_months": break_even,
        "one_year_savings": round(monthly_savings * 12, 2),
        "five_year_savings": round(monthly_savings * 60, 2),
    }
