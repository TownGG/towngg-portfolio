import assert from 'node:assert/strict';
import worker from './admin-upload-worker.js';

const tasks = [
  { id: 'PPT-20261127-AAAAAAAAAAAA', status: 'designing', name: 'report.pptx', prompt: '商务风', createdAt: '2026-11-27T12:00:00Z', totalPages: 3, completedPages: 0, agentToken: 'private-agent-token' },
  { id: 'PPT-20261127-BBBBBBBBBBBB', status: 'exporting', name: 'overview.pptx', prompt: '科技风', createdAt: '2026-11-27T13:00:00Z', totalPages: 5, completedPages: 5 }
];
const objects = new Map(tasks.map(task => ['tasks/' + task.id + '.json', JSON.stringify(task)]));
objects.set('results/' + tasks[1].id + '.pptx', new Uint8Array([80, 75, 3, 4]));
const bucket = {
  async list({ prefix, cursor }) {
    assert.equal(prefix, 'tasks/');
    assert.equal(cursor, undefined);
    return { objects: tasks.map(task => ({ key: 'tasks/' + task.id + '.json' })), truncated: false };
  },
  async get(key) {
    const data = objects.get(key);
    return typeof data === 'string' ? { json: async () => JSON.parse(data) } : null;
  },
  async head(key) { return objects.has(key) ? { key } : null; }
};
const env = { PPT_FILES: bucket, ADMIN_UPLOAD_SECRET: 'test-admin-secret', GITHUB_TOKEN: 'test-github-token' };
const request = key => new Request('https://towngg.com/api/admin/ppt-list', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key }, body: '{}'
});
const unauthorized = await worker.fetch(request('invalid'), env);
assert.equal(unauthorized.status, 401);
const result = await worker.fetch(request('test-admin-secret'), env);
assert.equal(result.status, 200);
const body = await result.json();
assert.equal(body.success, true);
assert.equal(body.tasks.length, 2);
assert.equal(body.tasks[0].id, tasks[1].id, 'Newest tasks appear first');
assert.equal(body.tasks[0].status, 'completed', 'Verified result object takes precedence');
assert.equal(body.tasks[0].hasResult, true);
assert.equal(body.tasks[1].completedPages, 0);
assert.equal(body.tasks[1].hasResult, false);
assert.equal(JSON.stringify(body).includes('private-agent-token'), false, 'Agent credentials must never be returned');
console.log('PPT admin task listing: PASS');
