# Style Shelf 0.2.3

- 纯工作台：移除全部内置 Skill、Prompt、样例图片和自动安装入口，首次启动为空目录。
- 保留用户导入、新建 Prompt、运行任务、图片归档和封面控制。
- 已有用户数据保留，旧 Git 历史和 Release 未删除。
- 防止重复 Job 覆盖旧结果，并在单条 Job 记录损坏时继续启动其余数据。
- 补齐必填输入、Skill 源文件与远程安装器检查，提供可操作的错误提示。
- Prompt 未保存时提醒，单卡片不再横向撑满；封面的完整展示与裁切设置继续保留。

- Workbench only: no bundled Skills, Prompts, sample assets, or automatic installation. New catalogs start empty.
- User imports, Prompt creation, jobs, image storage, and cover controls remain available.
- Existing user data, older Git history, and older release assets are preserved.
- Duplicate Jobs can no longer overwrite old results, and one damaged Job record no longer blocks startup.
- Required inputs, Skill source files, and the remote installer are validated with actionable errors.
- Unsaved Prompt edits are protected, and a single style card no longer stretches across the shelf.
