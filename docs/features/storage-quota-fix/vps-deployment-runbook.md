# VPS Deployment & Reconciliation Runbook

## Storage Quota Fix - Deployment Instructions

This runbook contains all commands needed to deploy the storage quota fix to production VPS.

**Deployment Timeline:**
- **Afternoon (During Work Hours):** Deploy Phase 1 code changes (API endpoints)
- **Early Morning (2-4 AM, Low Traffic):** Run Phase 2 reconciliation script
- **Next Morning:** Run Phase 3 schema migration (optional)

---

## Phase 1: Deploy Code Changes (Afternoon)

After pulling the latest code from git, no special VPS commands needed - just standard deployment.

```bash
# Standard deployment process
# (adjust for your CI/CD pipeline)
git pull origin main
# Your deployment triggers here (Docker build, systemctl restart, etc.)
```

**Verification:**
```bash
# Check that API is responding
curl -s https://your-api.com/health | jq .

# Monitor logs for any errors during the next few hours
journalctl -u design-studio-backend -f
```

---

## Phase 2: Storage Reconciliation (2-4 AM)

### Prerequisites
- Latest code deployed (Phase 1 complete)
- Database is backed up
- Low-traffic window (2-4 AM recommended)

### Step 1: SSH into VPS

```bash
ssh user@your-vps.com
cd /path/to/design-studio
```

### Step 2: Run Reconciliation Script

**Option A: Full verbose reconciliation (recommended for first run)**

```bash
# Activate virtual environment
source backend/.venv/bin/activate

# Run with verbose output to monitor progress
python -m scripts.backfill_storage --verbose 2>&1 | tee /tmp/reconciliation_$(date +%Y%m%d_%H%M%S).log

# Example output:
# 2026-04-27 02:15:30 - INFO - Starting storage backfill reconciliation...
# 2026-04-27 02:15:31 - INFO - Processing 1253 users...
# 2026-04-27 02:15:35 - INFO - [1/1253] user1@example.com: FIXED 450.25 MB → 320.50 MB (reclaimed: 129.75 MB)
# ...
# 2026-04-27 02:45:00 - INFO - ======================================================================
# 2026-04-27 02:45:00 - INFO - RECONCILIATION SUMMARY
# 2026-04-27 02:45:00 - INFO - ======================================================================
# 2026-04-27 02:45:00 - INFO - Total users processed: 1253
# 2026-04-27 02:45:00 - INFO - Users fixed: 387
# 2026-04-27 02:45:00 - INFO - Errors encountered: 0
# 2026-04-27 02:45:00 - INFO - Total storage reclaimed: 1250.34 GB
```

**Option B: Limited test run (test on 10 users first)**

```bash
# Dry-run on first 10 users
source backend/.venv/bin/activate
python -m scripts.backfill_storage --verbose --limit 10
```

### Step 3: Verify Results

```bash
# Check the log file
tail -50 /tmp/reconciliation_*.log

# Spot-check a few random users in DB
psql $DATABASE_URL -c "
SELECT email, storage_used, storage_quota 
FROM users 
ORDER BY RANDOM() 
LIMIT 5;
"

# Count how many users were affected
psql $DATABASE_URL -c "
SELECT COUNT(*) as users_with_storage 
FROM users 
WHERE storage_used > 0;
"
```

### Step 4: Monitor API logs

```bash
# Check for any errors related to storage in the 30 mins after reconciliation
journalctl -u design-studio-backend -n 100 -S "30 min ago"

# Search for error patterns
journalctl -u design-studio-backend -S "30 min ago" | grep -i "storage\|error\|fail"
```

---

## Phase 3: Schema Migration (Optional - Next Morning)

### Prerequisites
- Phase 1 & 2 complete and verified
- Database is backed up
- ~5 minutes of downtime acceptable (if using blue-green deploy, not needed)

### Step 1: SSH into VPS

```bash
ssh user@your-vps.com
cd /path/to/design-studio
```

### Step 2: Run Alembic Migration

```bash
# Activate virtual environment
source backend/.venv/bin/activate

# Check migration status before running
alembic current

# Run the migration
alembic upgrade head

# Example output:
# INFO  [alembic.migration] Context impl PostgresqlImpl.
# INFO  [alembic.migration] Will assume transactional DDL.
# INFO  [alembic.migration] Running upgrade c9e3f5b2a1d8 -> (head), change_job_project_fk_to_cascade
```

### Step 3: Verify Migration

```bash
# Check that migration was applied
alembic current

# Verify the FK constraint was changed
psql $DATABASE_URL -c "
SELECT constraint_name, table_name, column_name 
FROM information_schema.key_column_usage 
WHERE table_name = 'jobs' AND column_name = 'project_id';
"

# Check the constraint definition (should show CASCADE)
psql $DATABASE_URL -c "
SELECT constraint_name, table_name, confdeltype 
FROM pg_constraint 
WHERE table_name = 'jobs' AND column_name::text LIKE 'project%';
" 2>/dev/null || echo "Note: Above query is PostgreSQL-specific"
```

