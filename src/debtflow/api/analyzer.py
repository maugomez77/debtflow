"""Code analyzer — extracts TODO/FIXME, estimates complexity, calculates churn."""
from __future__ import annotations

import re
from pathlib import Path

TODO_PATTERN = re.compile(
    r"(?://|#|/\*|\*)\s*(TODO|FIXME|HACK|XXX|OPTIMIZE|BUG|WORKAROUND|TEMP|DEPRECATED)(?:\([^)]*\))?\s*:?\s*(.*)",
    re.IGNORECASE,
)


def analyze_directory(repo_path: Path, churn_data: dict[str, dict]) -> list[dict]:
    """Walk a repo and extract debt items from code files."""
    items: list[dict] = []
    total_commits = max(max((d.get("commits", 0) for d in churn_data.values()), default=0), 1)

    for file_path in repo_path.rglob("*"):
        if file_path.is_dir():
            continue
        if any(part.startswith((".", "node_modules", ".venv", "__pycache__", "dist", "build")) for part in file_path.parts):
            continue

        suffix = file_path.suffix
        if suffix not in {".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs", ".rb", ".c", ".cpp", ".h", ".cs", ".php", ".swift", ".kt", ".scala", ".r", ".sh", ".bash"}:
            continue

        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        lines = content.split("\n")
        rel_path = str(file_path.relative_to(repo_path))

        # Extract TODO/FIXME comments
        for i, line in enumerate(lines, start=1):
            match = TODO_PATTERN.search(line)
            if match:
                tag = match.group(1).upper()
                message = match.group(2).strip() or "No description"
                severity = _tag_severity(tag)
                hours = _tag_hours(tag)

                churn_score = 0.0
                if churn_data:
                    file_churn = churn_data.get(rel_path, {})
                    changes = file_churn.get("changes", 0)
                    churn_score = round((changes / total_commits) * 100, 2)

                items.append({
                    "file_path": rel_path,
                    "title": f"[{tag}] {message[:100]}",
                    "description": f"Found at line {i}: {line.strip()[:300]}",
                    "severity": severity,
                    "category": "todo_comment",
                    "estimated_hours": hours,
                    "line_start": i,
                    "line_end": i,
                    "churn_score": churn_score,
                })

        # Complexity estimation via basic heuristics
        complexity = _estimate_complexity(lines)
        if complexity["score"] > 15:
            churn_score = 0.0
            if churn_data:
                file_churn = churn_data.get(rel_path, {})
                changes = file_churn.get("changes", 0)
                churn_score = round((changes / total_commits) * 100, 2)

            items.append({
                "file_path": rel_path,
                "title": f"High complexity: {rel_path}",
                "description": (
                    f"File has {complexity['lines']} lines, "
                    f"{complexity['functions']} functions, "
                    f"cyclomatic complexity ~{complexity['score']}"
                ),
                "severity": "high" if complexity["score"] > 30 else "medium",
                "category": "code_complexity",
                "estimated_hours": round(complexity["score"] * 0.5, 1),
                "line_start": 1,
                "line_end": len(lines),
                "churn_score": churn_score,
            })

    return items


def _tag_severity(tag: str) -> str:
    return {
        "TODO": "medium",
        "FIXME": "high",
        "HACK": "high",
        "XXX": "critical",
        "OPTIMIZE": "low",
        "BUG": "critical",
        "WORKAROUND": "high",
        "TEMP": "medium",
        "DEPRECATED": "low",
    }.get(tag, "medium")


def _tag_hours(tag: str) -> float:
    return {
        "TODO": 4.0,
        "FIXME": 8.0,
        "HACK": 12.0,
        "XXX": 16.0,
        "OPTIMIZE": 6.0,
        "BUG": 12.0,
        "WORKAROUND": 10.0,
        "TEMP": 3.0,
        "DEPRECATED": 4.0,
    }.get(tag, 4.0)


def _estimate_complexity(lines: list[str]) -> dict:
    func_count = 0
    complexity_score = 0
    for line in lines:
        stripped = line.strip()
        if re.match(r"^\s*(def |function |func |fn |public |private |protected |static )", stripped) and ("{" in stripped or ":" in stripped):
            func_count += 1
        for keyword in ["if ", "else if", "for ", "while ", "case ", "&&", "||", "catch", "switch"]:
            if keyword in stripped and not stripped.lstrip().startswith(("import", "from", "#", "//", "/*", "*")):
                complexity_score += 1

    return {
        "lines": len(lines),
        "functions": func_count,
        "score": complexity_score,
    }
