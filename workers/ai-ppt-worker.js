/**
 * TGG AI PPT intake Worker.
 * Route: towngg.com/api/ppt/*
 * Required secrets: ADMIN_UPLOAD_SECRET, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET,
 *                   GMAIL_REFRESH_TOKEN
 * Required R2 binding: PPT_TASKS_BUCKET (private bucket)
 * Optional: PPT_INBOX_EMAIL (default tgg508034@gmail.com)
 *
 * The connected ChatGPT Gmail app does not grant credentials to this Worker.
 * Obtain a separate Gmail OAuth refresh token with gmail.send scope.
 */

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const RECIPIENT = 'tgg508034@gmail.com';
const UTF8 = new TextEncoder();

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (request.method !== 'POST' || !/^\/api\/ppt\/(health|submit|status)$/.test(path)) {
      return reply({ success: false, error: 'Not found' }, 404);
    }
    try {
      authenticate(request, env);
      if (path.endsWith('/health')) return reply({ success: true, configured: configured(env) });
      if (path.endsWith('/status')) return status(request, env);
      if (!configured(env)) return reply({ success: false, error: 'PPT 自动接单尚未完成服务器配置' }, 503);
      return submit(request, env);
    } catch (error) {
      return reply({ success: false, error: error.publicMessage || '任务提交失败，请稍后重试' }, error.status || 500);
    }
  }
};

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}

function fail(message, status = 400) {
  const e = new Error(message);
  e.publicMessage = message;
  e.status = status;
  throw e;
}

function authenticate(request, env) {
  const actual = request.headers.get('X-Admin-Key') || '';
  if (!env.ADMIN_UPLOAD_SECRET || !actual || actual !== env.ADMIN_UPLOAD_SECRET) fail('访问密钥无效', 401);
}

function configured(env) {
  return Boolean(env.PPT_TASKS_BUCKET && env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN);
}

function randomTaskId() {
  const iso = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `PPT-${iso}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

async function submit(request, env) {
  const type = request.headers.get('Content-Type') || '';
  if (!type.startsWith('multipart/form-data')) fail('请使用 PPT 文件上传表单');
  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > MAX_FILE_BYTES + 64 * 1024) fail('文件过大，请压缩至 12 MB 以内', 413);
  const form = await request.formData();
  const file = form.get('file');
  const prompt = String(form.get('prompt') || '').trim();
  const style = String(form.get('style') || '蓝色科技风').trim().slice(0, 80);
  if (!(file instanceof File) || !/\.pptx$/i.test(file.name)) fail('请选择 .pptx 文件');
  if (!file.size || file.size > MAX_FILE_BYTES) fail('PPT 文件须小于 12 MB', 413);
  if (prompt.length < 4 || prompt.length > 1200) fail('设计需求应为 4～1200 个字符');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) fail('文件格式不正确，请上传有效 PPTX');

  const id = randomTaskId();
  const now = new Date().toISOString();
  const safeName = file.name.replace(/[\r\n"\\/]/g, '_').slice(0, 160);
  const task = { id, status: 'sending', createdAt: now, name: safeName, size: file.size, prompt, style };
  // R2 is private. Never write customer PPTs into public GitHub Pages assets.
  await env.PPT_TASKS_BUCKET.put(`jobs/${id}/original.pptx`, bytes, { httpMetadata: { contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' } });
  await saveTask(env, task);

  try {
    const body = [
      'TGG AI PPT 自动提交任务', `任务 ID：${id}`, `文件名：${safeName}`,
      `设计风格：${style}`, `设计要求：${prompt}`,
      '默认规则：每一页单独生图；原稿所有文字、数字、信息保持不变；统一视觉；最终合成 16:9 PPTX。',
      '这是官网自动发出的任务邮件，原始 PPTX 已作为附件包含。'
    ].join('\n');
    await sendGmail(env, `[PPT-AI-TEST] ${id}`, body, safeName, bytes);
    task.status = 'email_sent';
    task.sentAt = new Date().toISOString();
    await saveTask(env, task);
    return reply({ success: true, id, status: task.status, createdAt: now });
  } catch (error) {
    task.status = 'email_failed';
    task.error = '邮件发送失败';
    await saveTask(env, task);
    return reply({ success: false, id, error: '文件已安全保存，但邮件发送失败，请联系管理员' }, 502);
  }
}

async function saveTask(env, task) {
  await env.PPT_TASKS_BUCKET.put(`jobs/${task.id}/task.json`, JSON.stringify(task), { httpMetadata: { contentType: 'application/json' } });
}

async function status(request, env) {
  if (!env.PPT_TASKS_BUCKET) return reply({ success: false, error: '任务存储未配置' }, 503);
  const data = await request.json().catch(() => ({}));
  const id = String(data.id || '');
  if (!/^PPT-\d{8}-[A-F0-9]{12}$/.test(id)) fail('任务 ID 不正确');
  const obj = await env.PPT_TASKS_BUCKET.get(`jobs/${id}/task.json`);
  if (!obj) return reply({ success: false, error: '找不到该任务' }, 404);
  const task = await obj.json();
  return reply({ success: true, task: { id: task.id, name: task.name, style: task.style, createdAt: task.createdAt, status: task.status, sentAt: task.sentAt || null } });
}

async function sendGmail(env, subject, text, filename, attachment) {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GMAIL_CLIENT_ID, client_secret: env.GMAIL_CLIENT_SECRET, refresh_token: env.GMAIL_REFRESH_TOKEN, grant_type: 'refresh_token' })
  });
  if (!tokenResponse.ok) throw new Error('Gmail OAuth token exchange failed');
  const { access_token: accessToken } = await tokenResponse.json();
  if (!accessToken) throw new Error('No Gmail access token');

  const boundary = 'tgg-ppt-' + crypto.randomUUID();
  const to = String(env.PPT_INBOX_EMAIL || RECIPIENT);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('Invalid recipient address');
  const nameHeader = `UTF-8''${encodeURIComponent(filename)}`;
  const mime = [
    `To: ${to}`, `Subject: =?UTF-8?B?${base64(UTF8.encode(subject))}?=`,
    'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${boundary}"`, '',
    `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '',
    base64(UTF8.encode(text)), '',
    `--${boundary}`, 'Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation',
    `Content-Disposition: attachment; filename*= ${nameHeader}`.replace('filename*= ', 'filename*='),
    'Content-Transfer-Encoding: base64', '', base64(attachment), '', `--${boundary}--`, ''
  ].join('\r\n');
  const raw = base64url(UTF8.encode(mime));
  const sent = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw })
  });
  if (!sent.ok) throw new Error(`Gmail send failed (${sent.status})`);
}

function base64(data) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const parts = [];
  let block = '';
  for (let i = 0; i < data.length; i += 3) {
    const a = data[i], b = data[i + 1], c = data[i + 2];
    const n = (a << 16) | ((b || 0) << 8) | (c || 0);
    block += chars[(n >>> 18) & 63] + chars[(n >>> 12) & 63] + (i + 1 < data.length ? chars[(n >>> 6) & 63] : '=') + (i + 2 < data.length ? chars[n & 63] : '=');
    if (block.length >= 16384) { parts.push(block); block = ''; }
  }
  if (block) parts.push(block);
  return parts.join('');
}

function base64url(data) { return base64(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
