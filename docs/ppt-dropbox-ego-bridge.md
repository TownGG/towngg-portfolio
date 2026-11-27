# TGG PPT：Dropbox → DeepSeek Harness → Ego → ChatGPT G

## 第一版目标

官网原有流程 **R2 存任务 → Gmail 发送完整任务邮件 → 人工 G** 保持不变。新增一条可选自动唤醒通路：

1. 官网把一条 `ppt.task.created` 事件写入 Dropbox 的 `/queue/PPT-YYYYMMDD-XXXXXXXXXXXX.json`。
2. Windows Dropbox 客户端同步文件到本机。
3. 本机 Node 监听程序发现未处理任务，调用 `dsh --profile headless`，将固定安全指令交给 `ego-browser`。
4. Harness **为每个任务新建一个 ChatGPT 项目会话**，在新会话中只发送一次大写 `G`，并确认用户消息已出现在网页。
5. ChatGPT 按既有 G 工作流检查 Gmail、接单、逐页设计并回传最终 PPTX；官网完成时写入 `/done/同一任务ID.json`。

每个任务独立打开新会话。第一版最多并行 3 个唤醒流程，可以用 `MaxParallel` 配置。**本版暂不增加服务端接单锁**。如果有重复接单风险，后续再加服务端原子保护。

此通道只有“唤醒”职责：不会把任务提示词、原稿下载链接、邮箱、管理员密码、任务专属回传凭证放进 Dropbox 文件或交给本机 DeepSeek。

## 1. 创建 Dropbox App

在 [Dropbox App Console](https://www.dropbox.com/developers/apps) 新建 Scoped App：

- 访问范围选择 **App folder**，应用名建议 `TownGG-PPT-Bridge`。
- 授权范围至少启用 `files.content.write`（用于建立 `queue` / `done` 文件夹及上传通知文件）。
- 首次授权时申请 `token_access_type=offline`，获取长期可复用的 refresh token；不要在聊天中发送 token。
- 将 App key、App secret、refresh token 设置到**现有 Cloudflare PPT Worker**的三个 Secret：

  - `PPT_DROPBOX_APP_KEY`
  - `PPT_DROPBOX_APP_SECRET`
  - `PPT_DROPBOX_REFRESH_TOKEN`

Dropbox 官方资料：[OAuth Guide](https://developers.dropbox.com/oauth-guide)、[HTTP API](https://www.dropbox.com/developers/documentation/http/documentation)。

三项 Secret 缺任意一项，Worker 就跳过 Dropbox，原有 Gmail 和人工 G 不受影响。Dropbox 发送失败也不会影响官网提交任务的成功返回。

**注意：仅在 GitHub 提交 Worker 源码不会自动更新已运行的 Cloudflare Worker**，还需要通过当前项目原来的 Cloudflare 部署流程发布 `workers/admin-upload-worker.js`。

## 2. Windows 本机准备

1. 安装并登录 Dropbox 桌面客户端，确保 App Folder 已同步到电脑；例如 `C:\Users\<用户名>\Dropbox\Apps\TownGG-PPT-Bridge`。实际路径以 Dropbox 客户端显示为准。
2. 本机已经安装 DeepSeek Harness CLI（执行 `dsh --version` 可验证）和 ego(lite)。
3. 在 Ego 的 Agent Space 中手动登录 ChatGPT 并完成必要验证；本脚本**不会自动输入密码，也不会绕过验证码**。
4. 从浏览器复制你希望用于新建聊天的 **ChatGPT「UI设计」项目链接**。不要填写某一个已有聊天的链接；Harness 会在项目下新建聊天。

Ego 官方说明：[DeepSeek Harness 与 ego(lite)](https://www.egolite.ai/document/zh/docs/deepseek-harness)。官方文档中的 `headless` 是 Harness 无交互终端模式，Ego 浏览器仍可能弹出窗口。该模式如果需要更高的执行权限，必须由用户在本机评估后显式配置；本桥接脚本**不会擅自启用 `danger-full-access`**。

## 3. 先干跑测试

在项目根目录打开 PowerShell，替换下面的 Dropbox 路径和 ChatGPT 项目 URL：

```powershell
.\tools\start-ppt-dropbox-bridge.ps1 `
  -DropboxFolder 'C:\Users\<用户名>\Dropbox\Apps\TownGG-PPT-Bridge' `
  -ProjectUrl 'https://chatgpt.com/你的UI设计项目地址' `
  -Once
```

不带 `-Live` 时只会打印哪些任务将被唤醒，不会启动 dsh，也不会向 ChatGPT 发送 G。为了测试通知通路，可先从官网创建一笔专用 PPT 测试任务，再观察 Dropbox `/queue/` 中是否出现同名 JSON 文件。

## 4. 正式启动本机监听

```powershell
.\tools\start-ppt-dropbox-bridge.ps1 `
  -DropboxFolder 'C:\Users\<用户名>\Dropbox\Apps\TownGG-PPT-Bridge' `
  -ProjectUrl 'https://chatgpt.com/你的UI设计项目地址' `
  -MaxParallel 3 `
  -Live
```

保持 PowerShell 窗口和 Dropbox 客户端运行。以后可由你在 Windows 任务计划程序里设置登录后启动；首轮联调阶段建议先手动启动，便于观察。

每次唤醒前写入本机日志状态：

- `launching`：已准备调用 Harness。
- `sent`：Harness 返回成功，并称已在新的 ChatGPT 会话观察到 G。
- `failed`：Harness 失败或未确认 G；不自动重发，避免重复触发。
- `completed`：Dropbox `/done/` 收到官网完成通知。
- `stale`：通知超过默认 72 小时，停止自动唤醒。

本机状态存放在 `%LOCALAPPDATA%\TownGG-PPT-Bridge\journal.json`，不会同步给 Dropbox。失败后人工发 G 始终可用；如要明确重试某条失败记录，可以启动时传 `-RetryTaskId 'PPT-...' -Live`。重试必须由人主动执行。

## 5. 并发与安全边界

- 每条 JSON 仅携带 `{schema,event,taskId,at}`，严格校验任务 ID 和事件类型，不把 JSON 内容拼进 Shell 指令。
- Harness 提示词固定。每个任务在 ChatGPT 项目中新建一条会话，**只发送单独一个 G**；编号仅留在本机日志。
- 本机通过 `spawn` 传参调用 `dsh`，不经 Shell 拼接执行，降低指令注入风险。
- 任务被标为 `sent` 后本机不会自动再次发送 G；官网完成信号只用于记录状态。
- 同时启动多个独立会话不等于网站已具备并发原子接单保证；第一版优先验证完整链路。
- UI 自动化受网页登录状态、验证码、账号权限和浏览器变更影响。若卡住，停止当前唤醒，使用人工 G 兜底。

## 6. 开发测试

```bash
node --test workers/admin-upload-worker.dropbox.test.mjs tools/ppt-dropbox-watcher.test.mjs
node --test workers/admin-upload-worker.agent.test.mjs workers/admin-upload-worker.r2.test.mjs
```

测试仅模拟 Dropbox API 和本地文件监听，不代表已在唐总的 Windows / Dropbox / Ego / ChatGPT 真实环境跑通。
