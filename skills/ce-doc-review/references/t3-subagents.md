# Subagents in T3 Code

Read this when T3 Code's `delegate_task` tool is available, whether it is listed directly or only as a deferred tool. It decides which provider and model each subagent this skill dispatches runs on, how a batch is launched and collected, and how implementation children are integrated. The rest of the dispatching reference still applies.

## Target for each subagent

A provider, model, or reasoning level named for a subagent role in the prompt, by the caller, or in the project's instructions is that role's target. Fields the request leaves out take that model's own defaults as `orchestrator_capabilities` reports them, not the values below.

When nothing names a target:

- Review personas (code review, document review, simplification reviewers, adversarial reviewer) run on Codex `gpt-6.1-sol` with reasoning `xhigh`.
- Implementation units run on Codex `gpt-6.1-sol` with reasoning `medium`.
- Every other subagent runs on the parent's own model through the native subagent tool.

A role covers only the subagents the skill dispatches for that role. "Reviewers" means the persona reviewers, not the merge, validation, or report steps around them.

Use the native subagent tool when the target is the parent's own provider and model with no setting the parent does not already have. Use `delegate_task` for every other target. Set the reasoning level with the option name the provider exposes in `orchestrator_capabilities` (for example `reasoningEffort` on Codex, `effort` on Claude). Without it, `gpt-6.1-sol` runs at T3's default, `low`.

Do not set `runtimeMode`. A child inherits the parent's mode, and T3's narrower modes pause for human approval rather than restricting tools, so a reviewer would stall instead of being read-only.

When a provider or model the request named is unavailable in `orchestrator_capabilities`, or `delegate_task` rejects it, say so and stop that step without substituting another model. When a default target is unavailable, run that step on the parent's model through the native subagent tool and say so.

## Launch and collection

A child starts with only its task text. Give it the complete prompt the native path would send, including every file path it must read.

Independent subagents of one batch run concurrently and are collected in the launching turn, as the dispatching reference requires. Either issue their `delegate_task` calls with `mode: "wait"` together in one tool batch when the host runs those calls concurrently, or launch them with `mode: "async"` and collect each with the host's blocking wait on that child thread (`t3_thread_wait`). Ending the turn to wait for children is not collection, and waits issued one after another are not concurrency.

Reviewers and other read-only subagents use `isolation: "shared"`, so uncommitted changes under review are visible to them.

## Implementation units

In T3, an implementation unit whose target T3 can run is dispatched through `delegate_task` with `isolation: "worktree"` and integrated by this native run, not by the cross-model engine. This applies equally to a live request for another provider and to a standing cross-model preference in configuration. A run already started on the cross-model engine continues under that engine.

A worktree child starts from the parent's commit and does not receive uncommitted edits, so dispatch from a committed baseline. Before integrating a child, confirm that its checkout started from the expected base commit and that its changes touch only the unit's predicted files. A change outside that set is not integrated without the user. Integrate one unit at a time, with that unit's verification run on the integrated tree, then remove the child's checkout with `git worktree remove <child path>`.
