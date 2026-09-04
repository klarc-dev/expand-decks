# Issue tracker: GitHub

Issues and specs for this repository live in GitHub Issues at `klarc-dev/expand-decks`. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue:** `gh issue create --title "..." --body "..."`
- **Read an issue:** `gh issue view <number> --comments`
- **List issues:** `gh issue list --state open --json number,title,body,labels,comments`
- **Comment:** `gh issue comment <number> --body "..."`
- **Apply or remove labels:** `gh issue edit <number> --add-label "..."` / `gh issue edit <number> --remove-label "..."`
- **Close:** `gh issue close <number> --reason completed`

Infer the repository from `git remote -v`; `gh` does this automatically inside the clone.

## Pull requests as a triage surface

**PRs as a request surface: no.**

Pull requests are not included in triage discovery. An explicitly named PR can still be inspected directly. GitHub shares one number space across issues and PRs, so resolve an ambiguous `#<number>` by checking the PR and issue endpoints.

## Skill operations

- When a skill says **publish to the issue tracker**, create a GitHub issue.
- When a skill says **fetch the relevant ticket**, run `gh issue view <number> --comments`.

## Wayfinding operations

- A wayfinder map is one issue labelled `wayfinder:map`.
- Decision tickets are linked as GitHub sub-issues when available; otherwise use a task list in the map and add `Part of #<map>` to each child.
- Represent blocking edges with GitHub issue dependencies when available; otherwise use `Blocked by: #<number>` in the child body.
- Claim work by assigning the issue to the active developer.
- Resolve a decision ticket by posting the decision, closing the ticket, and adding its context pointer to the map.
