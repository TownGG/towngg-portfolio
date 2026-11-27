import assert from 'node:assert/strict';
import worker from './admin-upload-worker.js';

const objects = new Map();
const uploads = new Map();
const bucket = {
  async put(key, bytes) { objects.set(key, bytes); return { key }; },
  async get(key) { return objects.has(key) ? { json: async () => JSON.parse(objects.get(key)) } : null; },
  async head(key) { return objects.has(key) ? { key } : null; },
  async createMultipartUpload(key) { uploads.set('upload-1', { key }); return { uploadId: 'upload-1' }; },
  resumeMultipartUpload(key, uploadId) {
    assert.equal(uploadId, 'upload-1');
    return {
      async uploadPart(index, data) { uploads.get(uploadId).part = data; return { partNumber: index, etag: 'part-etag' }; },
      async complete() { objects.set(key, uploads.get(uploadId).part); }
    };
  }
};
const env = {
  ADMIN_UPLOAD_SECRET: 'admin', GITHUB_TOKEN: 'github-test', PPT_FILES: bucket,
  GMAIL_CLIENT_ID: 'gmail-id', GMAIL_CLIENT_SECRET: 'gmail-secret', GMAIL_REFRESH_TOKEN: 'gmail-refresh',
  PPT_DROPBOX_APP_KEY: 'db-app', PPT_DROPBOX_APP_SECRET: 'db-secret', PPT_DROPBOX_REFRESH_TOKEN: 'db-refresh'
};
const remoteFiles = new Map();
const previousFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'gmail-access' });
  if (url === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send') return Response.json({ id: 'mail-id' });
  if (url === 'https://api.dropbox.com/oauth2/token') {
    assert.match(String(options.body), /grant_type=refresh_token/);
    return Response.json({ access_token: 'dropbox-access' });
  }
  if (url === 'https://api.dropboxapi.com/2/files/create_folder_v2') return Response.json({ metadata: {} });
  if (url === 'https://content.dropboxapi.com/2/files/upload') {
    assert.equal(options.headers.Authorization, 'Bearer dropbox-access');
    const target = JSON.parse(options.headers['Dropbox-API-Arg']).path;
    remoteFiles.set(target, JSON.parse(options.body));
    return Response.json({ name: target });
  }
  throw new Error('Unexpected external URL: ' + url);
};

try {
  const submit = await worker.fetch(new Request('https://towngg.com/api/admin/ppt-text', {
    method: 'POST', headers: { 'X-Admin-Key': 'admin' },
    body: JSON.stringify({ prompt: '两页历史人物简介，水墨风' })
  }), env);
  assert.equal(submit.status, 200);
  const task = await submit.json();
  const queue = remoteFiles.get('/queue/' + task.id + '.json');
  assert.deepEqual(Object.keys(queue), ['schema', 'event', 'taskId', 'at']);
  assert.equal(queue.event, 'ppt.task.created');
  assert.equal(queue.taskId, task.id);
  assert.doesNotMatch(JSON.stringify(queue), /token|secret|prompt|source|gmail/i);
  const record = JSON.parse(objects.get('tasks/' + task.id + '.json'));
  assert.ok(record.dropboxNotifiedAt);

  async function callback(action, body, extra = {}) {
    return worker.fetch(new Request('https://towngg.com/api/admin/ppt-agent', {
      method: 'POST', headers: {
        'X-Ppt-Id': task.id, 'X-Ppt-Agent-Token': record.agentToken, 'X-Ppt-Agent-Action': action,
        ...extra
      },
      body: body instanceof Uint8Array ? body : JSON.stringify(body)
    }), env);
  }
  assert.equal((await callback('start', { totalPages: 1, completedPages: 0 })).status, 200);
  assert.equal((await callback('progress', { totalPages: 1, completedPages: 1 })).status, 200);
  const init = await (await callback('result-init', { size: 4 })).json();
  const part = await (await callback('result-part', new Uint8Array([80, 75, 3, 4]), {
    'X-Ppt-Upload-Id': init.uploadId, 'X-Ppt-Part': '1'
  })).json();
  assert.equal((await callback('result-complete', {
    uploadId: init.uploadId, parts: [{ partNumber: 1, etag: part.etag }]
  })).status, 200);
  const done = remoteFiles.get('/done/' + task.id + '.json');
  assert.equal(done.event, 'ppt.task.completed');
  assert.equal(done.taskId, task.id);
  assert.equal(JSON.parse(objects.get('tasks/' + task.id + '.json')).status, 'completed');
  console.log('Dropbox notification bridge: PASS');
} finally {
  globalThis.fetch = previousFetch;
}
