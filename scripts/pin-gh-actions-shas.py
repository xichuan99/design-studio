#!/usr/bin/env python3
"""Pin GitHub Actions in workflow files to immutable commit SHAs.

Usage:
  GITHUB_TOKEN=ghp_xxx python3 scripts/pin-gh-actions-shas.py 

The script will scan `.github/workflows/*.yml` for `uses: owner/repo@ref` lines,
query the GitHub API to resolve `ref` to a commit SHA, and replace the ref with
the SHA in-place (committing is left to the user).

This must be run in a networked environment with a GitHub token that has
read access to the action repositories (public repos can be accessed without
auth but are rate limited).
"""
import os
import re
import sys
import glob
import json
from urllib import request, error
from typing import Optional


GITHUB_API = "https://api.github.com"


def get_owner_repo_and_ref(uses_str: str):
    # expects owner/repo@ref
    if "@" not in uses_str:
        return None
    repo_part, ref = uses_str.split("@", 1)
    if "/" not in repo_part:
        return None
    owner, repo = repo_part.split("/", 1)
    return owner, repo, ref


def github_api_get(path: str, token: Optional[str]):
    url = GITHUB_API + path
    req = request.Request(url, headers={"Accept": "application/vnd.github+json"})
    if token:
        req.add_header("Authorization", f"token {token}")
    try:
        with request.urlopen(req) as resp:
            return json.load(resp)
    except error.HTTPError as e:
        print(f"HTTPError {e.code} for {url}: {e.reason}")
        raise


def resolve_ref_to_sha(owner: str, repo: str, ref: str, token: Optional[str]):
    # Use commits endpoint which accepts branch/tag/sha
    path = f"/repos/{owner}/{repo}/commits/{ref}"
    try:
        data = github_api_get(path, token)
        sha = data.get("sha")
        return sha
    except Exception:
        return None


def pin_file(path: str, token: Optional[str]):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    pattern = re.compile(r"uses:\s*([\w\-\.]+\/[\w\-\.]+@[^\s]+)")
    matches = pattern.findall(text)
    if not matches:
        print(f"No 'uses:' entries found in {path}")
        return False

    replaced = False
    for full in set(matches):
        parsed = get_owner_repo_and_ref(full)
        if not parsed:
            continue
        owner, repo, ref = parsed
        print(f"Resolving {owner}/{repo}@{ref}...")
        sha = resolve_ref_to_sha(owner, repo, ref, token)
        if not sha:
            print(f"  Could not resolve {owner}/{repo}@{ref}; skipping")
            continue
        new = f"{owner}/{repo}@{sha}"
        text = text.replace(full, new)
        print(f"  Replaced {full} -> {new}")
        replaced = True

    if replaced:
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Updated {path}")
    else:
        print(f"No replacements performed for {path}")

    return replaced


def main():
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    wf_paths = glob.glob(".github/workflows/*.yml") + glob.glob(".github/workflows/*.yaml")
    if not wf_paths:
        print("No workflow files found under .github/workflows/")
        sys.exit(1)

    any_changed = False
    for p in wf_paths:
        print(f"Scanning {p}")
        changed = pin_file(p, token)
        any_changed = any_changed or changed

    if not any_changed:
        print("No changes made. If you expected changes, run with a valid GITHUB_TOKEN in the environment.")
    else:
        print("Done. Review changes and commit them if OK.")


if __name__ == "__main__":
    main()
