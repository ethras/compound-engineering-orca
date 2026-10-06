// TypeScript boundary for the fork's JSON-driven JavaScript runtime.
// Request and result data are validated by the runtime schemas and adapters.
type OrcaData = Record<string, any>
type OrcaRolePolicy = Record<string, Record<string, { required: boolean; repeatable: boolean }>>
type OrcaReadNode = { id: string; stage: string; role: string; prompt: string; required: boolean; wave: number; inputs?: string[] }
type OrcaReadPacket = { schema: string; workflowId: string; nodes: OrcaReadNode[] }
type OrcaReadResult = OrcaData & { nodes: Array<OrcaData & { id: string; artifactRef: string }> }
type OrcaReadEngine = { agent(prompt: string, options: OrcaData): Promise<unknown>; phase(...args: any[]): void }
type OrcaBaseline = { schema: string; repository: string; version: string; commit: string; mergedCommit?: string; skillInventory: string[]; promptAssetSources: Record<string, string>; promptAssets: Record<string, string[]>; hookAnchors: Array<{ id: string; file: string; contains: string }> }

declare module "*/orca/resolve-config.mjs" {
  export class ExecutionResolutionError extends Error { code: string; details: OrcaData }
  export function canonicalJson(value: unknown, spacing?: number): string
  export function controllerExecutionPatch(value: unknown): OrcaData
  export function persistProfileAtomic(...args: any[]): Promise<OrcaData>
  export function resolveExecutionRequest(input: OrcaData): OrcaData
  export function selectProfile(...args: any[]): OrcaData
  export function selectProjectConfig(...args: any[]): OrcaData
}

declare module "*/orca/runtime-probe.mjs" {
  export const MAX_CONFIDENTIAL_PACKET_BYTES: number
  export function isOrcaTerminal(...args: any[]): boolean
  export function probeRuntime(...args: any[]): Promise<OrcaData>
  export function resumeOrcaRun(input: OrcaData): Promise<OrcaData>
  export function resolveRuntimeCommand(...args: any[]): string
  export function routeRuntime(requested: string, probe: OrcaData | null, controller?: OrcaData): OrcaData
  export function runResolvedRequest(input: OrcaData): Promise<OrcaData>
}

declare module "*/orca/role-registry.mjs" {
  export function firstWaveWorkflowIds(): string[]
  export function buildRoleRegistry(root?: string): Promise<OrcaData & { workflows: Record<string, OrcaData & { stages: Record<string, OrcaData & { roles: Record<string, OrcaData & { required: boolean }> }> }> }>
  export function workflowRoleRegistry(workflowId: string, root?: string): Promise<OrcaData>
}

declare module "*/orca/generate-skill-bundles.mjs" {
  export function generateSkillBundles(options?: { check?: boolean }): Promise<{ ok: boolean; check: boolean; generated: string[]; drift: string[] }>
}

declare module "*/orca/upstream-parity.mjs" {
  export function loadUpstreamBaseline(root?: string): Promise<OrcaBaseline>
  export function checkUpstreamParity(root?: string, baseline?: OrcaBaseline): Promise<OrcaData[]>
  export function checkUpstreamCommit(root: string, baseline: OrcaBaseline): Promise<OrcaData[]>
}

declare module "*/orca/version.mjs" {
  export function getVersionInfo(root?: string): Promise<OrcaData>
  export function formatForkVersion(version: string, revision: number, format?: string): string
}

declare module "*/orca/result-contract.mjs" {
  export function loadResultContract(input?: OrcaData): Promise<OrcaData>
  export function validateResultContract(contract: OrcaData, value: unknown): OrcaData
}

declare module "*/orca/workflows/work.mjs" {
  export const PACKET_SCHEMA: string
  export const RESULT_SCHEMA: string
  export function validatePacket(packet: unknown): string[]
  export function makeWorkPrompt(...args: any[]): string
  export function executeWorkBatch(packet: unknown, engine: OrcaData, runDir: string): Promise<OrcaData & { units: OrcaData[] }>
}

