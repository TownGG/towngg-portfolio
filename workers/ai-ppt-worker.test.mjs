import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import worker from './ai-ppt-worker.js';

globalThis.File = File;
const objects = new Map();
const sent = [];
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'test-token' });
  if (url === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send') {
    sent.push(JSON.parse(options.body));
    return Response.json({ id: 'mock-gmail-message' });
  }
  throw new Error(`Unexpected request ${url}`);
};

const env = {
  ADMIN_UPLOAD_SECRET: 'test-only',
  GMAIL_CLIENT_ID: 'test', GMAIL_CLIENT_SECRET: 'test', GMAIL_REFRESH_TOKEN: 'test',
  PPT_TASKS_BUCKET: {
    async put(key, value) { objects.set(key, value); },
    async get(key) { const value = objects.get(key); return value && { async json() { return JSON.parse(value); } }; }
  }
};
function request(path, body) { return new Request(`https://towngg.com/api/ppt/${path}`, { method: 'POST', headers: { 'X-Admin-Key': 'test-only' }, body }); }

try {
  const health = await worker.fetch(request('health'), env);
  assert.equal((await health.json()).configured, true);

  const form = new FormData();
  form.append('file', new File([new Uint8Array([0x50, 0x4b, 3, 4, 5])], 'demo.pptx'));
  form.append('prompt', '蓝色科技风，逐页设计');
  form.append('style', '3D 毛玻璃');
  const response = await worker.fetch(request('submit', form), env);
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.status, 'email_sent');
  assert.equal(sent.length, 1);
  assert.ok(objects.has(`jobs/${data.id}/original.pptx`));

  const state = await worker.fetch(request('status', JSON.stringify({ id: data.id })), env);
  assert.equal((await state.json()).task.status, 'email_sent');
  console.log('AI PPT Worker mock intake and Gmail send: PASS');
} finally { globalThis.fetch = nativeFetch; }
