import assert from 'node:assert/strict';
import test from 'node:test';
import { runOpenCLICommand, runPreflightChecks } from './opencli.ts';

const originalOpenCliCwd = process.env.OPENCLI_CWD;

test.afterEach(() => {
  if (originalOpenCliCwd === undefined) {
    delete process.env.OPENCLI_CWD;
    return;
  }

  process.env.OPENCLI_CWD = originalOpenCliCwd;
});

test('supports successful command execution', async () => {
  const execCalls: Array<{ command: string; cwd: string; timeout: number }> = [];
  const execFn = async (command: string, options: { cwd: string; timeout: number }) => {
    execCalls.push({ command, cwd: options.cwd, timeout: options.timeout });
    return {
      stdout: '[{"screen_name":"tonysimons_"}]',
      stderr: '',
    };
  };

  const output = await runOpenCLICommand(
    ['twitter', 'profile', 'tonysimons_', '--format', 'json'],
    process.cwd(),
    execFn,
  );

  assert.match(output, /tonysimons_/);
  assert.equal(execCalls.length, 1);
  assert.equal(execCalls[0]?.command, 'opencli twitter profile tonysimons_ --format json');
  assert.equal(execCalls[0]?.cwd, process.cwd());
});

test('fails preflight when opencli binary is missing', async () => {
  process.env.OPENCLI_CWD = process.cwd();

  await assert.rejects(
    () => runPreflightChecks({
      statFn: async () => ({ isDirectory: () => true }),
      execFn: async () => {
        throw new Error('spawn opencli ENOENT');
      },
    }),
    /OpenCLI is unavailable/,
  );
});

test('fails preflight when working directory is invalid', async () => {
  process.env.OPENCLI_CWD = '/definitely/not/real';

  await assert.rejects(
    () => runPreflightChecks({
      statFn: async () => {
        throw new Error('ENOENT');
      },
      execFn: async () => ({ stdout: '', stderr: '' }),
    }),
    /Invalid OpenCLI working directory/,
  );
});
