---
name: pytest-coverage
description: 'Run pytest with coverage, identify uncovered lines, and iteratively add tests until 100% coverage is reached.'
---

## Goal

Ensure all lines of code in the backend are covered by tests.

## Steps

### 1. Generate Coverage Report

For the entire backend:
```bash
cd backend
pytest --cov --cov-report=annotate:cov_annotate
```

For a specific module:
```bash
pytest --cov=app.services.credit_service --cov-report=annotate:cov_annotate
```

For specific tests:
```bash
pytest tests/test_credit_service.py --cov=app.services.credit_service --cov-report=annotate:cov_annotate
```

### 2. Read Annotated Output

- Open the `cov_annotate/` directory.
- Each source file has a matching annotated file.
- Lines starting with `!` are **not covered** by tests.
- Files with 100% coverage don't need attention.

### 3. Add Missing Tests

For each uncovered line:
- Understand what the line does in context.
- Write a focused test that exercises that branch/path.
- For async endpoints, use `pytest-asyncio` with `async def test_...`.
- For DB-dependent tests, use isolated fixtures (never the production DB).

### 4. Iterate Until 100%

Keep running and improving until no `!` lines remain:
```bash
pytest --cov --cov-report=annotate:cov_annotate
```

## Tips for This Project

- Service-layer tests (e.g., `test_credit_service.py`) should mock external calls (`fal_client`, S3, etc.).
- Use `pytest.mark.asyncio` for async FastAPI endpoints.
- Edge cases to test: invalid input, 0-credit balance, expired sessions, S3 upload failure.

Source: [github/awesome-copilot — pytest-coverage](https://github.com/github/awesome-copilot/tree/main/skills/pytest-coverage)
