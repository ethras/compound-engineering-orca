# Simplification execution placement

This fork policy owns only whether Step 2 runs locally or delegates. All three
review lenses, the mutation boundary, behavior preservation, verification, and
the final report remain required.

Honor applicable user, caller, and project execution assignments before choosing
placement. Check `.ce-orca.json` in the project when present; a selected profile
or caller execution patch is also an assignment. Resolve configured execution
through `references/orca-routing.md` and retain the existing dispatch path.
Do not silently replace an assigned model or requested independent review with
the parent. Invalid or unreadable configuration follows the routing error path.

Otherwise, use a **local pass** when the resolved scope and its relevant
dependencies can be inspected coherently within the remaining context. Use
**delegated review** when separate contexts are needed to cover the scope or
resolve distinct substantial uncertainties. File count alone does not decide
this: a small change to a shared boundary can need deeper investigation. When
coverage is uncertain, retain delegated review.

Announce the selected placement and its reason before review. For a local pass,
read all three `references/personas/` assets named in Step 2 and apply their
rubrics to the resolved scope. Produce a separate outcome for reuse, quality,
and efficiency, including an explicit no-finding outcome where appropriate.
These are three lenses in one context, not independent corroboration.

After all three local outcomes exist, continue at Step 3 without entering the
dispatch instructions or creating an Orca packet. If local inspection reveals
that coverage needs separate contexts, switch once to the existing complete
reviewer dispatch before applying any changes. Do not seed independent reviewers
with the local findings. Delegated review retains the existing three-role
roster, model selection, collection, and failure handling; this policy does not
permit partial Orca packets.

Include the placement and actual number of delegated reviewers in the final
summary alongside the existing applied, skipped, and verification outcomes.
