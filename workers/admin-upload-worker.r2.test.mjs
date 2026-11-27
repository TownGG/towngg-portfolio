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
const decodedMailBody = index => Buffer.from(sentMail[index].match(/Content-Transfer-Encoding: base64\r\n\r\n([^\r\n]+)/)[1], 'base64').toString('utf8');
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
  const init = await (await call('init', JSON.stringify({ name: '需求说明.pdf', size: 6 * 1048576, prompt: '统一蓝色科技风，保留原文件信息' }), { 'Content-Type': 'application/json' })).json();
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
  assert.match(decodedMailBody(0), /原始素材安全下载链接/);
  assert.match(decodedMailBody(0), /不要用 PPT 模板或 PPT Skill/);
  assert.doesNotMatch(decodedMailBody(1), /ppt-source|ppt-agent|agentToken|sourceToken/i);
  const status = await (await call('status', JSON.stringify({ id: init.id }), { 'Content-Type': 'application/json' })).json();
  assert.equal(status.status, 'email_sent');
  const task = JSON.parse(store.get(`tasks/${init.id}.json`));
  const source = await worker.fetch(new Request(`https://towngg.com/api/admin/ppt-source?id=${init.id}&token=${task.sourceToken}`), env);
  assert.equal(source.status, 200);
  assert.match(source.headers.get('Content-Disposition'), /%E9%9C%80%E6%B1%82%E8%AF%B4%E6%98%8E\.pdf/);
  assert.equal(source.headers.get('Content-Type'), 'application/octet-stream');

  // The mobile download path must stream an actual attachment without Blob URLs.
  store.set(`results/${init.id}.pptx`, 'pptx-data');
  const linkResponse = await call('result-link', JSON.stringify({ id: init.id }), { 'Content-Type': 'application/json' });
  assert.equal(linkResponse.status, 200);
  const downloadLink = await linkResponse.json();
  assert.ok(downloadLink.url.startsWith('/api/admin/ppt-download?id='));
  const wrongDownload = await worker.fetch(new Request(`https://towngg.com/api/admin/ppt-download?id=${init.id}&token=bad`), env);
  assert.equal(wrongDownload.status, 403);
  const download = await worker.fetch(new Request(`https://towngg.com${downloadLink.url}`), env);
  assert.equal(download.status, 200);
  assert.equal(await download.text(), 'pptx-data');
  assert.match(download.headers.get('Content-Disposition'), /attachment; filename="TGG-AI-/);
  assert.match(download.headers.get('Content-Type'), /presentationml\.presentation/);
  assert.equal(download.headers.get('Cache-Control'), 'private, no-store');
  const expiredTask = JSON.parse(store.get(`tasks/${init.id}.json`));
  expiredTask.downloadExpiresAt = Date.now() - 1;
  store.set(`tasks/${init.id}.json`, JSON.stringify(expiredTask));
  const expiredDownload = await worker.fetch(new Request(`https://towngg.com${downloadLink.url}`), env);
  assert.equal(expiredDownload.status, 403);

  const image = await (await call('init', JSON.stringify({ name: 'reference.png', size: 4, prompt: '按这张图片制作一份产品介绍' }), { 'Content-Type': 'application/json' })).json();
  assert.equal(image.success, true);
  const imgPart = await call('part', new Uint8Array(4), { 'X-Ppt-Id': image.id, 'X-Ppt-Upload-Id': image.uploadId, 'X-Ppt-Part': '1' });
  assert.equal(imgPart.status, 200);
  const imageDone = await call('complete', JSON.stringify({ id: image.id, uploadId: image.uploadId, parts: [{ partNumber: 1, etag: 'etag-1' }] }), { 'Content-Type': 'application/json' });
  assert.equal(imageDone.status, 200);

  const pureText = await (await call('text', JSON.stringify({ prompt: '请制作十页产品介绍，白色科技风，使用毛玻璃质感' }), { 'Content-Type': 'application/json' })).json();
  assert.equal(pureText.success, true);
  assert.equal(pureText.status, 'email_sent');
  const pureTask = JSON.parse(store.get(`tasks/${pureText.id}.json`));
  assert.equal(pureTask.size, 0);
  assert.equal(pureTask.sourceToken, undefined);
  assert.equal((await (await call('status', JSON.stringify({ id: pureText.id }), { 'Content-Type': 'application/json' })).json()).status, 'email_sent');
  assert.match(decodedMailBody(4), /纯文字创作/);
  assert.doesNotMatch(decodedMailBody(4), /ppt-source\?id=/);
  assert.equal(mailCount, 6);

  const invalid = await call('init', JSON.stringify({ name: 'empty.txt', size: 0, prompt: '空文件无法上传' }), { 'Content-Type': 'application/json' });
  assert.equal(invalid.status, 413);
  const invalidText = await call('text', JSON.stringify({ prompt: '短' }), { 'Content-Type': 'application/json' });
  assert.equal(invalidText.status, 400);

  const oldId = 'PPT-20261127-ABCDEF123456';
  store.set(`tasks/${oldId}.json`, JSON.stringify({ id: oldId, name: 'old.pptx', size: 100, sourceToken: 'old-secret', sourceExpiresAt: Date.now() + 60000, status: 'email_sent' }));
  store.set(`sources/${oldId}.pptx`, 'legacy-ppt');
  const oldSource = await worker.fetch(new Request(`https://towngg.com/api/admin/ppt-source?id=${oldId}&token=old-secret`), env);
  assert.equal(oldSource.status, 200);
  assert.equal(await oldSource.text(), 'legacy-ppt');
  console.log('R2 arbitrary-material, text-only, legacy source intake tests: PASS');
} finally { globalThis.fetch = previousFetch; }
