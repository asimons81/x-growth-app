import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

const COMMAND_TIMEOUT_MS = 15000;
const PREFLIGHT_TIMEOUT_MS = 5000;

type ExecResult = { stdout: string; stderr: string };
export type ExecLike = (command: string, options: { cwd: string; timeout: number }) => Promise<ExecResult>;
type StatLike = (path: string) => Promise<{ isDirectory: () => boolean }>;

export interface PreflightDependencies {
  execFn: ExecLike;
  statFn: StatLike;
}

const defaultPreflightDependencies: PreflightDependencies = {
  execFn: execAsync,
  statFn: fs.stat,
};

export function isChildProcessExecutionSupported(): boolean {
  return (
    typeof process !== 'undefined' &&
    typeof process.cwd === 'function' &&
    Boolean(process.versions?.node)
  );
}

export function resolveOpenCliCwd(): string {
  const configured = process.env.OPENCLI_CWD?.trim();
  return configured && configured.length > 0 ? configured : process.cwd();
}

export async function validateWorkingDirectory(cwd: string, deps: PreflightDependencies = defaultPreflightDependencies): Promise<void> {
  let stats;

  try {
    stats = await deps.statFn(cwd);
  } catch {
    throw new Error(`Invalid OpenCLI working directory: "${cwd}" does not exist or is not accessible.`);
  }

  if (!stats.isDirectory()) {
    throw new Error(`Invalid OpenCLI working directory: "${cwd}" is not a directory.`);
  }
}

export async function ensureOpenCliAvailable(cwd: string, deps: PreflightDependencies = defaultPreflightDependencies): Promise<void> {
  try {
    await deps.execFn('opencli --version', {
      cwd,
      timeout: PREFLIGHT_TIMEOUT_MS,
    });
  } catch (err) {
    const details = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`OpenCLI is unavailable. Install opencli and ensure it is on PATH. Details: ${details}`);
  }
}

export async function runPreflightChecks(deps: PreflightDependencies = defaultPreflightDependencies): Promise<string> {
  const cwd = resolveOpenCliCwd();
  await validateWorkingDirectory(cwd, deps);
  await ensureOpenCliAvailable(cwd, deps);
  return cwd;
}

export async function runOpenCLICommand(args: string[], cwd: string, execFn: ExecLike = execAsync): Promise<string> {
  const cmd = ['opencli', ...args].join(' ');
  const { stdout, stderr } = await execFn(cmd, {
    cwd,
    timeout: COMMAND_TIMEOUT_MS,
  });

  if (stderr && !stdout) {
    throw new Error(stderr);
  }

  return stdout;
}
