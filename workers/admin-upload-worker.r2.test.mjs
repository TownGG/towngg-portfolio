import assert from 'node:assert/strict';
import worker from './admin-upload-worker.js';

const store = new Map();
const multipart = new Map();
const bucket = {
  async put(key, value) { store.set(key, typeof value === 'string' ? value : value); },
  async get(key) { const value = store.get(key); return value === undefined ? null : { json: async () => JSON.parse(value), body: value }; },
  async head(key) { return store.has(key) ? { key } : null; },
  async createMultipartUpload(key) { multipart.set(key, []); return { uploadId: 'upload-mock' }; },
  resumeMultipartUpload(key, uploadId) {
    assert.equal(uploadId, 'upload-mock');
    return {
      async uploadPart(number, stream) { assert.ok(stream); multipart.get(key).push(number); return { partNumber: number, etag: `etag-${number}` }; },
      async complete(parts) { assert.equal(parts.length, multipart.get(key).length); store.set(key, 'pptx-data'); }
    };
  }
};
const env = { ADMIN_UPLOAD_SECRET: 'test-admin', GITHUB_TOKEN: 'test-token', GMAIL_CLIENT_ID: 'id', GMAIL_CLIENT_SECRET: 'secret', GMAIL_REFRESH_TOKEN: 'refresh', PPT_FILES: bucket };
const previousFetch = globalThis.fetch;
let mailCount = 0;
const sentMail = [];
globalThis.fetch = async (url, options) => {
  if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'mock' });
  if (url === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send') {
    mailCount++;
    sentMail.push(Buffer.from(JSON.parse(options.body).raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return Response.json({ id: 'mail' });
  }
  throw Error('Unexpected URL');
};
const call = (name, body, headers = {}) => worker.fetch(new Request('https://towngg.com/api/admin/ppt-' + name, { method: 'POST', headers: { 'X-Admin-Key': 'test-admin', ...headers }, body }), env);
try {
  const health = await (await call('health')).json();
  assert.equal(health.r2Configured, true);
  const init = await (await call('init', JSON.stringify({ name: 'large.pptx', size: 6 * 1048576, prompt: '统一蓝色科技风', style: '3D 毛玻璃' }), { 'Content-Type': 'application/json' })).json();
  assert.equal(init.success, true);
  for (const [partNumber, len] of [[1, 5 * 1048576], [2, 1048576]]) {
    const response = await call('part', new Uint8Array(len), { 'X-Ppt-Id': init.id, 'X-Ppt-Upload-Id': init.uploadId, 'X-Ppt-Part': String(partNumber) });
    assert.equal(response.status, 200, await response.text());
  }
  const parts = [1, 2].map(partNumber => ({ partNumber, etag: `etag-${partNumber}` }));
  const completeResponse = await call('complete', JSON.stringify({ id: init.id, uploadId: init.uploadId, parts }), { 'Content-Type': 'application/json' });
  assert.equal(completeResponse.status, 200, await completeResponse.text());
  assert.equal(mailCount, 2);
  assert.match(sentMail[0], /To: tgg508034@gmail\.com/);
  assert.match(sentMail[1], /To: 1398469825@qq\.com/);
  assert.doesNotMatch(sentMail[1], /ppt-source|ppt-agent|agentToken|sourceToken/i);
  const status = await (await call('status', JSON.stringify({ id: init.id }), { 'Content-Type': 'application/json' })).json();
  assert.equal(status.status, 'email_sent');
  const task = JSON.parse(store.get(`tasks/${init.id}.json`));
  const source = await worker.fetch(new Request(`https://towngg.com/api/admin/ppt-source?id=${init.id}&token=${task.sourceToken}`), env);
  assert.equal(source.status, 200);
  console.log('R2 multipart PPT intake test: PASS');
} finally { globalThis.fetch = previousFetch; }
