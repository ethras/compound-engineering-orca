# Orca code-review dispatch

Use this path only for selected subagent stages assigned to Orca. The CE
controller remains the review orchestrator.

## Ownership

- Keep scope resolution, intent discovery, persona selection, roster
  materialization, the inline fast pass, cross-model peer shell-out,
  and collection in the CE dispatch context. The native merge leaf owns
  merge/dedup and validator selection; the native report leaf owns adjudication,
  authorized fixes, and reporting.
- Orca may own a selected Stage 4 persona/local-prompt node or the single
  Stage 5b `finding-validator` batch. It does not own `trivial-pr-judge` or the
  `adversarial-peer` process.
- Never launch the same node through both Orca and the native subagent path.
  Orca workers must not delegate again.

## Packet

Create one private `ce-orca.packet/v1` file per dispatch wave:

```json
{
  "schema": "ce-orca.packet/v1",
  "workflowId": "ce-code-review",
  "nodes": [
    {
      "id": "correctness",
      "stage": "persona-review",
      "role": "correctness-reviewer",
      "prompt": "<the complete native reviewer prompt and context bundle>",
      "required": true,
      "wave": 0
    }
  ]
}
```

The controller selects every node before packet creation. A role override never
adds a persona or makes a direct-verification finding use a validator. Use a
unique safe `id` for each node. The validator is one deterministic batch node,
not one node per finding. Same-wave persona nodes run concurrently; waves run
in ascending order.

Copy `required` from the installed registry. `correctness-reviewer` is required;
all other code-review workers are conditional and optional. An omitted role is
never sent as a hidden node.

For a structured persona, replace the native output-contract block with this
transport contract: return one JSON object with `artifact` (the complete native
reviewer artifact, including `why_it_matters` and `evidence`) and `compact_return`
(the exact native compact JSON). The controller writes the artifact locally;
the worker never writes to a controller path. Unstructured reviewers return
their prose verbatim, and the validator retains its native verdict contract.
Keep every other native prompt field, including the finding schema and evidence
requirements.

Do not add executable command fields, credentials, environment dumps, or
mutation instructions to the packet. The prompt may retain the native
read-only inspection guidance. Submit through `references/orca-routing.md`.

## Join

`orca-runtime.mjs run` or `resume` returns a `ce-orca.dispatch/v1` envelope.
Inspect `action` before reading `result`. If it is `orca-running`, preserve the
envelope and use the `resume --dispatch` path in `references/orca-routing.md`;
never call `run` again or rebuild the config or packet. Continue only when
`action` is `orca`, at which point the envelope is hydrated. Use `result.value`
as `ce-result.json`; for each completed node, use its exact
`artifactRef` as the key in `result.artifacts[artifactRef]`. Feed that hydrated
artifact's `output` into the native collection contract below. References such as
`runs/<run-id>/...` are opaque transport identifiers; never resolve or open
them relative to the target checkout or current working directory. The helper
retrieves only published artifacts through the protocol's allowlisted reader.
For structured personas, verify both payloads against the native contracts,
write `output.artifact` to `<run-dir>/<reviewer>.json`, and collect only
`output.compact_return` in `raw-returns.json`. Persist unstructured returns
verbatim as `<run-dir>/<reviewer>.md` and list them in `finish-input.json`.
A compact-only response is a failed reviewer, not a full artifact. Before a
finish leaf launches, every path required by `references/finish-input.md` must
exist locally; an Orca transport reference cannot substitute for it.
For a validator result, the dispatch context writes
`validator-verdicts.json` and `validator-outcome.json` from the hydrated output
or the classified failure before launching the report leaf; never translate a
failed worker into a rejected finding.
Report failed reviewers in Coverage. A required-worker failure marks the Orca
run failed but does not discard completed artifacts; consume those artifacts
before applying the native degraded-review rule.

Stop on an invalid envelope, unexpected workflow or role, missing selected
node, or malformed artifact.
