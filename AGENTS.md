<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Purpose

- Keep this file concise and limited to stable project-wide rules.
- Prefer the smallest valid change that fully solves the requested problem.
- Follow the project's existing conventions before introducing new ones.

## Scope and precedence

- Follow direct user instructions unless they are unsafe, impossible, or conflict with a higher-priority platform constraint.
- Apply the nearest applicable instruction file when working inside a subdirectory.
- Do not duplicate parent instructions or infer policy from deleted, generated, historical, or unrelated files.
- Keep detailed procedures, tool-specific instructions, and temporary context outside this file.

## Before making changes

- Identify the target files, affected scope, relevant owner, assumptions, and validation path.
- Inspect the minimum evidence needed to make a safe decision; expand the investigation only when necessary.
- Check the existing working tree first and preserve unrelated user changes.
- When requirements are materially ambiguous, state the assumption or ask for clarification before proceeding.

## Making changes

- Make the smallest coherent change that addresses the controlling issue.
- Avoid unrelated refactors, speculative improvements, and workaround layers.
- Preserve public interfaces and existing behavior unless the requested change requires otherwise.
- Update tests, documentation, configuration, or migration notes when the change affects them.
- Keep changes focused, readable, and easy to review.

## Validation and safety

- Run the closest relevant tests, linters, formatters, builds, or validators after making changes.
- Use broader validation when the change crosses module or system boundaries.
- Do not expose secrets, credentials, tokens, or sensitive data.
- Do not perform destructive actions, change permissions, create external side effects, commit, or push without explicit authorization.
- If validation cannot be run or fails because of the environment, report the exact command, result, and remaining risk.
- Never claim that a check passed unless it was actually run and verified.

## Completion report

- Summarize the outcome and the reason for the change.
- List the files changed.
- Report the validation commands and their results.
- State important assumptions, limitations, and unresolved issues.