declare module "*/orca/workflows/lfg.mjs" {
  export const PACKET_SCHEMA: string
  export const RESULT_SCHEMA: string
  export const CHILD_PATCHES_SCHEMA: string
  export function validateLfgPacket(packet: unknown): string[]
  export function executeLfgGate(...args: any[]): Promise<OrcaData>
  export function deriveLfgChildExecutionPatches(...args: any[]): Record<string, OrcaData>
  export function writeLfgChildExecutionPatches(...args: any[]): Promise<OrcaData & { children: Record<string, { patchPath: string; workflowId: string }> }>
}

declare module "*/orca/workflows/doc-review.mjs" {
  export const PACKET_SCHEMA: string
  export const RESULT_SCHEMA: string
  export const REVIEWER_OUTPUT_SCHEMA: OrcaData
  export const WORKFLOW_ID: string
  export const REVIEWER_ROLES: string[]
  export const REVIEWER_REQUIREMENTS: Record<string, boolean>
  export function validatePacket<T>(packet: T): T
  export function makeReviewerPrompt(...args: any[]): string
  export function validateReviewerOutput(...args: any[]): OrcaData
  export function executeDocReview(...args: any[]): Promise<OrcaData & { reviewers: Array<OrcaData & { role: string; artifactRef: string }> }>
}

declare module "*/orca/workflows/plan.mjs" {
  export const PACKET_SCHEMA: string
  export const RESULT_SCHEMA: string
  export const WORKFLOW_ID: string
  export const ROLE_POLICY: OrcaRolePolicy
  export function validatePacket<T>(packet: T): T
  export function makeWorkerPrompt(node: OrcaReadNode): string
  export function executeReadWorkflow(input: { engine: OrcaReadEngine; packet: OrcaReadPacket; runDir: string }): Promise<OrcaReadResult>
}

declare module "*/orca/workflows/code-review.mjs" {
  export const PACKET_SCHEMA: string
  export const RESULT_SCHEMA: string
  export const WORKFLOW_ID: string
  export const ROLE_POLICY: OrcaRolePolicy
  export function validatePacket<T>(packet: T): T
  export function makeWorkerPrompt(node: OrcaReadNode): string
  export function executeReadWorkflow(input: { engine: OrcaReadEngine; packet: OrcaReadPacket; runDir: string }): Promise<OrcaReadResult>
}

declare module "*/orca/workflows/compound.mjs" {
  export const PACKET_SCHEMA: string
  export const RESULT_SCHEMA: string
  export const WORKFLOW_ID: string
  export const ROLE_POLICY: OrcaRolePolicy
  export function validatePacket<T>(packet: T): T
  export function makeWorkerPrompt(node: OrcaReadNode): string
  export function executeReadWorkflow(input: { engine: OrcaReadEngine; packet: OrcaReadPacket; runDir: string }): Promise<OrcaReadResult>
}

declare module "*/orca/workflows/debug.mjs" {
  export const PACKET_SCHEMA: string
  export const RESULT_SCHEMA: string
  export const WORKFLOW_ID: string
  export const ROLE_POLICY: OrcaRolePolicy
  export function validatePacket<T>(packet: T): T
  export function makeWorkerPrompt(node: OrcaReadNode): string
  export function executeReadWorkflow(input: { engine: OrcaReadEngine; packet: OrcaReadPacket; runDir: string }): Promise<OrcaReadResult>
}

declare module "*/orca/workflows/simplify-review.mjs" {
  export const MAX_CONFIDENTIAL_PACKET_BYTES: number
  export function buildReviewPacketFromDirectory(...args: any[]): Promise<OrcaReadPacket>
  export function writeReviewPacket(...args: any[]): Promise<OrcaData>
  export const PACKET_SCHEMA: string
  export const RESULT_SCHEMA: string
  export const WORKFLOW_ID: string
  export const ROLE_POLICY: OrcaRolePolicy
  export function validatePacket<T>(packet: T): T
  export function makeWorkerPrompt(node: OrcaReadNode): string
  export function executeReadWorkflow(input: { engine: OrcaReadEngine; packet: OrcaReadPacket; runDir: string }): Promise<OrcaReadResult>
}