---

## Troubleshooting

### Issue: Reconciliation takes too long

```bash
# Kill the current process
pkill -f "backfill_storage"

# Try with limit flag for smaller batches
source backend/.venv/bin/activate
python -m scripts.backfill_storage --limit 100
# Then run again with next batch
python -m scripts.backfill_storage --verbose --limit 100 > /tmp/batch2.log &
```

### Issue: Database connection error

```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# If not set, load from .env
export $(cat backend/.env | grep DATABASE_URL | xargs)
```

### Issue: Migration fails

```bash
# See what revision failed
alembic history

# Downgrade to previous version if needed
alembic downgrade -1

# Check logs
tail -100 /tmp/alembic_*.log
```

### Issue: Some users show higher storage after reconciliation

This is expected if they deleted projects between now and the first run. New project deletions (after Phase 1 deploy) will decrement storage correctly.

```bash
# To verify reconciliation is working for new deletions:
# 1. Create a test project with ~50MB file
# 2. Delete the project
# 3. Check that storage_used decreased by ~50MB in real-time
```

---

## Rollback Plan

### If Phase 1 (Endpoints) needs to be rolled back

```bash
# Simple: deploy previous version from git
git checkout HEAD~1
# Or deploy specific commit
git checkout <commit-hash>
# Then trigger re-deploy
```

**Impact:** Projects deleted after Phase 1 deploy won't have storage reclaimed until Phase 1 is re-deployed.

### If Phase 2 (Reconciliation) has issues

```bash
# It's safe to re-run - script is idempotent
source backend/.venv/bin/activate
python -m scripts.backfill_storage --verbose
```

**No rollback needed** - reconciliation only sums actual file sizes, running it twice has same result.

### If Phase 3 (Migration) needs to be rolled back

```bash
# Downgrade the migration
alembic downgrade -1

# Verify
alembic current
```

**Impact:** New project deletions will leave orphaned jobs again (reverts to SET NULL behavior).

---

## Success Criteria Checklist

- [ ] Phase 1: API deploys without errors
- [ ] Phase 1: Existing tests pass: `pytest backend/tests/ -v`
- [ ] Phase 2: Reconciliation runs, shows summary with users fixed & storage reclaimed
- [ ] Phase 2: Spot-checked 5-10 random users, storage_used is reasonable
- [ ] Phase 2: No errors in API logs during/after reconciliation
- [ ] Phase 3: Migration completes successfully: `alembic current` shows new revision
- [ ] Phase 3 (Optional): Test new behavior - delete a project, verify storage decreases

---

## Monitoring Post-Deployment

### Daily checks for 1 week

```bash
# Monitor error rate
curl -s https://your-api.com/metrics | grep "error_rate"

# Check project deletion endpoint response time (should be fast)
journalctl -u design-studio-backend -n 100 | grep "delete.*project"

# Spot-check user storage meter accuracy
psql $DATABASE_URL -c "
SELECT 
  email, 
  storage_used, 
  storage_quota,
  ROUND(100.0 * storage_used / storage_quota, 1) as pct_used
FROM users 
WHERE storage_used > 0 
ORDER BY storage_quota DESC 
LIMIT 10;
"
```

### Alert conditions

- ⚠️ If project deletion starts returning 5XX errors
- ⚠️ If storage_used becomes negative for any user
- ⚠️ If API latency increases >500ms for project operations

---

## Support Contact

If issues arise during deployment:
1. Check logs: `journalctl -u design-studio-backend -f`
2. Review troubleshooting section above
3. Contact DevOps team with:
   - Exact error message
   - Logs from `/tmp/reconciliation_*.log`
   - Which phase failed (1, 2, or 3)

---

## File Manifest

**Code Changes (already deployed):**
- `backend/app/api/projects.py` - Fixed delete_project() and delete_project_version()
- `backend/scripts/backfill_storage.py` - Improved reconciliation script
- `backend/alembic/versions/c9e3f5b2a1d8_*.py` - Migration for CASCADE FK

**Tests (already run locally):**
- `backend/tests/test_projects_storage.py` - Project deletion tests
- `backend/tests/test_storage_quota_service.py` - Reconciliation tests

---

## Timeline Reference

| Phase | When | Duration | Downtime |
|-------|------|----------|----------|
| 1 (Deploy) | Afternoon | 5-15 min | None |
| 2 (Reconcile) | 2-4 AM | 15-30 min | None |
| 3 (Migrate) | Next morning | 5-10 min | <1 min |

**Estimated total:** 30-40 minutes spread over 24 hours
