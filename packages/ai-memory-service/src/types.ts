export interface RepoMemoryManifest {
  enabled: boolean;
  wing: string;
  project: string;
  minePaths: string[];
}

export type MemoryRootSource =
  | "env:AI_MEMORY_ROOT"
  | "env:AI_MEMORY_MDATA_ROOT"
  | "macos-home"
  | "xdg-home"
  | "local-share";

export interface GuardrailSettings {
  appleSilicon: boolean;
  ortDisableCoreMl?: string;
  chromaHnswNumThreads?: string;
  defaultedChromaThreads: boolean;
}

export interface RuntimePaths {
  codexConfigPath: string;
  codexHome: string;
  codexLocalPluginRoot: string;
  codexRepoPluginLinkName: string;
  codexSessionHashStorePath: string;
  codexStagingRoot: string;
  guardrails: GuardrailSettings;
  homeDir: string;
  identityPath: string;
  manualStagingRoot: string;
  mempalaceConfigPath: string;
  mempalaceHome: string;
  mempalaceWingConfigPath: string;
  memoryRoot: string;
  memoryRootSource: MemoryRootSource;
  openclawHome: string;
  openclawSkillsRoot: string;
  palacePath: string;
  pythonCommand: string;
  repoManifestName: string;
  stateRoot: string;
  transcriptAutoMineEnabled: boolean;
  transcriptAutoMineReason?: string;
  usesSharedMount: boolean;
}

export interface MemoryCommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
  signal: NodeJS.Signals | null;
  error?: string;
}

export interface PersistTranscriptResult {
  changed: boolean;
  message: string;
  stageFilePath?: string;
}

export interface DoctorReport {
  memoryRoot: string;
  memoryRootSource: MemoryRootSource;
  palacePath: string;
  mempalaceHome: string;
  pythonCommand: string;
  mempalaceImportable: boolean;
  palaceExists: boolean;
  usesSharedMount: boolean;
  transcriptAutoMineEnabled: boolean;
  transcriptAutoMineReason?: string;
  guardrails: GuardrailSettings;
}
