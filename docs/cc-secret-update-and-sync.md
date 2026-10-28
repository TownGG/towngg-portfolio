# Bethesda Secret 更新后立即同步 CC

GitHub Actions **没有**“仓库 Secret 在网页上被修改”的原生事件。直接在 GitHub **Settings → Secrets and variables → Actions** 编辑 `BETHESDA_STORAGE_STATE` **不会自动触发**工作流。

## 推荐更新方式：一次操作完成 Secret 更新与 CC 抓取触发

在已安装 GitHub CLI（`gh auth login`）和 Node.js 的本地电脑，先确保新的登录态 JSON 保存在 **本地、不提交 Git** 的 `.auth/bethesda-storage.json`。

```powershell
npm run cc:secret:publish
```

也可以指定其他本地文件：

```powershell
node scripts/update-bethesda-secret-and-sync.mjs "D:\\path\\to\\bethesda-storage.json"
```

命令顺序：

1. 校验 JSON 格式以及必须的 Bethesda 登录 Cookie 名称；
2. 经标准输入传送完整 JSON 给 `gh secret set BETHESDA_STORAGE_STATE`，不把 Secret 值输出到终端，也不加入仓库；
3. 更新成功后，立即发出 `repository_dispatch` 事件 `bethesda-storage-state-updated`，启动 **Sync Bethesda Creations**。

只有 Secret 更新成功才会触发；如触发失败，Secret 仍然保持新值，并明确报错。

**原有每 30 分钟的外部 `workflow_dispatch` 触发保持不变。** 此处没有添加第二个 `schedule`，避免重复运行。工作流使用现有并发队列，因此“立即触发”可能会排队等待上一轮抓取完成。

## 已有自动 Cookie 刷新命令

`npm run cc:secret:auto` 使用现有的本地浏览器刷新、验证、上传与回滚逻辑。现在**成功上传并验证新 Secret 后也会立即发起一次 CC 抓取**，可使用 `-- --skip-sync` 关闭该额外触发。

如果已经通过 GitHub 网页直接修改 Secret，可以手动点一次 **Actions → Sync Bethesda Creations → Run workflow**；网页修改本身无法自动检测到。也可使用上述一体化命令重新上传同一份本地 JSON 并触发。

不要在 issue、日志、聊天或提交中粘贴完整登录态、Cookie 或 Token。
