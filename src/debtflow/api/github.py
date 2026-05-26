"""GitHub integration — clone, analyze commits, compute file churn."""
from __future__ import annotations

import os
import re
import shutil
import tempfile
from collections import defaultdict
from pathlib import Path

from git import Repo as GitRepo

from ..config import settings


def clone_repo(repo_url: str, branch: str = "main") -> Path:
    clone_dir = Path(settings.CLONE_DIR)
    clone_dir.mkdir(parents=True, exist_ok=True)
    repo_name = repo_url.rstrip("/").split("/")[-1].replace(".git", "")
    dest = clone_dir / repo_name
    if dest.exists():
        shutil.rmtree(dest)
    GitRepo.clone_from(repo_url, str(dest), branch=branch, depth=100)
    return dest


def get_file_churn(repo_path: Path) -> dict[str, dict]:
    """Calculate churn score per file from git history."""
    try:
        repo = GitRepo(str(repo_path))
    except Exception:
        return {}

    churn: dict[str, dict] = defaultdict(lambda: {"changes": 0, "additions": 0, "deletions": 0, "commits": 0})

    try:
        for commit in list(repo.iter_commits(max_count=200)):
            if len(commit.parents) == 0:
                continue
            parent = commit.parents[0]
            diffs = parent.diff(commit, create_patch=False)
            for diff in diffs:
                path = diff.b_path or diff.a_path
                if path and (path.endswith((".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs", ".rb", ".c", ".cpp", ".h", ".cs", ".php", ".swift", ".kt"))):
                    churn[path]["commits"] += 1
                    churn[path]["changes"] += 1
    except Exception:
        pass

    return dict(churn)


def compute_churn_score(file_path: str, churn_data: dict[str, dict], total_commits: int = 1) -> float:
    file_churn = churn_data.get(file_path, {})
    changes = file_churn.get("changes", 0)
    return round((changes / max(total_commits, 1)) * 100, 2)
