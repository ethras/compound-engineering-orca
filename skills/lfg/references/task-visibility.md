# Task visibility

Before step 1, use the platform's task-tracking capability when available to publish a short stage-level view of the remaining pipeline. Derive it from the user-meaningful outcomes of LFG's steps rather than mirroring all ten steps or exposing internal gates. Before invoking a child skill, replace or clear LFG's view so only the child skill's task surface is visible; after it returns, recreate or refresh LFG's remaining pipeline work before invoking the next child. Add conditional work only when its gate fires. If no task-tracking capability is available, continue normally without simulating a task list in chat.

<!-- ce-orca-hook:start lfg-controller -->
When the Orca integration is available, load `references/orca-lfg.md` now. Any resolved stage-routing carriers remain authoritative: the integration consumes stage intent and sanitized product input separately and never reinterprets the invoking conversation.
<!-- ce-orca-hook:end lfg-controller -->
