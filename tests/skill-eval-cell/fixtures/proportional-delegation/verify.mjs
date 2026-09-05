import { spawnSync } from "node:child_process"
import { writeFileSync } from "node:fs"

const mode = process.argv[2]
if (mode !== "test" && mode !== "lint") throw new Error("Expected test or lint")
const args = mode === "test" ? ["--test", "label.test.js"] : ["--check", "src/label.js"]
const result = spawnSync(process.execPath, args, { encoding: "utf8" })
writeFileSync(`verification-${mode}.json`, JSON.stringify({
  command: [process.execPath, ...args],
  exitCode: result.status,
  stdout: result.stdout,
  stderr: result.stderr,
}, null, 2) + "\n")
process.stdout.write(result.stdout || "")
process.stderr.write(result.stderr || "")
process.exit(result.status ?? 1)
