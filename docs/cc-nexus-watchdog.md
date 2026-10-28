# CC 与 Nexus 每半小时巡检、漏跑补触发

新增独立工作流 `.github/workflows/watch-cc-nexus-triggers.yml`：
- 北京时间 **每小时 :25、:55** 尝试启动，分别检查 CC 与 Nexus 的 GitHub Actions 运行记录。
- 如果最近 40 分钟内有触发或重跑，或目标任务正在运行／排队，跳过避免重复。
- 如果超过 40 分钟没有触发，调用 GitHub Actions `workflow_dispatch` 接口，为缺失的工作流补发一次运行请求。
- 单个工作流异常不影响另一个的检查；运行结果记录在 GitHub Actions 日志和 Summary。
- 支持 `workflow_dispatch` 手动巡检，`dry_run` 可只检查不补发。
- 仅用 `github.token`（`actions: write`），不读取或输出 Bethesda / Nexus Secret。

现有外部每 30 分钟触发、CC 与 Nexus 的 GitHub 原生 :15/:45 定时兜底、更新 Secret 后触发 CC 均保留。巡检不修改抓取代码或数据。

**限制**：GitHub `schedule` 可能延迟或丢失，巡检也依赖此机制，不能保证准时、也无法独立应对 GitHub 全局定时调度异常。ChatGPT 不能在聊天中每 30 分钟自行唤醒；由 GitHub 按上述规则自动补跑。
