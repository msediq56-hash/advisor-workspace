# Legacy Notes

## Purpose

This file captures what we learned from previous project iterations so we do not repeat the same mistakes.

## Legacy stages

1. Excel prototype
2. Simple HTML prototype
3. Claude Code implementation attempt (older architecture)

## What was useful

- The idea itself was validated through real operational pain
- Advisors needed fast answers
- Comparison and direct evaluation were both valuable
- British qualification complexity exposed real modeling weaknesses early
- The old work helped clarify the real product

## What failed or became risky

- Patch-based evolution instead of architecture-first development
- Weak separation between data, logic, and UI
- Logic drift between different flows
- Overconfidence in passing tests without real-world validation
- Underestimating qualification complexity
- Risk of treating data problems as engine bugs
- Risk of over-expanding product scope

## Hard lessons learned

- Working code does not mean correct architecture
- Passing tests do not guarantee business correctness
- British qualification cannot be treated like a simple form case
- Program and offering must be separated
- Admin-entered rules require governance and validation
- Missing rules must have explicit system behavior
- AI should assist data structuring, not publish blindly

## What must not be repeated

- No patchy rebuild on top of broken foundations
- No uncontrolled JSON as core data model
- No business logic in UI
- No expansion into CRM scope
- No skipping versioning for rules
- No ignoring rule/data validation
