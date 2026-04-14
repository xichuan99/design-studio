Pin GitHub Actions to SHAs

Run the helper to replace `uses: owner/repo@ref` with pinned commit SHAs:

```bash
# provide a token with public repo read access (or use GITHUB_TOKEN in CI)
GITHUB_TOKEN=ghp_xxx python3 scripts/pin-gh-actions-shas.py
```

Review the changes, then commit and push.
