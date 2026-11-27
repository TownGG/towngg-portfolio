import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseSignal, projectUrl, wakePrompt } from './ppt-dropbox-watcher.mjs';

const taskId = 'PPT-20261128-1234ABCDEF56';
const at = new Date().toISOString();
const signal = { schema: 1, event: 'ppt.task.created', taskId, at };

test('validates the task ID, event and filename without executing file content', () => {
  assert.deepEqual(parseSignal(taskId + '.json', JSON.stringify(signal)), { id: taskId, at });
  assert.throws(() => parseSignal('../' + taskId + '.json', JSON.stringify(signal)), /filename/);
  assert.throws(() => parseSignal(taskId + '.json', JSON.stringify({ ...signal, taskId: 'different' })), /content/);
  assert.throws(() => parseSignal(taskId + '.json', JSON.stringify({ ...signal, event: 'run: dangerous-command' })), /content/);
});

test('restricts browser target to the HTTPS ChatGPT origin', () => {
  assert.equal(projectUrl('https://chatgpt.com/g/example'), 'https://chatgpt.com/g/example');
  assert.throws(() => projectUrl('https://chatgpt.com.evil.test/'), /chatgpt.com/);
  assert.throws(() => projectUrl('http://chatgpt.com/g/example'), /HTTPS/);
});

test('the Harness prompt requires a new chat and exactly G once per task', () => {
  const prompt = wakePrompt({ id: taskId, url: 'https://chatgpt.com/g/example', receipt: 'TGG_WAKE_SENT_test' });
  assert.match(prompt, /新建一个独立会话/);
  assert.match(prompt, /只输入一个大写英文字母 G/);
  assert.match(prompt, /发送恰好一次/);
  assert.match(prompt, /不能复用此前任何任务的会话/);
  assert.match(prompt, /TGG_WAKE_SENT_test/);
  assert.match(prompt, /不要尝试绕过验证/);
});

test('Dropbox dry-run wakes each unfinished task and skips completed signals', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'town-ppt-bridge-test-'));
  const queueDir = path.join(root, 'queue');
  const doneDir = path.join(root, 'done');
  await fs.mkdir(queueDir);
  await fs.mkdir(doneDir);
  const completedId = 'PPT-20261128-ABCDEF123456';
  await fs.writeFile(path.join(queueDir, taskId + '.json'), JSON.stringify(signal));
  await fs.writeFile(path.join(queueDir, completedId + '.json'), JSON.stringify({ ...signal, taskId: completedId }));
  await fs.writeFile(path.join(doneDir, completedId + '.json'), JSON.stringify({ schema: 1, event: 'ppt.task.completed', taskId: completedId, at }));
  const script = fileURLToPath(new URL('./ppt-dropbox-watcher.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script, '--once'], {
    encoding: 'utf8', timeout: 10000,
    env: {
      ...process.env, PPT_BRIDGE_ROOT: root,
      PPT_CHATGPT_PROJECT_URL: 'https://chatgpt.com/g/example',
      PPT_BRIDGE_DRY_RUN: '1', PPT_BRIDGE_STATE_DIR: path.join(root, '.local-state')
    }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp('DRY RUN.*' + taskId));
  assert.doesNotMatch(result.stdout, new RegExp('DRY RUN.*' + completedId));
  await fs.rm(root, { recursive: true, force: true });
});

test('simulated Harness reports one G and writes a durable sent receipt', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'town-ppt-wake-live-test-'));
  const queueDir = path.join(root, 'queue');
  const stateDir = path.join(root, 'local-state');
  await fs.mkdir(queueDir);
  await fs.writeFile(path.join(queueDir, taskId + '.json'), JSON.stringify(signal));
  const windows = process.platform === 'win32';
  const fakeDsh = path.join(root, windows ? 'dsh-mock.ps1' : 'dsh-mock.mjs');
  if (windows) {
    // The production Windows launcher invokes PowerShell scripts, not POSIX executables.
    await fs.writeFile(fakeDsh, [
      'param([string]$profileName, [string]$mode, [string]$prompt)',
      '$value = $env:PPT_DSH_PROMPT',
      'if (-not $value.Contains("只输入一个大写英文字母 G")) { exit 7 }',
      'if ($value -match "TGG_WAKE_SENT_[0-9a-f]{32}") { Write-Output $Matches[0]; exit 0 }',
      'exit 8'
    ].join('\n'), 'utf8');
  } else {
    await fs.writeFile(fakeDsh, '#!/usr/bin/env node\nconst arg = process.argv.at(-1);\nif (!arg.includes("只输入一个大写英文字母 G")) process.exit(7);\nconsole.log(arg.match(/TGG_WAKE_SENT_[0-9a-f]{32}/)[0]);\n');
    await fs.chmod(fakeDsh, 0o755);
  }
  const script = fileURLToPath(new URL('./ppt-dropbox-watcher.mjs', import.meta.url));
  const common = {
    encoding: 'utf8', timeout: 10000,
    env: {
      ...process.env, PPT_BRIDGE_ROOT: root,
      PPT_CHATGPT_PROJECT_URL: 'https://chatgpt.com/g/example',
      PPT_BRIDGE_DRY_RUN: '0', PPT_BRIDGE_STATE_DIR: stateDir,
      PPT_DSH_BIN: fakeDsh
    }
  };
  const first = spawnSync(process.execPath, [script, '--once'], common);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /Wake sent:/);
  const state = JSON.parse(await fs.readFile(path.join(stateDir, 'journal.json'), 'utf8'));
  assert.equal(state[taskId].status, 'sent');
  const second = spawnSync(process.execPath, [script, '--once'], common);
  assert.equal(second.status, 0, second.stderr);
  assert.doesNotMatch(second.stdout, /Wake sent:/, 'Sent jobs must not be dispatched twice');
  await fs.rm(root, { recursive: true, force: true });
});
