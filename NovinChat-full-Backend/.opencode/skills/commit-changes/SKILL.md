---
name: commit-changes
description: Use when the user asks to commit, stage, or push changes. Prepares a commit with a clear message, stages files, and commits using conventional commit format.
---

# Commit Changes

When the user asks to commit, stage, or push changes:

1. EXECUTE `git status` and read the output
2. EXECUTE `git diff --staged` and `git diff` to see what changed
3. Stage files by EXECUTING `git add <files>` — not by describing what to add
4. Write a conventional commit message: `type(scope): description`
5. EXECUTE `git commit -m "<message>"`
6. If push was requested, EXECUTE `git push`

DO NOT just describe these steps. You MUST actually run each command using the bash tool. The only text you should output to the user is the commit summary after everything is done.
