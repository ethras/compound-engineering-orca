# Orca simplification review

Use this path only when `reviewer-analysis` is assigned to Orca.

The CE controller selects the unchanged diff/file scope, creates prompts from
the persona assets selected by Step 2, merges suggestions, edits code, verifies
behavior, and summarizes. Orca owns only the selected read-only reviewer calls.
Do not launch native reviewers for an Orca-owned packet.

Create a private prompt directory outside the checkout. Write one raw prompt file per selected reviewer, carrying the full persona,
resolved scope, mode, proof tests, user constraints, and project standards.
The file mapping is `reuse.txt`, `quality.txt`, `efficiency.txt`, `tests.txt`,
and `comments.txt` for reuse, quality, efficiency, tests, and comments.
Do not hand-escape prompt bytes inside JSON. Build and validate the selected packet:

```bash
SKILL_DIR="<absolute path of the ce-simplify-code skill directory>";
node "$SKILL_DIR/scripts/orca-workflow.mjs" build-packet \
  --prompts-dir <private-prompt-directory> \
  --out <private-packet.json>
```

The builder accepts only stable regular prompt files, enforces the endpoint's
8 MiB aggregate confidential-packet limit, writes the packet through a private
atomic temporary file, and consumes the raw prompt files on both success
and failure. Never retain those confidential staging files after the packet has
been built. If an infrastructure failure requires a full-roster rerun, create a
new private prompt directory and reconstruct all selected prompts from the
unchanged resolved scope and the selected canonical reviewer personas before
building a fresh packet.

Include exactly one node for every reviewer selected by Step 2. Each selected
node is required and shares wave 0. A focused standalone tests/comments request
uses only that reviewer; other passes include the three core reviewers and any
conditional tests/comments reviewers. A target override does not select roles. Do not add executable command fields,
credentials, environment dumps, or mutation instructions; the prompt may keep
the native read-only inspection guidance. Submit through
`references/orca-routing.md`.

`orca-runtime.mjs run` or `resume` returns a `ce-orca.dispatch/v1` envelope.
Inspect `action` before reading `result`. If it is `orca-running`, preserve the
envelope and use the `resume --dispatch` path in `references/orca-routing.md`;
never call `run` again or rebuild the config or packet. Continue only when
`action` is `orca`, at which point the envelope is hydrated. Use `result.value`
as `ce-result.json`; for each completed node, retrieve its
hydrated artifact with `result.artifacts[artifactRef]` and feed `output` into
the native Step 3 merge. References such as `runs/<run-id>/...` are opaque
transport identifiers; never resolve or open them relative to the target
checkout or current working directory. The helper retrieves only published
artifacts through the protocol's allowlisted reader. If any reviewer fails,
the Orca run fails; keep completed artifacts and report the missing lens. Do
not retry a subset of the original selection: either stop with the incomplete
pass or rebuild a fresh packet containing every originally selected reviewer. Never combine artifacts from separate runs and claim a
complete pass. The CE controller alone applies and verifies changes.
