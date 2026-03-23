---
name: postgresql-optimization
description: 'PostgreSQL query optimization and schema review. Covers EXPLAIN ANALYZE, indexing strategy, JSONB, pagination, and security (parameterized queries).'
---

## Goal

Analyze and optimize PostgreSQL queries, schemas, and indexes in this project (SQLAlchemy + Alembic + asyncpg).

## Workflow

### 1. Analyze the Query

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
<your query here>;
```

Look for:
- Sequential scans (`Seq Scan`) on large tables → add index
- Nested loop on high-row joins → consider hash join
- High `actual rows` vs `estimated rows` → run `ANALYZE`

### 2. Check Slow Queries

```sql
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### 3. Indexing Checklist

- [ ] Composite index for multi-column `WHERE` clauses
- [ ] Partial index for filtered queries (e.g., `WHERE status = 'active'`)
- [ ] Expression index for computed values (e.g., `lower(email)`)
- [ ] GIN index for JSONB columns or full-text search
- [ ] Remove unused indexes: `WHERE idx_scan = 0` in `pg_stat_user_indexes`

### 4. Common Patterns

**Cursor-based pagination (not OFFSET):**
```sql
-- ✅ GOOD
SELECT * FROM projects WHERE id > $last_id ORDER BY id LIMIT 20;
-- ❌ BAD
SELECT * FROM projects ORDER BY id OFFSET 10000 LIMIT 20;
```

**JSONB queries (use GIN index):**
```sql
CREATE INDEX idx_metadata_gin ON projects USING gin(metadata);
SELECT * FROM projects WHERE metadata @> '{"type": "poster"}';
```

**Parameterized queries only — never string concatenation:**
```python
# ✅ SQLAlchemy ORM or text() with bindparams
await db.execute(select(Project).where(Project.user_id == user_id))
# ❌ NEVER
await db.execute(f"SELECT * FROM projects WHERE user_id = {user_id}")
```

### 5. Alembic Migration Safety

- Always review `alembic upgrade` SQL before running in production.
- For large tables, use `CREATE INDEX CONCURRENTLY` to avoid locking.
- Never modify columns directly — add new column, migrate data, drop old.

## Security Checklist

- [ ] All queries use parameterized inputs
- [ ] Row-level security enabled where needed
- [ ] Sensitive data columns (e.g., passwords) never returned raw

Source: [github/awesome-copilot — postgresql-optimization](https://github.com/github/awesome-copilot/tree/main/skills/postgresql-optimization)
