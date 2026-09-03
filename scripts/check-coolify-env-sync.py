#!/usr/bin/env python3
"""Guard against Coolify env drift.

Every ``${VAR}`` referenced by docker-compose.yaml must be forwarded in the
``env:`` block of each workflow step that runs ``scripts/sync-coolify-env.sh``.

The sync script derives its key list from docker-compose.yaml and fails closed
on any unset variable. Without this guard that failure surfaces only at deploy
time, after tests pass. Running it in CI moves the error to the PR that
introduced the drift.

Variables carrying a compose default (``${FOO:-bar}``) are optional and exempt.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

COMPOSE_FILE = Path("docker-compose.yaml")
WORKFLOWS = (
    Path(".github/workflows/ci.yml"),
    Path(".github/workflows/sync-coolify-secrets.yml"),
)
SYNC_SCRIPT = "sync-coolify-env.sh"

VAR_REF = re.compile(r"\$\{([A-Z0-9_]+)(:-)?")


def compose_required_keys(path: Path) -> set[str]:
    """Keys referenced without a default — the ones a deploy cannot do without."""
    text = path.read_text(encoding="utf-8")
    required: set[str] = set()
    optional: set[str] = set()
    for name, has_default in VAR_REF.findall(text):
        (optional if has_default else required).add(name)
    # A key with a default anywhere is satisfiable by compose itself.
    return required - optional


def sync_steps(workflow: Path):
    """Yield (job_name, env keys) for every step invoking the sync script.

    This intentionally parses only the small workflow subset we own instead of
    depending on PyYAML, which is not installed on GitHub's runner by default.
    """
    lines = workflow.read_text(encoding="utf-8").splitlines()
    job_name = "<unknown>"
    in_jobs = False

    for index, line in enumerate(lines):
        indent = len(line) - len(line.lstrip())
        stripped = line.strip()
        if stripped == "jobs:":
            in_jobs = True
            continue
        if in_jobs and indent == 2 and stripped.endswith(":"):
            job_name = stripped[:-1]
        if SYNC_SCRIPT not in stripped or not stripped.startswith("run:"):
            continue

        env_keys: set[str] = set()
        scan = index - 1
        while scan >= 0:
            candidate = lines[scan]
            candidate_indent = len(candidate) - len(candidate.lstrip())
            candidate_stripped = candidate.strip()
            if candidate_indent < indent and candidate_stripped.startswith("- name:"):
                break
            if candidate_indent == indent and candidate_stripped == "env:":
                env_scan = scan + 1
                while env_scan < index:
                    env_line = lines[env_scan]
                    env_indent = len(env_line) - len(env_line.lstrip())
                    match = re.match(r"\s*([A-Z0-9_]+):", env_line)
                    if env_indent <= indent:
                        break
                    if match:
                        env_keys.add(match.group(1))
                    env_scan += 1
                break
            scan -= 1

        yield job_name, env_keys, stripped


def main() -> int:
    if not COMPOSE_FILE.is_file():
        print(f"::error::{COMPOSE_FILE} not found")
        return 1

    required = compose_required_keys(COMPOSE_FILE)
    if not required:
        print(f"::error::No required ${{VAR}} references found in {COMPOSE_FILE}")
        return 1

    failures = 0
    checked_steps = 0

    for workflow in WORKFLOWS:
        if not workflow.is_file():
            print(f"::error::{workflow} not found")
            return 1

        for job_name, forwarded, run_command in sync_steps(workflow):
            checked_steps += 1
            for key in sorted(required - forwarded):
                print(
                    f"::error file={workflow}::{key} is required by {COMPOSE_FILE} "
                    f"but not forwarded by sync step '{run_command}' in job '{job_name}'"
                )
                failures += 1

    if checked_steps == 0:
        print(f"::error::No workflow step runs {SYNC_SCRIPT} — the deploy would not sync env.")
        return 1

    if failures:
        print("::error::Coolify env drift detected — a deploy would fail on a missing variable.")
        return 1

    print(
        f"Coolify env forwarding is in sync "
        f"({len(required)} required variables across {checked_steps} sync steps)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
