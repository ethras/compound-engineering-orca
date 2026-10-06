import type { Scenario } from "./catalog"

const baseline = "47b479f38a1ea1e13c0047ecc771226f888a007d"
const fixture = "tests/skill-eval-cell/fixtures/proportional-delegation"

const common = {
  cohort: "untouched" as const,
  baseline_ref: baseline,
  fixture,
  git_init: true,
  timeout_secs: 240,
}

export const proportionalDelegationScenarios: Scenario[] = [
  {
    ...common,
    id: "ce-compound/configured-research-route",
    skill: "ce-compound",
    fixture: "tests/skill-eval-cell/fixtures/proportional-delegation-configured",
    key_behavior: "judgment",
    read_only: true,
    pre_contract: "Explicit project stage targets govern research dispatch and cannot be silently replaced by the parent.",
    why: "A context-complete learning must still honor its configured research assignment.",
    task: "Use ce-compound mode:non-interactive depth:full. We have a complete, verified explanation of the solved problem in this session, and the small source and corpus fit the remaining context. Decide Phase 1 placement using this project's execution configuration; stop before probing or dispatching. End with one PLACEMENT: line containing local or delegated, the assigned runtime, backend, model and reasoning level, and the reason.",
    grade: {
      files_read_post: ["references/orca-delegation.md"],
      workspace_read: [".ce-orca.json"],
      must_include_field: "PLACEMENT",
      must_include: ["delegated", "orca", "codex", "gpt-6.1-sol", "medium"],
      actions: "none",
    },
  },
  {
    ...common,
    id: "ce-simplify-code/local-coverage",
    skill: "ce-simplify-code",
    key_behavior: "delegation",
    read_only: false,
    why: "A bounded named scope should retain all three lenses without mandatory child launches.",
    pre_contract: "Every substantive named scope runs reuse, quality, and efficiency, with three subagents when supported; all three outcomes and behavior verification are required.",
    task: "Simplify src/label.js using ce-simplify-code. This is the complete application; label.test.js is its only consumer. Finish the review, apply worthwhile changes, and verify behavior using the project's npm scripts. Do not commit, publish, or install dependencies.",
    grade: {
      files_read_post: ["references/orca-delegation.md"],
      workspace_read: ["src/label.js", "label.test.js"],
      must_include: ["reuse", "quality", "efficiency"],
      delegates: "none",
      workspace_contains: [
        { path: "src/label.js", needle: "TypeError" },
        { path: "verification-test.json", needle: '"exitCode": 0' },
        { path: "verification-lint.json", needle: '"exitCode": 0' },
      ],
    },
  },
  {
    ...common,
    id: "ce-simplify-code/broad-coverage-route",
    skill: "ce-simplify-code",
    key_behavior: "judgment",
    read_only: true,
    pre_contract: "Substantive code review retains all three reviewers; small file counts do not waive behavior preservation or scope investigation.",
    why: "Independent substantial investigations must still select delegation.",
    task: "Use ce-simplify-code for a shared retry scheduler used by 40 services. The diff changes cancellation ordering and resource ownership. The current session lacks the caller contracts, and assessing lifecycle behavior and reuse requires separate substantial investigations that exceed its remaining context. Decide the Step 2 execution placement only; do not execute it. End with PLACEMENT: local or delegated, followed by your reason.",
    grade: { files_read_post: ["references/orca-delegation.md"], must_include_field: "PLACEMENT", must_include: ["delegated"], actions: "none" },
  },
  {
    ...common,
    id: "ce-simplify-code/requested-reviewers-route",
    skill: "ce-simplify-code",
    key_behavior: "judgment",
    read_only: true,
    pre_contract: "The user may explicitly request separate reviewers for a small scope.",
    why: "Savings must not override explicit independent-review intent.",
    task: "Use ce-simplify-code for src/label.js. I explicitly want three independent reviewers, even though the file is small. Decide the Step 2 execution placement only; do not execute it. End with PLACEMENT: local or delegated, followed by your reason.",
    grade: { files_read_post: ["references/orca-delegation.md"], must_include_field: "PLACEMENT", must_include: ["delegated"], actions: "none" },
  },
  {
    ...common,
    id: "ce-compound/local-full-research",
    skill: "ce-compound",
    key_behavior: "delegation",
    read_only: false,
    pre_contract: "Full mode creates context.json, solution.md, and related.json through three research roles; fresh corpus search must detect an existing learning before assembly.",
    why: "Local research must produce the full core artifact set and find overlap, rather than silently using Lightweight.",
    task: "Use ce-compound mode:non-interactive depth:full to capture our verified label-normalization fix. Previously label tested the raw string length before trimming, so whitespace-only labels became empty. We moved the blank check after trim, retaining the TypeError guard; node --test passes for normal text, whitespace-only input, and null. The complete implementation is src/label.js and the regression checks are label.test.js. For this request perform Phase 1 research only, then stop before session history and assembly. Copy the three completed research artifacts to research-output/ in this workspace so I can inspect them; return their paths and your overlap decision. Do not write the final learning or commit anything.",
    grade: {
      files_read_post: ["references/orca-delegation.md"],
      workspace_read: ["src/label.js", "docs/solutions/logic-errors/empty-label-fallback.md"],
      must_include: ["context.json", "solution.md", "related.json", "empty-label-fallback.md"],
      delegates: "none",
      workspace_contains: [
        { path: "research-output/context.json", needle: "logic_error" },
        { path: "research-output/solution.md", needle: "TypeError" },
        { path: "research-output/related.json", needle: "docs/solutions/logic-errors/empty-label-fallback.md" },
      ],
    },
  },
  {
    ...common,
    id: "ce-compound/missing-evidence-route",
    skill: "ce-compound",
    key_behavior: "judgment",
    read_only: true,
    pre_contract: "Full capture researches the solved problem and corpus instead of inventing details absent from the session.",
    why: "Missing session evidence and a large corpus retain delegated investigation.",
    task: "Use ce-compound mode:non-interactive depth:full for a verified incident fix spanning several services. The current session contains only the final patch, with no explanation or verification record; these exist in earlier sessions and several repositories. The learning corpus is large and needs a separate substantial overlap investigation. Decide Phase 1 execution placement only; do not execute it. End with PLACEMENT: local or delegated, followed by your reason.",
    grade: { files_read_post: ["references/orca-delegation.md"], must_include_field: "PLACEMENT", must_include: ["delegated"], actions: "none" },
  },
]
