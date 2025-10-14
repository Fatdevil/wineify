# Contributing to Wineify

## Branch workflow
- Create feature branches using the format `codex/<task-slug>`.
- Always rebase your branch on the latest `main` before opening or updating a pull request.
- The repository is configured to automatically delete head branches after a pull request merges, so keep your local clones up to date.

## Testing standards
- Vitest is the single supported test framework. Run the backend test suite from `api/` with:
  ```bash
  npm test
  ```
- Ensure the test suite passes locally before submitting any pull request.
- Continuous Integration (CI) must be green before reviewers merge.

## Repository settings
- The `main` branch requires status checks to pass and branches must be up to date with `main` before merging.
- Auto-deletion of merged branches is enabled to keep the branch list clean.

## Pull request housekeeping
- Close or supersede stale pull requests with a short status comment so the open queue reflects active work.
- Reference relevant commits (for example, `fc001cd` and later for the stabilized CI/test setup) when closing superseded proposals.
