#!/usr/bin/env node

import { promises as fs } from "node:fs"
import { constants as fsConstants } from "node:fs"
import { randomBytes } from "node:crypto"
import path from "node:path"
import { pathToFileURL } from "node:url"

export const PACKET_SCHEMA = "ce-orca.packet/v1"
export const RESULT_SCHEMA = "ce-orca.read-result/v1"
export const WORKFLOW_ID = "ce-simplify-code"
export const MAX_CONFIDENTIAL_PACKET_BYTES = 8 * 1024 * 1024

export const ROLE_POLICY = Object.freeze({
  "reviewer-analysis": Object.freeze({
    "code-reuse-reviewer": Object.freeze({ required: true, repeatable: false }),
    "code-quality-reviewer": Object.freeze({ required: true, repeatable: false }),
    "efficiency-reviewer": Object.freeze({ required: true, repeatable: false }),
  }),
})

const REQUIRED_ROLES = Object.freeze(Object.keys(ROLE_POLICY["reviewer-analysis"]).sort())
const REVIEW_PROMPTS = Object.freeze([
  Object.freeze({ id: "reuse", role: "code-reuse-reviewer", file: "reuse.txt" }),
  Object.freeze({ id: "quality", role: "code-quality-reviewer", file: "quality.txt" }),
  Object.freeze({ id: "efficiency", role: "efficiency-reviewer", file: "efficiency.txt" }),
])

const PACKET_KEYS = new Set(["schema", "workflowId", "nodes"])
const NODE_KEYS = new Set(["id", "stage", "role", "prompt", "required", "wave"])
const SAFE_ID = /^[a-z0-9][a-z0-9._-]{0,79}$/
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
const ownKeysAre = (value, allowed) => Object.keys(value).every((key) => allowed.has(key))
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0

function validateNode(node, index, seenIds, seenRoles) {
  if (!isRecord(node) || !ownKeysAre(node, NODE_KEYS)) throw new Error(`nodes[${index}] must be a data-only CE simplification node`)
  if (!SAFE_ID.test(node.id ?? "")) throw new Error(`nodes[${index}].id must be a safe unique identifier`)
  if (seenIds.has(node.id)) throw new Error(`duplicate node id: ${node.id}`)
  if (!hasOwn(ROLE_POLICY, node.stage)) throw new Error(`nodes[${index}].stage is not an installed ${WORKFLOW_ID} stage`)
  const stage = ROLE_POLICY[node.stage]
  if (!hasOwn(stage, node.role)) throw new Error(`nodes[${index}].role is not installed in stage ${node.stage}`)
  const policy = stage[node.role]
  if (!nonEmpty(node.prompt)) throw new Error(`nodes[${index}].prompt must be non-empty`)
  if (node.required !== policy.required) throw new Error(`nodes[${index}].required does not match the installed role policy`)
  if (!Number.isInteger(node.wave) || node.wave < 0) throw new Error(`nodes[${index}].wave must be a non-negative integer`)
  const roleKey = `${node.stage}:${node.role}`
  if (!policy.repeatable && seenRoles.has(roleKey)) throw new Error(`duplicate non-repeatable role: ${roleKey}`)
  seenIds.add(node.id)
  seenRoles.add(roleKey)
}

export function validatePacket(packet) {
  if (!isRecord(packet) || !ownKeysAre(packet, PACKET_KEYS)) throw new Error("packet must contain only schema, workflowId, and nodes")
  if (packet.schema !== PACKET_SCHEMA) throw new Error(`unsupported packet schema: ${packet.schema ?? "missing"}`)
  if (packet.workflowId !== WORKFLOW_ID) throw new Error(`packet workflowId must be ${WORKFLOW_ID}`)
  if (!Array.isArray(packet.nodes) || packet.nodes.length === 0) throw new Error("packet nodes must be a non-empty array")
  const seenIds = new Set()
  const seenRoles = new Set()
  packet.nodes.forEach((node, index) => validateNode(node, index, seenIds, seenRoles))
  const suppliedRoles = packet.nodes.map(({ role }) => role).sort()
  if (JSON.stringify(suppliedRoles) !== JSON.stringify(REQUIRED_ROLES)) {
    throw new Error("reviewer-analysis requires exactly the three installed simplification roles")
  }
  return packet
}

