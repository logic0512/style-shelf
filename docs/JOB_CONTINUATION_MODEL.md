# 持久 Job 与多轮生成

Style Shelf 将一次独立创作定义为一个本地 Job，会话中的每次生成或修改定义为一个 Turn。

```text
Job A
├── Turn 1 → result-01.png
├── Turn 2 → result-02.png
└── Turn 3 → result-03.png
```

- “运行这个 Skill”在没有当前 Job 时创建新 Job。
- “继续修改当前任务”调用 `/api/jobs/:id/continue`，追加 Turn，不创建新 Job。
- 续接时必须填写“本轮修改提示”；这段 Prompt 会写入新 Turn 的 payload，并与当前成果一起交给同一个 Codex Thread。
- 每个 Turn 保存自己的 payload、输入文件引用、父结果和 Codex turn id。
- 续接 Turn 默认继承上一轮输入引用，同时允许追加新的图片；因此离开页面后仍能继续依赖原图的 Skill。
- 每个结果文件追加到同一 Job 的 `artifacts`，旧版本不会被覆盖。
- Runner 首轮调用 `thread/start`，后续 Turn 使用已保存的 `threadId` 调用 `thread/resume`，再发送新的 `turn/start`。
- 后台 Job 完成时只更新任务历史；只有当前工作区仍选中该 Job，才自动显示最新结果。
- “新建独立任务”只清空当前页面选择，不删除 Job、Turn 或结果文件。

旧 Job 没有 `turns` 或产物版本字段时仍可读取；新一轮续接会补充 Turn 记录。工作台移除 Skill、结果图库删除结果，仍不删除本地 Codex Skill 或 Job 原文件。
