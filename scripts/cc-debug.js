import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DEBUG_DIR = path.join(ROOT, 'artifacts/creations-debug');
const DEBUG_SNAPSHOT_LIMIT = Number(process.env.CC_DEBUG_SNAPSHOT_LIMIT || 8);
let savedSnapshots = 0;

function safeFileName(value) {
  return String(value || 'debug')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'debug';
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function savePageDebug(page, name, extra = {}) {
  if (!page || savedSnapshots >= DEBUG_SNAPSHOT_LIMIT) return false;
  savedSnapshots += 1;

  await fs.mkdir(DEBUG_DIR, { recursive: true });
  const prefix = `${String(savedSnapshots).padStart(2, '0')}-${timestamp()}-${safeFileName(name)}`;
  const basePath = path.join(DEBUG_DIR, prefix);

  const meta = {
    name,
    url: page.url(),
    title: await page.title().catch(() => ''),
    savedAt: new Date().toISOString(),
    extra
  };

  await fs.writeFile(`${basePath}.meta.json`, `${JSON.stringify(meta, null, 2)}\n`, 'utf8').catch(() => {});

  const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch((error) => `BODY_TEXT_ERROR: ${error.message}`);
  await fs.writeFile(`${basePath}.body.txt`, bodyText, 'utf8').catch(() => {});

  const html = await page.content().catch((error) => `HTML_ERROR: ${error.message}`);
  await fs.writeFile(`${basePath}.html`, html, 'utf8').catch(() => {});

  await page.screenshot({ path: `${basePath}.png`, fullPage: true }).catch(() => {});
  console.log(`Debug artifact saved: ${path.relative(ROOT, basePath)}`);
  return true;
}
