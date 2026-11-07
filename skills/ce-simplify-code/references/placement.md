# Simplification execution placement

This fork policy owns only whether Step 2 runs locally or delegates. Every review lens selected by Step 2, the mutation boundary, behavior preservation, verification, and the final report remain required.

Honor applicable user, caller, and project execution assignments before choosing placement. An assignment names a provider, model, or reasoning level for these reviewers, in the prompt, in the caller's invocation, or in the project's instructions. An assignment requires delegated review on that target. Do not silently replace an assigned model or requested independent review with the parent. Defaults that the host or the user's instructions give for subagents in general are not assignments; they apply only once review is delegated.

Otherwise, use a **local pass** when the resolved scope and its relevant dependencies can be inspected coherently within the remaining context. Use **delegated review** when separate contexts are needed to cover the scope or resolve distinct substantial uncertainties. File count alone does not decide this: a small change to a shared boundary can need deeper investigation. When coverage is uncertain, retain delegated review.

Announce the selected placement and its reason before review. For a local pass, read every selected `references/personas/` asset named in Step 2 and apply its rubric to the resolved scope. Produce a separate outcome for each selected lens, including an explicit no-finding outcome where appropriate. These are lenses in one context, not independent corroboration.

After all selected local outcomes exist, continue at Step 3 without entering the dispatch instructions. If local inspection reveals that coverage needs separate contexts, switch once to the existing complete reviewer dispatch before applying any changes. Do not seed independent reviewers with the local findings. Delegated review retains the complete selected roster, model selection, collection, and failure handling.

Include the placement and actual number of delegated reviewers in the final summary alongside the existing applied, skipped, and verification outcomes.

A local pass resumes at Step 3 after all selected outcomes exist. A delegated pass follows Step 2.
