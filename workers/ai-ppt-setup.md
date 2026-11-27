# TownGG AI PPT 自动接单后端

状态：代码已准备；**需在 Cloudflare 部署并配置 Gmail OAuth 才能启用**。静态 GitHub Pages 不能直接安全发送带附件的邮件。

## Cloudflare Worker

- 入口：`workers/ai-ppt-worker.js`
- 路由：`towngg.com/api/ppt/*`，不能与现有 `towngg.com/api/admin/*` 管理 Worker 混淆
- R2：创建私有存储桶，绑定变量名 `PPT_TASKS_BUCKET`，用于保存原始 PPTX 及任务 JSON
- 环境密钥（通过 Cloudflare Worker Secrets 配置，**不要提交到仓库**）：
  - `ADMIN_UPLOAD_SECRET`：现有官网后台访问密钥
  - `GMAIL_CLIENT_ID`：Google OAuth Client ID
  - `GMAIL_CLIENT_SECRET`：Google OAuth Client Secret
  - `GMAIL_REFRESH_TOKEN`：具有 **`https://www.googleapis.com/auth/gmail.send`** 权限的单独 refresh token
- 可选普通环境变量：`PPT_INBOX_EMAIL=tgg508034@gmail.com`

Gmail Connector 在 ChatGPT 内获得的授权**不会**自动赋予网站 Worker。必须为网站单独授权 Gmail API，并将凭据配置在 Worker Secret 中。不要把凭据粘贴到聊天或放在前端页面。

## API

以下接口均通过 `X-Admin-Key` 校验后台密钥：

| 请求 | 用途 |
|---|---|
| `POST /api/ppt/health` | `configured` 表示 R2 和 Gmail 必需配置是否齐备 |
| `POST /api/ppt/submit` | `multipart/form-data` 包含 `file`、`prompt`、`style`；验证 PPTX、存 R2、自动发送带 PPTX 附件的 Gmail；返回任务 ID |
| `POST /api/ppt/status` | JSON `{ "id": "PPT-YYYYMMDD-..." }` 获取实际发送状态 |

当前单文件限制 **12 MB**，以控制 Gmail MIME base64 开销与 Worker 内存占用。发送成功仅表示 Gmail API 接受了邮件，不表示 ChatGPT 已生图或成品已回传。任务状态 `email_sent` 不应显示为“AI 处理中”。

## 待打通

1. Cloudflare 权限及 R2 绑定、Google OAuth 授权。
2. Worker 部署并验证 `/api/ppt/health` 返回 `configured: true`。
3. 再切换 `ai-ppt.html` 提交方式到 `fetch('/api/ppt/submit', { method:'POST', body: FormData, headers:{ 'X-Admin-Key': ... } })`。确认发送成功后移除人工 Gmail 弹窗。
4. 使用非敏感小文件进行真实端到端发送测试。
5. 后续扩展 AI 自动处理、按任务 ID 回传以及安全的下载链接。现在的 Gmail 自动任务只实现“收到测试邮件”，**还未实现生图和结果回传**。

## 安全注意事项

- 原始 PPTX 存储在私有 R2，不应放入公开 GitHub Pages 仓库。
- 应配置过期清理策略、请求速率限制及必要的审计日志。
- 向更多终端用户开放前，需要把当前共享后台密钥换成真正的用户身份验证与任务所属关系。
