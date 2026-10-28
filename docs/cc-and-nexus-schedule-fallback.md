# CC 和 Nexus 每 30 分钟数据同步故障兜底

**2026-10-28 修复。** 原本 CC 与 Nexus 的每半小时抓取，依赖外部系统发起 GitHub Actions `workflow_dispatch`，这两个工作流本身都没有 `schedule`。2026-10-28 16:30（北京时间）以后这两种任务都停止了自动触发；18:36 手工重跑 CC 于 18:46 成功，说明此前的异常不只是 Cookie 问题。

现在新增 **GitHub 原生兜底**，不替换既有外部调度：

- 外部 `workflow_dispatch`：保持现状。
- GitHub `schedule`：每小时的 UTC :15、:45（即北京时间同分钟）运行。
- 原生兜底运行前的 `freshness-gate`，读取最近成功入库数据的 `updatedAt`。如果已有 20 分钟以内的新快照，跳过本轮；否则抓取。
  - CC：`assets/data/site-version.json`
  - Nexus：`assets/data/nexus-latest.json`
- CC 新增的 `repository_dispatch: bethesda-storage-state-updated`、两条工作流的手动触发，都不会被新鲜度检查跳过。

由于 GitHub `schedule` 本身可能延迟，以上为**故障兜底，不保证整点精确触发**。如果数据延迟，请检查 GitHub Actions 中的 `freshness-gate` 是否放行、实际抓取 job 是否成功，以及提交数据的时间。外部调度恢复后，最近数据新鲜的原生兜底运行会自动跳过，避免常态重复抓取。
