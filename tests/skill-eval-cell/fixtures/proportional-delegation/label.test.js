import { test } from "node:test"
import assert from "node:assert/strict"
import { label } from "./src/label.js"

test("label preserves nonempty content and handles blank input", () => {
  assert.equal(label("  hello  "), "hello")
  assert.equal(label(" \t "), "Untitled")
  assert.throws(() => label(null), TypeError)
})
