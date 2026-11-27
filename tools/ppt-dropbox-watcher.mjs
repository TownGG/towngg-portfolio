#!/usr/bin/env node
// TownGG PPT wake bridge: Dropbox desktop sync -> DeepSeek Harness -> ego-browser -> ChatGPT "G".
// Does not read Gmail, carry callback credentials, or generate PPT content.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const PPT_ID_RE = /^PPT-\d{8}-[A-F0-9]{12}$/;
const NOW = () => Date.now();

export function parseSignal(filename, raw, expectedEvent = 'ppt.task.created') {
  const id = filename.replace(/\.json$/, '');
  if (!PPT_ID_RE.test(id) || filename !== id + '.json') throw new Error('Invalid signal filename');
  const signal = JSON.parse(raw);
  if (signal?.schema !== 1 || signal?.event !== expectedEvent || signal?.taskId !== id) throw new Error('Invalid signal content');
  if (typeof signal.at !== 'string' || !Number.isFinite(Date.parse(signal.at))) throw new Error('Invalid event time');
  return { id, at: signal.at };
}

export function projectUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'chatgpt.com' || url.username || url.password) throw new Error('PPT_CHATGPT_PROJECT_URL must be an HTTPS chatgpt.com project URL');
  return url.href;
}

export function wakePrompt({ id, url, receipt }) {
  if (!PPT_ID_RE.test(id)) throw new Error('Invalid task ID');
  const safeUrl = projectUrl(url);
  return [
    '你是 TownGG PPT 的专用唤醒代理，只允许使用已安装的 ego-browser Skill 操作 ChatGPT。',
    '这是一次独立 PPT 任务的唤醒，必须严格执行以下规则：',
    '1. 用 ego-browser 打开以下 ChatGPT 项目链接：' + safeUrl,
    '2. 必须在上述「UI设计」项目页面中找到输入框「在“UI设计”中新建聊天」（role=textbox），直接通过这个项目内输入框创建独立会话。严禁点击左侧边栏的「新聊天」：它会打开全局聊天，不属于项目。若项目内输入框不存在，立即失败，不得退而使用全局聊天或复用已有会话。',
    '3. 确认新聊天输入框可用后，只输入一个大写英文字母 G，发送恰好一次。不要添加空格、编号、解释、指令或其他字符。',
    '4. 等待页面确实显示已发送的用户消息 G，并确认 ChatGPT 开始响应；不能仅根据点击了发送按钮就宣布成功。',
    '5. 如果登录态失效、出现验证码、审批、无法新建聊天、网络异常或无法确认发送，立即停止并报告失败。不要尝试绕过验证，不要重复发送。',
    '6. 不要访问 Dropbox、邮箱、官网后台或本机其他文件，不要处理 PPT 内容，不要代替 ChatGPT 执行任务。',
    '7. 只有亲眼确认新会话中存在用户消息 G 时，最终回复的最后一行才写：' + receipt,
    '8. 否则最后一行写：TGG_WAKE_FAILED',
    '本地通知对应任务 ID：' + id + '。此编号只用于本机日志，绝对不要在 ChatGPT 会话中发送。'
  ].join('\n');
}

function intEnv(name, fallback, min, max) {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

const root = process.env.PPT_BRIDGE_ROOT;
const chatUrl = process.env.PPT_CHATGPT_PROJECT_URL;
const dryRun = process.env.PPT_BRIDGE_DRY_RUN !== '0';
const interval = intEnv('PPT_BRIDGE_POLL_MS', 3000, 500, 60000);
const maxParallel = intEnv('PPT_BRIDGE_MAX_PARALLEL', 3, 1, 10);
const timeoutMs = intEnv('PPT_DSH_TIMEOUT_MS', 600000, 30000, 3600000);
const maxAgeMs = intEnv('PPT_BRIDGE_MAX_AGE_HOURS', 72, 1, 168) * 3600000;
const stateDir = process.env.PPT_BRIDGE_STATE_DIR || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'state'), 'TownGG-PPT-Bridge');
const stateFile = path.join(stateDir, 'journal.json');
const active = new Set();
const drySeen = new Set();
let journal = {};
let saveTail = Promise.resolve();

async function saveJournal() {
  const snapshot = JSON.stringify(journal, null, 2);
  saveTail = saveTail.then(async () => {
    await fs.mkdir(stateDir, { recursive: true });
    const temporary = stateFile + '.' + process.pid + '.tmp';
    await fs.writeFile(temporary, snapshot, 'utf8');
    await fs.rename(temporary, stateFile);
  });
  return saveTail;
}

async function readJournal() {
  try {
    journal = JSON.parse(await fs.readFile(stateFile, 'utf8'));
    if (!journal || typeof journal !== 'object' || Array.isArray(journal)) throw new Error('Invalid journal');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    journal = {};
  }
}

