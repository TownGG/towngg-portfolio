# CC / Nexus 数据同步：安全合并与提交重试

工作流 `sync-creations.yml` 和 `update-nexus-data.yml` 使用 `scripts/publish-sync-data.mjs`，替代原来的 `git commit && git pull --rebase && git push`。解决工作流以旧提交启动、抓取期间 main 已发生更新而造成的 rebase 冲突。

## 提交流程

1. 抓取与历史快照生成仍在原来的 runner 里完成。
2. 发布器保存本次抓取的 5（CC）或 4（Nexus）个数据文件到内存；从运行开始的 checkout HEAD 读取共同基线。
3. 获取最新 `origin/main`，在**独立临时 Git worktree** 中执行三方合并，只修改对应数据文件；不会覆盖原始抓取工作目录。
4. 历史 CSV 根据字段主键合并：CC 累计快照按 `timestamp`，CC 每日作品记录按 `date + title`，Nexus 按 `date + platform + mod_id`。相同主键的累计数值取较大值，不同时间的快照全部保留。
5. `site-data.js` 仅替换当前来源的顶层数组：CC `creations`、Nexus `mods`；合并每条作品的数值，其他模块沿用最新主分支。
6. `nexus-latest.json` 按 `mod_id` 合并，`nexus-mods.json` 按 `mod_id` 去重；`site-version.json` 保留较新的更新时间。
7. 生成基于**最新远端 HEAD** 的新提交并正常 `git push origin HEAD:main`，**不强推、不覆盖主分支**。
8. 如果推送过程中 main 又前进，则重新读取远端、重建合并提交，最多重试 5 次。若不是并发更新导致的 push 错误立即报错；重试耗尽也明确失败。

工作流会先执行：

```bash
node scripts/publish-sync-data.mjs --self-test
```

成功后才执行 `node scripts/publish-sync-data.mjs cc` 或 `node scripts/publish-sync-data.mjs nexus`。

注意：此修复针对 **Git 提交冲突**，不能保证上游 Bethesda/Nexus 抓取永不失败，也不能代替 GitHub 定时触发器。它尽量保留已有历史数据，遇到未知 CSV schema 会安全退出而不是盲目覆盖。现有 30 分钟定时、外部补触发、Secret 更新触发等保持不变。
