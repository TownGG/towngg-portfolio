import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import worker from './admin-upload-worker.js';

globalThis.File = File;
const sent = [];
const previousFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'mock-token' });
  if (url === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send') {
    sent.push(options.body);
    return Response.json({ id: 'gmail-mock' });
  }
  throw new Error(`Unexpected network URL: ${url}`);
};

const env = {
  ADMIN_UPLOAD_SECRET: 'test-admin-key', GITHUB_TOKEN: 'mock',
  GMAIL_CLIENT_ID: 'mock-client', GMAIL_CLIENT_SECRET: 'mock-secret', GMAIL_REFRESH_TOKEN: 'mock-refresh'
};
function request(path, body) {
  return new Request(`https://towngg.com/api/admin/${path}`, { method: 'POST', headers: { 'X-Admin-Key': 'test-admin-key' }, body });
}

try {
  const health = await worker.fetch(request('ppt-health'), env);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).configured, true);

  const form = new FormData();
  form.append('file', new File([new Uint8Array([0x50, 0x4b, 3, 4, 5])], 'test.pptx'));
  form.append('prompt', '保持所有文字不变，科技风格');
  form.append('style', '3D 毛玻璃');
  const response = await worker.fetch(request('ppt-submit', form), env);
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.status, 'email_sent');
  assert.match(data.id, /^PPT-\d{8}-[A-F0-9]{12}$/);
  assert.equal(sent.length, 1);
  console.log('Existing admin Worker PPT route mock test: PASS');
} finally {
  globalThis.fetch = previousFetch;
}
