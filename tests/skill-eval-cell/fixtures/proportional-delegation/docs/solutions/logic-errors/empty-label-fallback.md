---
title: Blank labels need a fallback after normalization
date: 2026-09-05
problem_type: logic_error
component: label
tags: [normalization, blank-input]
---

# Blank labels need a fallback after normalization

The label function in `src/label.js` previously tested the original string's
length before trimming it. Whitespace-only input therefore produced an empty
display label. Trim the input first, then use `Untitled` for an empty result.
Keep the type guard: callers passing a non-string still receive a TypeError.

The regression checks in `label.test.js` cover normal text, whitespace-only
input, and invalid input. This is the canonical learning for this problem.
