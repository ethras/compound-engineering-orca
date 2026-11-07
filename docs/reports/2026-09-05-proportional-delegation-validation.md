# Proportional delegation validation

Date: 2026-09-05. Baseline: `47b479f38a1ea1e13c0047ecc771226f888a007d`.

The Orca overlay now allows bounded simplification and Full compounding research
to run in the parent context. Required coverage remains unchanged: three
simplification rubrics, or three research artifacts plus live overlap search.
Explicit execution assignments and work requiring separate substantial
investigations retain the existing delegated path. Full compounding's later
independent validation remains required.

## Scope and provenance

The change consists of two fork-owned placement policies and one added line at
each existing dispatch hook. Generated policy copies ship with the skills.
Parity checks compare the affected skill bodies with pinned upstream content
outside the hook blocks. The three-role packet contracts are unchanged.

The simplification roster was deliberately restored upstream in `fce88ae2`
(#1313). This change preserves its three rubrics and the complete delegated
fallback. The investigation did not establish that three separate contexts are
necessary for every bounded scope; it also did not establish that local review
is equivalent to independent corroboration. The policy explicitly distinguishes
those claims.

## Behavioral evidence

Fresh CLI cells loaded current on-disk skills into isolated fixture repositories.
The hosts were Codex with `gpt-5.6-sol` and medium reasoning, and Claude with the
`sonnet` alias and medium effort. No exact Sonnet version is asserted.

| Scenario | Observed post-change behavior on both hosts |
| --- | --- |
| Bounded simplification | Local review; all three lenses reported; no delegates reported; behavior tests and syntax checks passed |
| Broad simplification with missing caller contracts | Selected delegated review |
| Explicit request for three independent reviewers | Selected delegated review |
| Full research with complete evidence and a small corpus | Local research; three artifacts produced; existing learning identified as high overlap |
| Research requiring substantial evidence reconstruction | Selected delegated research |
| Project-assigned research model | Preserved delegated Orca / Codex / `gpt-5.6-sol` / medium placement |

The four placement-only scenarios stop before dispatch. They demonstrate routing
decisions, not a successful external Orca run. The two execution scenarios stop
at their requested scope; the compounding cell deliberately stops after Phase 1.

Before the change, the simplification cells reported three reviewers on both
hosts. The post-change cells reported zero and retained the three rubric
outcomes. Codex removed a redundant `else`; Sonnet's local pass used a ternary.
The type guard and the normal-text, whitespace-only, and null regression cases
remained intact. The strengthened fixture records actual Node subprocess exit
results for the test and syntax-check scripts instead of grading a claim that
verification ran.

The Sonnet pre-change compounding cell reported three research workers and
produced the research set. The Codex baseline timed out at 240 seconds, including
one native retry; it supplies no valid completed comparison. An initial run
inherited Orca terminal context inappropriate for its throwaway workspace.
Subsequent wrappers removed those terminal markers to evaluate native placement.

Research artifact inspection matters beyond the automatic grade: both Sonnet
local drafts misstated the old whitespace behavior as returning unchanged
whitespace rather than an empty string. The first omitted several frontmatter
fields; the second restored most but still omitted `category` and incorrectly
attributed `root_cause` to the corpus. The delegated Sonnet baseline also omitted
`category` from its frontmatter skeleton, but described the old behavior
correctly. Codex's strengthened local draft described the behavior correctly,
but put `category` outside the frontmatter object. All twelve post-change
scenario/host combinations passed their automated checks; the manual artifact
review did not pass every role-contract requirement. This is limited, mixed
evidence for draft quality, not proof of equal quality. The
existing assembly/frontmatter and independent grounding gates remain necessary;
Phase 1 artifacts are drafts, not publishable final learnings.

Automatic checks cover required pointers, outputs, selected targets, and fixture
verification receipts. They do not prove semantic completeness. Delegation
counts come from host reports; they are not an independent billing audit. No
dollar or percentage saving is claimed. Simplification profile/caller target
assignments were inspected in the policy but not exercised in separate cells.

## Mechanical checks and review

- `bun run release:validate`: passed.
- `bun run plugin:validate`: passed.
- `bun run orca:check-bundles`: passed, no drift.
- Targeted catalog, native parity, and packaging tests: 30 passed, 0 failed.
- `git diff --check`: passed.
- Full `bun run test`: 3,855 passed and 3 failed. Two catalog failures were fixed
  and passed on the targeted rerun. The remaining failure is the pre-existing
  upstream ancestry check: pinned commit
  `3ad9b51bceecf0158e590c882034d0398dbb9c5c` is not an ancestor of the baseline
  checkout or `origin/main`. `orca:upstream-check` reports
  `upstream_commit_not_ancestor`. No unrelated Git history repair was attempted.

A fresh Sol reader inspected the policies, call sites, generator, and test
coverage. No demonstrated implementation defect was found. Its three evidence
gaps led to stronger fixture checks: actual verification receipts, copied
research outputs, and the configured target on the placement line. This was a
focused independent review, not the full shipping review workflow.

Raw local evidence is under
`/var/folders/wf/n7wtjhnj79d9ns2hb37lk10w0000gn/T/ce-proportional-eval-P0QxA1/`.
It is temporary; this report and the named scenarios preserve the durable
findings and reproduction inputs.
