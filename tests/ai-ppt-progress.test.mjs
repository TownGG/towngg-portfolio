import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const page = readFileSync(new URL('../ai-ppt.html', import.meta.url), 'utf8');
const start = page.indexOf('function jobStatusLabel(job){');
const end = page.indexOf('async function apiPpt(action,body,additional)', start);
assert.ok(start >= 0 && end > start, 'PPT progress functions are present');

function createView() {
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {
        classes,
        classList: { toggle(name, on) { if (on) classes.add(name); else classes.delete(name); } },
        style: {},
        hidden: false,
        setAttribute(name, value) { this[name] = value; },
      });
    }
    return elements.get(id);
  };
  const context = vm.createContext({ $, showTab() {}, prettySize() { return '60 KB'; } });
  vm.runInContext(page.slice(start, end), context);
  return { context, $ };
}

const baseJob = {
  id: 'PPT-20261127-EXAMPLE000001',
  name: '年度工作汇报.pptx',
  size: 60255,
  automated: true,
  r2: true,
  totalPages: 3,
};

test('designing shows the actual next page and completed count', () => {
  const { context, $ } = createView();
  context.paintJob({ ...baseJob, status: 'designing', completedPages: 1 });
  assert.equal($('job-page-current').textContent, '02');
  assert.equal($('job-page-total').textContent, '03');
  assert.equal($('job-page-count').textContent, '1 / 3 页完成');
  assert.equal($('job-bar').style.width, '33%');
  assert.equal($('job-meter')['aria-valuenow'], '33');
  assert.equal($('job-pages-panel').hidden, false);
  assert.ok($('stage-design').classes.has('now'));
  assert.ok(!$('stage-export').classes.has('now'));
});

test('exporting highlights PPTX generation and retains factual page progress', () => {
  const { context, $ } = createView();
  context.paintJob({ ...baseJob, status: 'exporting', completedPages: 3 });
  assert.equal($('job-focus-kicker').textContent, '页面设计已完成');
  assert.equal($('job-page-current').textContent, '03');
  assert.equal($('job-page-count').textContent, '3 / 3 页完成');
  assert.equal($('job-bar').style.width, '100%');
  assert.ok($('stage-design').classes.has('done'));
  assert.ok($('stage-export').classes.has('now'));
  assert.equal($('job-download').hidden, true);
});

test('completed hides page counter and enables the download button', () => {
  const { context, $ } = createView();
  context.paintJob({ ...baseJob, status: 'completed', completedPages: 3 });
  assert.equal($('job-pages-panel').hidden, true);
  assert.equal($('job-page-count').textContent, '全部 3 页已完成');
  assert.equal($('job-download').hidden, false);
  assert.equal($('job-complete').hidden, false);
  assert.ok($('job-card').classes.has('is-complete'));
  assert.ok($('stage-export').classes.has('done'));
  assert.ok(!$('stage-export').classes.has('now'));
});

test('waiting to be claimed does not pretend design has begun', () => {
  const { context, $ } = createView();
  context.paintJob({ ...baseJob, status: 'email_sent', totalPages: 0, completedPages: 0 });
  assert.equal($('job-pages-panel').hidden, true);
  assert.equal($('job-page-count').textContent, '等待 AI 接单');
  assert.equal($('job-bar').style.width, '0%');
  assert.equal($('job-badge').textContent, '已提交 · 等待 AI 接单');
});