export async function buildReviewPacketFromDirectory(promptsDirectory) {
  if (!nonEmpty(promptsDirectory)) throw new Error("prompts directory must be non-empty")
  const nodes = []
  let bytes = 0
  for (const { id, role, file } of REVIEW_PROMPTS) {
    const promptBytes = await readStableRegularBytes(
      path.join(promptsDirectory, file),
      MAX_CONFIDENTIAL_PACKET_BYTES - bytes,
      file,
    )
    bytes += promptBytes.length
    const prompt = new TextDecoder("utf-8", { fatal: true }).decode(promptBytes)
    if (!nonEmpty(prompt)) throw new Error(`${file} must contain a non-empty reviewer prompt`)
    nodes.push({
      id,
      stage: "reviewer-analysis",
      role,
      prompt,
      required: true,
      wave: 0,
    })
  }
  const packet = validatePacket({ schema: PACKET_SCHEMA, workflowId: WORKFLOW_ID, nodes })
  if (Buffer.byteLength(serializedPacket(packet), "utf8") > MAX_CONFIDENTIAL_PACKET_BYTES) {
    throw new Error(`serialized packet exceeds ${MAX_CONFIDENTIAL_PACKET_BYTES} bytes`)
  }
  return packet
}

export async function writeReviewPacket({ promptsDirectory, outputPath }) {
  if (!nonEmpty(outputPath)) throw new Error("output path must be non-empty")
  try {
    const packet = await buildReviewPacketFromDirectory(promptsDirectory)
    await writeJsonAtomic(path.resolve(outputPath), packet)
    return packet
  } finally {
    await consumePromptSources(promptsDirectory)
  }
}

export function makeWorkerPrompt(node) {
  return [
    "<ce-orca-owner-boundary>",
    `You own exactly one already-selected CE simplification review: ${node.role}.`,
    "Do not invoke Agent, Task, spawn_agent, a Skill, or any other delegation primitive.",
    "Do not create, edit, or delete project files; return suggestions only.",
    "Return the complete result requested by the supplied CE prompt.",
    "</ce-orca-owner-boundary>",
    "",
    node.prompt.trim(),
  ].join("\n")
}

async function readStableRegularBytes(file, maximumBytes, label) {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) throw new Error(`${label} exceeds ${MAX_CONFIDENTIAL_PACKET_BYTES} aggregate bytes`)
  const handle = await fs.open(file, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK)
  try {
    const before = await handle.stat()
    if (!before.isFile() || before.nlink !== 1) throw new Error(`${label} must be a regular file without hard links`)
    if (before.size > maximumBytes) throw new Error(`${label} exceeds ${MAX_CONFIDENTIAL_PACKET_BYTES} aggregate bytes`)
    const buffer = Buffer.allocUnsafe(maximumBytes + 1)
    let offset = 0
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset)
      if (bytesRead === 0) break
      offset += bytesRead
    }
    const after = await handle.stat()
    if (
      offset > maximumBytes || offset !== before.size ||
      before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs
    ) throw new Error(`${label} changed while being read`)
    return buffer.subarray(0, offset)
  } finally {
    await handle.close()
  }
}

async function consumePromptSources(promptsDirectory) {
  if (!nonEmpty(promptsDirectory)) return
  await Promise.all(REVIEW_PROMPTS.map(({ file }) => fs.rm(path.join(promptsDirectory, file), { force: true })))
  await fs.rmdir(promptsDirectory).catch((error) => {
    if (error?.code !== "ENOENT" && error?.code !== "ENOTEMPTY") throw error
  })
}

