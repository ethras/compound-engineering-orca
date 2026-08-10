---
title: "Attest the Orca terminal before automatic runtime routing"
date: 2026-07-13
category: integration-issues
module: orca-execution-routing
problem_type: integration_issue
component: tooling
symptoms:
  - "Automatic routing could select Orca from the Codex App when Orca was merely available"
  - "Native hosts could be probed before the controller execution surface was identified"
  - "A healthy registered worktree could be mistaken for Orca controller ownership"
root_cause: logic_error
resolution_type: code_fix
severity: high
tags:
  - orca
  - auto-routing
  - terminal-attestation
  - runtime-detection
  - probe-order
related_components:
  - development_workflow
  - assistant
---

# Attest the Orca terminal before automatic runtime routing

## Problem

Automatic CE-Orca routing previously risked treating a reachable Orca runtime as proof that the current controller was running in Orca. That conflated runtime availability with controller-host identity: the Codex App could be the actual execution surface while Orca was merely open, endpoint hooks were visible, or the same worktree was registered.

The correct boundary is execution-surface attestation. An Orca terminal is recognized only when `TERM_PROGRAM`, normalized case-insensitively, is `orca` and `ORCA_TERMINAL_HANDLE` is non-empty after trimming (`integrations/orca/runtime-bundle.mjs:327-330`). The public integration contract explicitly says the Codex App remains native when Orca merely happens to be open (`integrations/orca/README.md:79-85`).

## Symptoms

- Work launched from the Codex App under `runtime: auto` could appear eligible for Orca because Orca-related context was discoverable.
- Endpoint health or worktree registration could be interpreted as execution ownership.
- Native sessions could incur an irrelevant Orca probe before their host identity was established.

Outside an attested Orca terminal, the corrected result is deterministic: `auto` resolves to native with `state: "not-checked"`, `fallback: true`, and `reason: "outside-orca-terminal"` (`integrations/orca/runtime-bundle.mjs:338-345`). A healthy registered worktree does not change ownership (`tests/orca-config-resolution.test.ts:112-136`).

## What Didn't Work

- **Checking whether the Orca app was open.** `ORCA_APP_VERSION` can be present while the actual terminal is Apple Terminal; that does not attest the controller host (`tests/orca-runtime-routing.test.ts:93-102`).
- **Checking whether endpoint hooks existed.** `ORCA_AGENT_HOOK_ENDPOINT` describes an available integration path, not the active execution surface (`tests/orca-runtime-routing.test.ts:97-102`).
- **Checking whether the worktree resolved.** A registered checkout establishes where Orca could run, not who owns the current controller (`tests/orca-runtime-routing.test.ts:76-85`; `tests/orca-config-resolution.test.ts:118-136`).
- **Probing before identifying the host.** Availability can determine whether an attested Orca terminal may dispatch safely; it cannot establish that the caller is such a terminal.

An earlier design selected Orca whenever its runtime appeared healthy, but that conclusion became invalid once the Codex App and Orca terminal were recognized as distinct controller surfaces. `(session history)`

## Solution

Fork PR [#7](https://github.com/ethras/compound-engineering-orca/pull/7) added a fail-closed host gate before automatic runtime probing.

`isOrcaTerminal` requires both a non-empty terminal handle and `TERM_PROGRAM=Orca`; either signal alone is rejected (`integrations/orca/runtime-bundle.mjs:327-330`; `tests/orca-runtime-routing.test.ts:93-102`). `routeRuntime` then separates request intent from endpoint health:

- `native` returns native immediately (`integrations/orca/runtime-bundle.mjs:333-337`).
- Outside an attested Orca terminal, `auto` returns native as `not-checked` with reason `outside-orca-terminal` (`integrations/orca/runtime-bundle.mjs:338-341`).
- Outside an attested Orca terminal, explicit `orca` fails with `orca_terminal_required` instead of silently downgrading (`integrations/orca/runtime-bundle.mjs:342-345`).
- Inside an attested Orca terminal, a healthy endpoint selects Orca; an absent endpoint may fall back only for `auto`; an absent explicit request and all unhealthy or incompatible states fail (`integrations/orca/runtime-bundle.mjs:347-355`).

The CLI establishes `controller.orcaTerminal` before deciding whether to call `probeRuntime`. Outside the terminal gate it passes only the negative controller attestation into resolution, so the probe is not executed (`integrations/orca/runtime-bundle.mjs:1590-1603`).

The no-probe property matters because probing is itself the wrong operation on an execution surface Orca does not own. The CLI regression installs a fake Orca executable that writes a marker if called, resolves from Apple Terminal, and proves the marker is never created (`tests/orca-config-resolution.test.ts:139-186`).

## Why This Works

Routing now uses two stages with non-interchangeable evidence:

1. Attest the controller host from its terminal execution surface.
2. Only if the host is Orca, probe whether the Orca runtime is healthy and compatible.

Endpoint availability, hook variables, and worktree registration can therefore refine capability only after host attestation; they cannot broaden Orca's authority. The unit tests encode the distinction directly: both terminal signals yield true, either signal alone yields false, and unrelated Orca hooks yield false (`tests/orca-runtime-routing.test.ts:93-102`).

The behavior fails closed in both directions. Automatic routing outside Orca remains native without touching Orca, while an explicit `orca` request outside Orca is rejected rather than reinterpreted. Inside Orca, a detected but unhealthy or incompatible endpoint is an error rather than a degraded native fallback (`tests/orca-runtime-routing.test.ts:72-90`). The routing matrix documents the same contract (`integrations/orca/README.md:96-103`).

## Prevention

- Keep controller-host identity and runtime capability as separate inputs. App state, hooks, socket reachability, repository registration, worktree resolution, and probe success may describe availability, but none may substitute for terminal attestation.
- Preserve unit coverage for both-positive, each-missing, and unrelated-hook attestation cases (`tests/orca-runtime-routing.test.ts:93-102`).
- Preserve routing coverage showing that a healthy registered worktree cannot override negative host attestation and explicit `orca` fails outside the gate (`tests/orca-runtime-routing.test.ts:72-90`).
- Preserve the process-level marker test so the contract remains “no probe,” not merely “ignore the probe result” (`tests/orca-config-resolution.test.ts:139-186`).
- Keep the public routing matrix synchronized with the code (`integrations/orca/README.md:79-103`).

## Related Issues

- [Native plugin install strategy for supported harnesses](native-plugin-install-strategy.md)
- [Codex native skills, legacy prompts, and converter entry points](../codex-skill-prompt-entrypoints.md)
- [Fork PR #7: harden review dispatch and host routing](https://github.com/ethras/compound-engineering-orca/pull/7)
