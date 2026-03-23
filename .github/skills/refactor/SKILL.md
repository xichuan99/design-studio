---
name: refactor
description: 'Surgical code refactoring to improve maintainability without changing behavior. Use for gradual improvements: extract functions, eliminate code smells, improve type safety, apply design patterns.'
---

## When to Use

- Code is hard to understand or maintain
- Functions/classes are too large (> 50 lines)
- Duplicated logic across multiple files
- Adding features is difficult due to code structure
- User asks "clean up this code", "refactor this", "improve this"

## Golden Rules

1. **Behavior is preserved** — refactoring doesn't change what the code does, only how
2. **Small steps** — make one change at a time, run tests after each
3. **Tests first** — without tests, you're not refactoring, you're editing
4. **One thing at a time** — don't mix refactoring with feature changes

## Common Code Smells to Fix

| Smell | Fix |
|---|---|
| Long function (> 50 lines) | Extract smaller functions |
| Duplicated code | Extract shared utility/helper |
| Large class/component | Split by single responsibility |
| Long parameter list | Group into interface/object |
| Nested conditionals (arrow code) | Use guard clauses / early returns |
| Magic numbers/strings | Extract named constants |
| Dead code | Delete it (git history preserves it) |
| No type safety | Add TypeScript interfaces and types |

## Refactoring Process

```
1. PREPARE   — ensure tests exist, commit current state
2. IDENTIFY  — find the smell, understand what the code does
3. REFACTOR  — one small change, run tests, commit if passing
4. VERIFY    — all tests pass, behavior unchanged
5. CLEAN UP  — update comments, final commit
```

## Checklist

- [ ] Functions are small and do one thing
- [ ] No duplicated logic
- [ ] Descriptive names (variables, functions, components)
- [ ] No magic numbers/strings
- [ ] Dead code removed
- [ ] Types defined for all public APIs
- [ ] No `any` types without justification
- [ ] All tests still pass

Source: [github/awesome-copilot — refactor](https://github.com/github/awesome-copilot/tree/main/skills/refactor)
