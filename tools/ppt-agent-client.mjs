#!/usr/bin/env node
/**
 * Task-scoped Cloudflare R2 callback client for TownGG PPT agents.
 * Use with an actual image-generation executor; this script does not generate slides.
 *
 * PPT_TASK_ID, PPT_AGENT_TOKEN and (optionally) PPT_AGENT_ENDPOINT are read
 * from the environment. Never pass the token on a command line or print it.
 *
 * node tools/ppt-agent-client.mjs start 12
 * node tools/ppt-agent-client.mjs progress 3 12
 * node tools/ppt-agent-client.mjs preview 3 /absolute/path/page-3.webp
 * node tools/ppt-agent-client.mjs upload /absolute/path/result.pptx
 */
import { open, readFile, stat } from 'node:fs/promises';

const taskId = process.env.PPT_TASK_ID || '';
const token = process.env.PPT_AGENT_TOKEN || '';
const endpoint = process.env.PPT_AGENT_ENDPOINT || 'https://towngg.com/api/admin/ppt-agent';
const MAX_RESULT_BYTES = 200 * 1024 * 1024;
const MAX_PREVIEW_BYTES = 1024 * 1024;

if (!/^PPT-\d{8}-[A-F0-9]{12}$/.test(taskId) || !token) {
  console.error('Missing valid PPT_TASK_ID or PPT_AGENT_TOKEN environment variables.');
  process.exit(2);
}
if (new URL(endpoint).origin !== 'https://towngg.com' || new URL(endpoint).pathname !== '/api/admin/ppt-agent') {
  console.error('PPT_AGENT_ENDPOINT must be the official task-scoped TownGG endpoint.');
  process.exit(2);
}

async function request(action, body, extra = {}) {
  const headers = { 'X-Ppt-Id': taskId, 'X-Ppt-Agent-Token': token, 'X-Ppt-Agent-Action': action, ...extra };
  if (!(body instanceof Uint8Array)) headers['Content-Type'] = 'application/json';
  const response = await fetch(endpoint, { method: 'POST', headers, body: body instanceof Uint8Array ? body : JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) throw new Error('Server rejected ' + action + ': ' + (data?.error || response.status));
  return data;
}

async function uploadResult(path) {
  const stats = await stat(path);
  if (!stats.isFile() || stats.size < 4 || stats.size > MAX_RESULT_BYTES) throw new Error('Result must be a PPTX file under 200 MB.');
  const file = await open(path, 'r');
  try {
    const first = Buffer.alloc(2);
    await file.read(first, 0, 2, 0);
    if (first[0] !== 0x50 || first[1] !== 0x4b) throw new Error('PPTX ZIP signature missing.');
    const init = await request('result-init', { size: stats.size });
    const { uploadId, chunkSize } = init;
    if (!uploadId || !Number.isSafeInteger(chunkSize) || chunkSize < 1) throw new Error('Invalid upload session.');
    const parts = [];
    let position = 0;
    for (let partNumber = 1; position < stats.size; partNumber++) {
      const length = Math.min(chunkSize, stats.size - position);
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await file.read(buffer, 0, length, position);
      if (bytesRead !== length) throw new Error('Unexpected EOF when uploading result.');
      const part = await request('result-part', buffer, { 'X-Ppt-Upload-Id': uploadId, 'X-Ppt-Part': String(partNumber) });
      parts.push({ partNumber: part.partNumber, etag: part.etag });
      position += bytesRead;
      console.log('Uploaded part ' + partNumber + ' of ' + Math.ceil(stats.size / chunkSize));
    }
    const completed = await request('result-complete', { uploadId, parts });
    if (completed.status !== 'completed') throw new Error('Server did not confirm completion.');
    console.log('Result delivered to task ' + taskId);
  } finally {
    await file.close();
  }
}

async function uploadPreview(pageText, path) {
  const page = Number(pageText);
  if (!Number.isInteger(page) || page < 1 || page > 500) throw new Error('Preview page must be between 1 and 500.');
  const ext = path.split('.').pop()?.toLowerCase();
  const contentType = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }[ext];
  if (!contentType) throw new Error('Preview file must be a .png, .jpg, .jpeg or .webp image.');
  const stats = await stat(path);
  if (!stats.isFile() || stats.size < 1 || stats.size > MAX_PREVIEW_BYTES) throw new Error('Preview must be a real image under 1 MB.');
  const file = new Uint8Array(await readFile(path));
  const result = await request('preview', file, { 'X-Ppt-Page': String(page), 'Content-Type': contentType });
  console.log('Preview for page ' + result.page + ' delivered.');
}

const [command, ...args] = process.argv.slice(2);
try {
  if (command === 'start') {
    const totalPages = Number(args[0]);
    console.log((await request('start', { totalPages, completedPages: 0 })).status);
  } else if (command === 'progress') {
    const completedPages = Number(args[0]);
    const totalPages = Number(args[1]);
    console.log((await request('progress', { totalPages, completedPages })).status);
  } else if (command === 'preview' && args[0] && args[1]) {
    await uploadPreview(args[0], args[1]);
  } else if (command === 'upload' && args[0]) {
    await uploadResult(args[0]);
  } else {
    console.error('Usage: start TOTAL | progress DONE TOTAL | preview PAGE IMAGE | upload RESULT.pptx');
    process.exitCode = 2;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