async function signalList(folder, expected) {
  const result = [];
  let filenames;
  try { filenames = await fs.readdir(folder); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  for (const filename of filenames) {
    if (!/^PPT-\d{8}-[A-F0-9]{12}\.json$/.test(filename)) continue;
    try { result.push(parseSignal(filename, await fs.readFile(path.join(folder, filename), 'utf8'), expected)); }
    catch (error) { console.error('Invalid signal:', filename, error.message); }
  }
  return result;
}

async function invokeHarness(id) {
  const receipt = 'TGG_WAKE_SENT_' + randomUUID().replace(/-/g, '');
  const instruction = wakePrompt({ id, url: chatUrl, receipt });
  if (dryRun) {
    console.log('[DRY RUN] Would open a NEW ChatGPT project chat and send G for ' + id);
    return 'dry-run';
  }
  const program = process.env.PPT_DSH_BIN || 'dsh';
  return new Promise((resolve, reject) => {
    // Windows npm CLIs usually resolve to .cmd files, which cannot be spawned
    // directly without a shell. PowerShell receives a fixed command and passes
    // the complete prompt as one variable argument (never as executable code).
    const windows = process.platform === 'win32';
    const executable = windows ? 'powershell.exe' : program;
    const args = windows
      ? ['-NoProfile', '-NonInteractive', '-Command', '& $env:PPT_DSH_BIN --profile headless $env:PPT_DSH_PROMPT']
      : ['--profile', 'headless', instruction];
    const child = spawn(executable, args, {
      shell: false, windowsHide: false,
      env: { ...process.env, ...(windows ? { PPT_DSH_BIN: program, PPT_DSH_PROMPT: instruction } : {}) },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    let errorOutput = '';
    const cap = (str, more) => (str + more).slice(-64000);
    child.stdout.on('data', chunk => { output = cap(output, String(chunk)); });
    child.stderr.on('data', chunk => { errorOutput = cap(errorOutput, String(chunk)); });
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      clearTimeout(timer);
      const last = output.trim().split(/\r?\n/).at(-1)?.trim();
      if (code === 0 && last === receipt) resolve('sent');
      else reject(new Error('Harness did not confirm G was sent (exit ' + code + ', last output: ' + String(last || errorOutput.slice(-300)).slice(0, 400) + ')'));
    });
  });
}

async function launch(signal) {
  const id = signal.id;
  active.add(id);
  if (dryRun) {
    drySeen.add(id);
    try { await invokeHarness(id); }
    finally { active.delete(id); }
    return;
  }
  journal[id] = { status: 'launching', at: new Date().toISOString(), notifiedAt: signal.at };
  await saveJournal();
  try {
    const result = await invokeHarness(id);
    journal[id] = { status: result, at: new Date().toISOString(), notifiedAt: signal.at };
    console.log('Wake ' + result + ': ' + id);
  } catch (error) {
    journal[id] = { status: 'failed', at: new Date().toISOString(), reason: error.message.slice(0, 600), notifiedAt: signal.at };
    console.error('Wake failed, manual G is available for', id, '-', error.message);
  } finally {
    active.delete(id);
    await saveJournal();
  }
}

async function scan() {
  const [incoming, done] = await Promise.all([
    signalList(path.join(root, 'queue'), 'ppt.task.created'),
    signalList(path.join(root, 'done'), 'ppt.task.completed')
  ]);
  let dirty = false;
  for (const receipt of done) {
    if (active.has(receipt.id)) continue;
    if (journal[receipt.id]?.status !== 'completed') {
      journal[receipt.id] = { status: 'completed', at: receipt.at };
      dirty = true;
    }
  }
  if (dirty) await saveJournal();
  incoming.sort((a, b) => a.at.localeCompare(b.at));
  const runs = [];
  for (const signal of incoming) {
    if (active.size >= maxParallel) break;
    if (journal[signal.id] || active.has(signal.id) || (dryRun && drySeen.has(signal.id))) continue;
    if (NOW() - Date.parse(signal.at) > maxAgeMs) {
      journal[signal.id] = { status: 'stale', at: new Date().toISOString() };
      await saveJournal();
      continue;
    }
    runs.push(launch(signal));
  }
  return runs;
}

async function main() {
  const args = process.argv.slice(2);
  if (!root || !path.isAbsolute(root)) throw new Error('Set PPT_BRIDGE_ROOT to the absolute local Dropbox App Folder path');
  if (!chatUrl) throw new Error('Set PPT_CHATGPT_PROJECT_URL to your ChatGPT project URL');
  projectUrl(chatUrl);
  await readJournal();
  if (args[0] === '--status') { console.log(JSON.stringify(journal, null, 2)); return; }
  if (args[0] === '--retry') {
    const id = args[1];
    if (!PPT_ID_RE.test(id) || !['failed', 'stale'].includes(journal[id]?.status)) throw new Error('Retry requires a failed/stale PPT task ID');
    delete journal[id];
    await saveJournal();
  }
  const once = args.includes('--once');
  console.log('TownGG Dropbox wake bridge started (' + (dryRun ? 'DRY RUN' : 'LIVE') + ', max parallel ' + maxParallel + ')');
  do {
    const runs = await scan();
    if (once) { await Promise.all(runs); break; }
    await new Promise(resolve => setTimeout(resolve, interval));
  } while (true);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error('Bridge stopped:', error.message); process.exitCode = 1; });
}
