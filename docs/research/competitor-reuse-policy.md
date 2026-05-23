# Competitor Reuse Policy

## Rule

- [Verified] Competitor investigation is allowed.
- [Verified] Pattern learning is allowed.
- [Verified] Direct code adoption into Oleriq is blocked until a deliberate legal review record exists.

## Reuse Gate Values

- [Verified] `reference_only` means the repo can be used for understanding, comparison, and behavior-level notes, but not for code transplantation.
- [Verified] `legal_review_required` means the repo may be deeply inspected, but no code or near-code artifact may move into Oleriq until an explicit human review approves it.
- [Verified] `approved_for_limited_adoption` means a specific reviewed scope has been approved; it does not authorize broad copying outside that approved scope.

## Automatic Block Conditions

- [Verified] Block direct adoption when the repo has no verifiable license.
- [Verified] Block direct adoption when the repo license is custom, unclear, or missing.
- [Verified] Block direct adoption when the repo is GPL, AGPL, or otherwise strong-copyleft and no explicit written review has cleared the proposed use.
- [Verified] Block direct adoption when the artifact under review is branded copy, a screenshot, a dataset, or another non-code asset.
- [Verified] Block direct adoption when the analysis cannot separate the competitor's exact expression from the underlying general idea.

## Allowed Outputs Before Approval

- [Verified] Repo summaries.
- [Verified] Architecture notes.
- [Verified] Capability comparisons.
- [Verified] Clean-room implementation recommendations written from first principles.
- [Verified] Reuse-decision records that clearly state reuse is blocked or pending.

## Forbidden Outputs Before Approval

- [Verified] Copying source files or code blocks into the Oleriq repo.
- [Verified] Copying prompts, tests, fixtures, selectors, or config with only superficial edits.
- [Verified] Copying marketing copy, docs text, screenshots, diagrams, or product microcopy.
- [Verified] Porting a competitor implementation while merely renaming symbols.

## Minimum Review Record

- [Verified] Every reuse screen must produce one tracked decision file under `docs/research/reuse-decisions/`.
- [Verified] The record must state the competitor, the exact artifact or idea under review, the current `reuse_gate`, the evidence used, and the next allowed action.
- [Verified] If the result is rejection, the record must name the safe fallback, such as `reference_only` or `clean-room rebuild`.

## Clean-Room Standard

- [Verified] The safer default is to describe desired behavior in plain language, cite the competitor only as research evidence, and implement the feature from scratch.
- [Verified] A clean-room implementation means Oleriq writes new code from its own requirements instead of transplanting competitor expression.
