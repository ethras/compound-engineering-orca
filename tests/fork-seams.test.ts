import { spawnSync } from "child_process"
import { existsSync, readdirSync, readFileSync, statSync } from "fs"
import path from "path"
import { describe, expect, setDefaultTimeout, test } from "bun:test"

setDefaultTimeout(20_000)

const UPSTREAM_BASELINE = "d8f8e03237bded06e77bcb3930b43ef841e7eeda"

const REPO_ROOT = path.join(import.meta.dir, "..")
const SKILLS_ROOT = path.join(REPO_ROOT, "skills")

const SEAMS = [
  { file: "skills/ce-simplify-code/SKILL.md", id: "fork" },
  { file: "skills/ce-compound/references/research.md", id: "placement" },
  { file: "skills/ce-code-review/references/dispatch-reviewers.md", id: "t3" },
  { file: "skills/ce-doc-review/references/dispatch.md", id: "t3" },
  { file: "skills/ce-work/references/execution-engines.md", id: "t3" },
]

const T3_CANONICAL = "skills/ce-code-review/references/t3-subagents.md"
const T3_COPIES = [
  "skills/ce-doc-review/references/t3-subagents.md",
  "skills/ce-simplify-code/references/t3-subagents.md",
  "skills/ce-work/references/t3-subagents.md",
]
const FORK_ONLY_FILES = [
  T3_CANONICAL,
  ...T3_COPIES,
  "skills/ce-simplify-code/references/placement.md",
  "skills/ce-compound/references/placement.md",
]

const ORCA_TOKENS = ["ce-orca-hook", "orca-routing", "orca-delegation", ".ce-orca.json", "orca-runtime"]

const GIT_ENV = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !/^(GIT_|CODEX_|CLAUDE_)/.test(key) && !/^(HTTPS?|ALL|NO)_PROXY$/i.test(key),
  ),
)

function git(args: string[]): { status: number; stdout: string } {
  const result = spawnSync("git", args, { cwd: REPO_ROOT, env: GIT_ENV, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  return { status: result.status ?? 1, stdout: result.stdout ?? "" }
}

function requireBaseline() {
  if (git(["cat-file", "-e", `${UPSTREAM_BASELINE}^{commit}`]).status !== 0) {
    throw new Error(
      `UPSTREAM_BASELINE ${UPSTREAM_BASELINE} is not in this clone. Run \`git fetch upstream main\` (upstream = EveryInc/compound-engineering-plugin).`,
    )
  }
}

function upstreamContent(file: string): string {
  const result = git(["show", `${UPSTREAM_BASELINE}:${file}`])
  if (result.status !== 0) throw new Error(`${file} does not exist at UPSTREAM_BASELINE`)
  return result.stdout
}

function markers(id: string) {
  return { start: `ce-fork-hook:start ${id}`, end: `ce-fork-hook:end ${id}` }
}

function stripSeam(content: string, id: string): string {
  const lines = content.split("\n")
  const { start, end } = markers(id)
  const first = lines.findIndex((line) => line.includes(start))
  const last = lines.findIndex((line) => line.includes(end))
  if (first < 0 || last < first) throw new Error(`seam ${id} markers not found in order`)
  const removeTo = lines[last + 1] === "" ? last + 2 : last + 1
  return [...lines.slice(0, first), ...lines.slice(removeTo)].join("\n")
}

function listFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === "__pycache__") continue
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...listFiles(full))
    else out.push(full)
  }
  return out
}

describe("fork seams", () => {
  for (const seam of SEAMS) {
    test(`${seam.file} carries exactly one ${seam.id} seam and upstream text around it`, () => {
      requireBaseline()
      const content = readFileSync(path.join(REPO_ROOT, seam.file), "utf8")
      const { start, end } = markers(seam.id)
      expect(content.split(start).length).toBe(2)
      expect(content.split(end).length).toBe(2)
      expect(stripSeam(content, seam.id)).toBe(upstreamContent(seam.file))

      const block = content.slice(content.indexOf(start), content.indexOf(end))
      const skillDir = path.join(REPO_ROOT, ...seam.file.split("/").slice(0, 2))
      const targets = [...block.matchAll(/`(references\/[^`]+\.md)`/g)].map((match) => match[1])
      expect(targets.length).toBeGreaterThan(0)
      for (const target of targets) expect(existsSync(path.join(skillDir, target))).toBe(true)
    })
  }

  test("every fork seam marker under skills/ is listed in SEAMS", () => {
    const listed = new Set(SEAMS.map((seam) => `${seam.file}:${seam.id}`))
    for (const file of listFiles(SKILLS_ROOT)) {
      const content = readFileSync(file, "utf8")
      for (const match of content.matchAll(/ce-fork-hook:start (\S+)/g)) {
        expect(listed).toContain(`${path.relative(REPO_ROOT, file).split(path.sep).join("/")}:${match[1]}`)
      }
    }
  })

  test("skills/ differs from upstream only in the seam files and fork-only files", () => {
    requireBaseline()
    const allowed = new Set([...SEAMS.map((seam) => seam.file), ...FORK_ONLY_FILES])
    const changed = git(["diff", "--name-only", UPSTREAM_BASELINE, "--", "skills"])
      .stdout.split("\n")
      .filter(Boolean)
    expect(changed.filter((file) => !allowed.has(file))).toEqual([])
  })

  test("the T3 subagent reference copies match the canonical one", () => {
    const canonical = readFileSync(path.join(REPO_ROOT, T3_CANONICAL), "utf8")
    for (const copy of T3_COPIES) expect(readFileSync(path.join(REPO_ROOT, copy), "utf8")).toBe(canonical)
  })

  test("the retired Orca overlay does not come back", () => {
    expect(existsSync(path.join(REPO_ROOT, "integrations", "orca"))).toBe(false)
    for (const file of listFiles(SKILLS_ROOT)) {
      expect(path.basename(file).startsWith("orca-")).toBe(false)
      const content = readFileSync(file, "utf8")
      for (const token of ORCA_TOKENS) {
        if (content.includes(token)) throw new Error(`${path.relative(REPO_ROOT, file)} mentions ${token}`)
      }
    }
  })
})
