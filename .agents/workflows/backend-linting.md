---
description: How to run Ruff (Python Linting) in the backend
---

# Running Ruff for Backend Code

Whenever you need to run `ruff` (the Python linter) for the backend code, you **must** use the executable located inside the local virtual environment to avoid `command not found` errors.

Do **not** run `ruff check .` directly.

Instead, always run:
```bash
venv/bin/ruff check .
```

Make sure the command is executed from the `/Users/nugroho/Documents/design-studio/backend` directory.

// turbo-all