async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`)
  try {
    const handle = await fs.open(temporary, "wx", 0o600)
    try {
      await handle.writeFile(serializedPacket(value), "utf8")
      await handle.sync()
    } finally {
      await handle.close()
    }
    await fs.chmod(temporary, 0o600)
    await fs.rename(temporary, file)
    await fs.chmod(file, 0o600)
  } catch (error) {
    await fs.rm(temporary, { force: true })
    throw error
  }
}

const serializedPacket = (value) => `${JSON.stringify(value, null, 2)}\n`

function packetBuilderOptions(args) {
  const options = {}
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index]
    const value = args[index + 1]
    if (!["--prompts-dir", "--out"].includes(key) || !value || value.startsWith("--")) {
      throw new Error("usage: orca-workflow.mjs build-packet --prompts-dir <private-dir> --out <packet.json>")
    }
    options[key] = value
    index += 1
  }
  if (!options["--prompts-dir"] || !options["--out"]) {
    throw new Error("usage: orca-workflow.mjs build-packet --prompts-dir <private-dir> --out <packet.json>")
  }
  return options
}

async function buildPacketCli(args) {
  const options = packetBuilderOptions(args)
  await writeReviewPacket({
    promptsDirectory: path.resolve(options["--prompts-dir"]),
    outputPath: path.resolve(options["--out"]),
  })
}

async function runWorker(engine, node) {
  try {
    return await engine.agent(makeWorkerPrompt(node), {
      label: node.id, stage: node.stage, role: node.role, required: node.required,
    })
  } catch {
    return null
  }
}

const completed = (output) => output !== null && output !== undefined && (typeof output !== "string" || output.trim().length > 0)
const statusFor = (failures) => failures.some(({ required }) => required) ? "failed" : failures.length > 0 ? "degraded" : "completed"

function waveGroups(nodes) {
  const groups = new Map()
  for (const node of nodes) {
    if (!groups.has(node.wave)) groups.set(node.wave, [])
    groups.get(node.wave).push(node)
  }
  return [...groups.entries()].sort(([left], [right]) => left - right)
}

export async function executeReadWorkflow({ engine, packet, runDir }) {
  validatePacket(packet)
  if (!nonEmpty(runDir)) throw new Error("ORCH_RUN_DIR is required")
  const records = new Map()
  for (const [wave, nodes] of waveGroups(packet.nodes)) {
    engine.phase(`simplification review wave ${wave}`)
    const outputs = await engine.parallel(nodes.map((node) => () => runWorker(engine, node)))
    nodes.forEach((node, index) => records.set(node.id, outputs[index] ?? null))
  }

  const results = []
  const failures = []
  for (const node of packet.nodes) {
    const output = records.get(node.id)
    const ok = completed(output)
    const artifactRef = path.posix.join("nodes", `${node.id}.json`)
    await writeJsonAtomic(path.join(runDir, artifactRef), {
      schema: "ce-orca.node-artifact/v1", workflowId: WORKFLOW_ID, id: node.id,
      stage: node.stage, role: node.role, required: node.required,
      status: ok ? "completed" : "failed", output: ok ? output : null,
      error: ok ? null : { code: "worker_failed" },
    })
    results.push({ id: node.id, stage: node.stage, role: node.role, required: node.required, status: ok ? "completed" : "failed", artifactRef })
    if (!ok) failures.push({ id: node.id, stage: node.stage, role: node.role, required: node.required, code: "worker_failed" })
  }
  const result = {
    schema: RESULT_SCHEMA, workflowId: WORKFLOW_ID, status: statusFor(failures),
    ownership: { selection: "ce-controller", dispatch: "orca", synthesis: "ce-controller" },
    nodes: results, failures,
  }
  await writeJsonAtomic(path.join(runDir, "ce-result.json"), result)
  return result
}

export async function main() {
  const engineUrl = process.env.ORCH_ENGINE_URL
  const runDir = process.env.ORCH_RUN_DIR
  if (!engineUrl) throw new Error("ORCH_ENGINE_URL is required")
  if (!runDir) throw new Error("ORCH_RUN_DIR is required")
  const engine = await import(engineUrl)
  const packet = validatePacket(engine.consumeConfidentialPacketJson())
  await engine.run(WORKFLOW_ID, () => executeReadWorkflow({ engine, packet, runDir }))
}

const invokedAsScript = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (invokedAsScript) {
  if (process.argv[2] === "build-packet") await buildPacketCli(process.argv.slice(3))
  else await main()
}
