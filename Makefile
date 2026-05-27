.PHONY: test smoke dev build install

VENV := .venv/bin

install:
	pip3 install -r requirements.txt
	pip3 install pytest pytest-asyncio httpx aiosqlite

MOD_NAME := debtflow

test: smoke
	$(VENV)/python3 -c "import pytest; print('pytest OK')"

smoke:
	PYTHONPATH=src DATABASE_URL=sqlite+aiosqlite:///test.db $(VENV)/python3 -c "\
import asyncio; \
mod = __import__('$(MOD_NAME).api.main', fromlist=['app']); \
app = mod.app; \
routes = [r.path for r in app.routes if hasattr(r, 'path')]; \
assert '/health' in routes, 'missing /health'; \
from $(MOD_NAME).db import init_db; \
asyncio.run(init_db()); \
print(f'$(MOD_NAME): {len(routes)} routes OK, DB OK')" && rm -f test.db

dev:
	PYTHONPATH=src $(VENV)/uvicorn $(MOD_NAME).api.main:app --reload --port 8000

build:
	cd frontend && npm install && npm run build
