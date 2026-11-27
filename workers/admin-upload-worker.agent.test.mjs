import assert from 'node:assert/strict';
import worker from './admin-upload-worker.js';

const objects = new Map();
const multipart = new Map();
let sequence = 0;
const bucket = {
  async get(key) { const data = objects.get(key); return data == null ? null : { json: async () => JSON.parse(data), body: data }; },
  async head(key) { return objects.has(key) ? { key } : null; },
  async put(key, data) { objects.set(key, typeof data === 'string' ? data : data); },
  async createMultipartUpload(key) { const uploadId = 'upload-' + (++sequence); multipart.set(uploadId, { key, parts: [] }); return { uploadId }; },
  resumeMultipartUpload(key, uploadId) {
    const upload = multipart.get(uploadId);
    assert.equal(upload.key, key);
    return {
      async uploadPart(partNumber, bytes) { upload.parts[partNumber - 1] = bytes; return { partNumber, etag: 'etag-' + partNumber }; },
      async complete(parts) { assert.equal(parts.length, upload.parts.length); objects.set(key, new Uint8Array(upload.parts[0])); multipart.delete(uploadId); }
    };
  }
};

const taskId = 'PPT-20261127-ABCDEF123456';
const token = 'test-agent-token';
objects.set('tasks/' + taskId + '.json', JSON.stringify({ id: taskId, name: 'test.pptx', size: 6, style: '科技风', status: 'email_sent', agentToken: token, agentExpiresAt: Date.now() + 60000 }));
const env = { PPT_FILES: bucket, ADMIN_UPLOAD_SECRET: 'admin-secret', GITHUB_TOKEN: 'mock' };
const endpoint = 'https://towngg.com/api/admin/ppt-agent';
const agentRequest = (action, body, extra = {}) => new Request(endpoint, { method: 'POST', headers: { 'X-Ppt-Id': taskId, 'X-Ppt-Agent-Token': token, 'X-Ppt-Agent-Action': action, ...(body instanceof Uint8Array ? {} : { 'Content-Type': 'application/json' }), ...extra }, body: body instanceof Uint8Array ? body : JSON.stringify(body) });
async function read(response) { return { status: response.status, body: await response.json() }; }

const unauthorized = await read(await worker.fetch(new Request(endpoint, { method: 'POST', headers: { 'X-Ppt-Id': taskId, 'X-Ppt-Agent-Token': 'invalid' } }), env));
assert.equal(unauthorized.status, 403);
const started = await read(await worker.fetch(agentRequest('start', { totalPages: 2, completedPages: 0 }), env));
assert.equal(started.body.status, 'designing');
const progress = await read(await worker.fetch(agentRequest('progress', { totalPages: 2, completedPages: 2 }), env));
assert.equal(progress.body.status, 'exporting');
const initialized = await read(await worker.fetch(agentRequest('result-init', { size: 6 }), env));
assert.equal(initialized.status, 200);
const file = new Uint8Array([0x50, 0x4b, 3, 4, 5, 6]);
const uploaded = await read(await worker.fetch(agentRequest('result-part', file, { 'X-Ppt-Upload-Id': initialized.body.uploadId, 'X-Ppt-Part': '1' }), env));
assert.equal(uploaded.status, 200);
const finished = await read(await worker.fetch(agentRequest('result-complete', { uploadId: initialized.body.uploadId, parts: [{ partNumber: 1, etag: uploaded.body.etag }] }), env));
assert.equal(finished.body.status, 'completed');
const status = await read(await worker.fetch(new Request('https://towngg.com/api/admin/ppt-status', { method: 'POST', headers: { 'X-Admin-Key': 'admin-secret' }, body: JSON.stringify({ id: taskId }) }), env));
assert.equal(status.body.status, 'completed');
assert.equal(status.body.totalPages, 2);
const replay = await read(await worker.fetch(agentRequest('start', { totalPages: 2 }), env));
assert.equal(replay.status, 403);
console.log('PPT agent callback lifecycle: PASS');
