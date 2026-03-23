---
name: conventional-commit
description: 'Generate a conventional commit message from staged/unstaged changes and automatically commit.'
---

### Workflow

**Follow these steps:**

1. Run `git status` to review changed files.
2. Run `git diff` or `git diff --cached` to inspect changes.
3. Stage your changes with `git add <file>` if not already staged.
4. Construct your commit message using the structure below.
5. Run the commit command in the terminal automatically — no confirmation needed.

### Commit Message Structure

```
type(scope): short imperative description

[optional body: more detailed explanation]

[optional footer: BREAKING CHANGE: ... or Closes #123]
```

**Types:** `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `build` | `ci` | `chore` | `revert`

### Examples

```
feat(editor): add layer duplication via keyboard shortcut
fix(auth): resolve session expiry not redirecting to login
refactor(store): split editorStore into shape and canvas slices
test(api): add pytest coverage for credit deduction endpoint
ci(github-actions): pin checkout action to immutable SHA
chore(deps): upgrade next to 16.1.6
```

### Validation

- **type**: Must be one of the allowed types above.
- **scope**: Optional but recommended (e.g., `editor`, `auth`, `api`, `store`, `docker`).
- **description**: Required. Imperative mood ("add", not "added"). Max 72 chars.
- **body**: Optional. Use for additional context or rationale.
- **footer**: Use for breaking changes (`BREAKING CHANGE:`) or issue references (`Closes #123`).

### Final Step

```bash
git commit -m "type(scope): description"
```

Source: [github/awesome-copilot — conventional-commit](https://github.com/github/awesome-copilot/tree/main/skills/conventional-commit)
