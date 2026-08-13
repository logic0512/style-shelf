# Style Shelf 项目定位与对抗性审查说明

本文档供另一个模型对当前项目做独立审查、找问题和清理无必要代码。审查目标是判断“工作台是否可靠”，不是重新设计产品，也不是重新验证第三方 Skill 的审美质量。

## 1. 项目定位

Style Shelf 是一个本地优先的桌面端 Web 工作台。

它不是：

- Codex 聊天页面的复制品；
- 通用 AI Dashboard；
- 仅仅把几个图片生成 API 拼在一起的工具集合；
- 需要用户记住 Skill 名称的命令行入口。

它是：

> 一个个人“风格滤镜仓库”：用户把喜欢的图片风格 Skill 加入工作台，通过风格卡片进入动态生成页面；浏览器负责交互，本地 Node.js 服务负责文件、任务和结果，Codex 作为后台执行引擎。

Skill 本身就是用户收藏的风格能力。Skill 被加入工作台，即代表它已被收录，不再额外提供“收藏”状态。

## 2. 当前访问入口

本地服务当前使用：

- Web 工作台：<http://127.0.0.1:4173/>
- 本地 API 健康检查：<http://127.0.0.1:4317/api/health>
- Job 列表：<http://127.0.0.1:4317/api/jobs>
- 项目目录：仓库根目录
- 产品开发计划：[docs/EXECUTION_PLAN.md](./EXECUTION_PLAN.md)
- 用户安装说明：[README.md](../README.md)

标准启动方式：

```bash
npm install
npm run setup
npm run doctor
npm run start
```

端口可由 `STYLE_SHELF_PORT` 和 `STYLE_SHELF_FRONTEND_PORT` 覆盖。服务默认只监听 `127.0.0.1`，不要把它默认改成局域网暴露。

## 3. 已确定的信息架构

一级入口只有两个：

1. **风格仓库**：查看已经加入工作台的 Skill 风格卡片。
2. **结果图库**：查看已经保存的生成结果。

生成工作区不是第三个固定导航入口，而是从风格卡片进入。设置与诊断是低频入口，Skill Workshop 是添加/导入/移出工作台的管理入口。

## 4. 已实现能力

### 4.1 风格仓库

- 展示 8 张默认风格卡；其中 7 个 Skill 随 App 分发，`heytea-doodle-poster` 仅提供来源与安装提示。当前清单以 `public/skill-catalog.json` 和 `bundled-skills/manifest.json` 为准。
- 每个 Skill 是一张独立风格卡片。
- 卡片输入要求来自 Skill 的 `inputSchema`，不是全局固定表单。
- 卡片可以进入图片转绘、文字生图、图片+文字混合或引导式生成。

### 4.2 动态生成工作区

根据 Skill 的真实输入要求渲染：

- 图片上传；
- 文本/想法输入；
- 多参考图数量；
- 画幅选择；
- 选项输入；
- 引导式问题卡和回答后继续同一 Job。

生成完成后，用户可以对结果选择 `4:3` 或 `3:4` 封面比例并拖动取景。封面只影响结果图库展示，不裁切、不覆盖原始生成图片。

### 4.3 后台 Job 与 Codex Runner

本地 Node 服务会：

1. 创建独立 Job；
2. 把用户上传图片复制到 Job 的 `input/`；
3. 找到对应 Codex Skill 的 `SKILL.md`；
4. 启动 Codex App Server Runner；
5. 接收图片输出并复制到 Job 的 `output/`；
6. 保存状态、输入、输出、Runner 和 Thread/Turn 元数据。

任务状态包括：

- `queued` 排队中
- `running` 运行中
- `waiting_input` 等待回答
- `completed` 已完成
- `failed` 失败
- `cancelled` 已取消

当前支持取消任务、失败重试和浏览器刷新后的任务恢复。已完成或已取消 Job 不允许通过 `/run` 被重新复活。

### 4.4 结果图库

- 默认按生成时间倒序。
- 支持按 Skill 分类筛选。
- 使用受控瀑布流展示封面。
- 只展示 `4:3` / `3:4` 两种封面比例。
- 支持查看、下载、再次生成。
- 再次生成会尝试恢复原 Job 的文字、选项、画幅和输入图片。

明确不做：搜索、结果收藏、独立详情页、独立日志导出、自动磁盘清理。

### 4.5 Skill Workshop

- 输入 GitHub 仓库/Skill 地址或已存在的 Skill 名称，由本地服务安装。
- 检索本机 Codex Skill 目录，读取 `SKILL.md` 后选择导入。
- 自动从 `SKILL.md` 推导基本名称、说明和输入类型。
- 更新工作台目录记录。
- “移出工作台”只标记工作台调用目录中的记录，不删除 `CODEX_HOME/skills` 原始 Skill。
- 可从工作台回收记录恢复。

## 5. 已验证事实

截至本报告生成时，已完成：

- `npm run doctor`：通过；
- `npm run build`：通过；
- Web `http://127.0.0.1:4173/`：返回 `200`；
- API `/api/health`：返回 `ok: true`；
- Job 创建、取消和状态读取：通过；
- 非法 Origin：返回 `403`；
- 伪造图片上传：返回 `400`；
- 路径穿越读取：返回 `404`；
- 已取消 Job 重跑：返回 `409`；
- 已完成真实 Codex Runner 回归：单图、文字、引导式任务均有本地 Job 输出记录。

已知真实测试记录示例：

- `.styleshelf-data/jobs/real-gc-20260807-1786070560634/`
- `.styleshelf-data/jobs/real-scene-distill-20260807-1786070720235/`

## 6. 当前实现边界

首版真正实现的是 Codex Runner。WorkBuddy、Imagen、Flux、ComfyUI 等目前只是未来替换方向，不是换一个环境变量就能自动启用的现成功能。

未来替换时应保持前端、Job、结果索引和封面数据不变，只替换执行器/Provider 适配部分。

不要把模型 API 密钥写入仓库、Job、日志、前端状态或审查报告。

## 7. 对抗性审查任务

请先阅读本文件、`AGENTS.md`、`README.md` 和 `docs/EXECUTION_PLAN.md`，再检查运行时代码。审查应优先回答：

### A. 产品一致性

- 是否仍然只有“风格仓库 / 结果图库”两个一级入口？
- 是否误把结果图库做成搜索、收藏或详情产品？
- 是否把所有 Skill 强行套进一个固定输入表单？
- 封面裁切是否只改展示元数据，是否会误删/覆盖原图？
- Skill 移出工作台是否错误删除了本机原始 Skill？

### B. Job 与 Runner 正确性

- 重复点击是否会启动多个 Runner？
- 取消发生在 Runner 初始化、RPC 请求、Turn 运行和结果接纳各阶段时，最终状态是否都为 `cancelled`？
- 失败重试是否复用正确的 Job 输入，是否可能覆盖历史输出？
- 服务重启后 `running` Job 的处理是否符合产品约束？
- completed/cancelled Job 是否还能被接口复活？
- 没有有效图片输出时，是否会错误进入结果图库？

### C. 安全与数据完整性

- 是否仍只监听 localhost？
- Origin、Job ID、文件名、输入文件类型和输出文件路径是否严格校验？
- GitHub Skill 安装输入是否存在命令注入、任意路径或任意仓库问题？
- 结果 API 是否可能接受伪造 metadata、越界 cover position 或超大 payload？
- 原图、Job 输出、结果索引之间是否存在错误覆盖或孤儿文件？

### D. 无必要代码清理

重点核对而不是直接删除：

- `src/` 与 `src-v2/` 是否存在未使用的旧实现；先确认 `index.html` / `v2.html` 和 Vite 入口，再决定是否清理。
- `dist/`、`.styleshelf-data/`、`.workbuddy/screenshots/` 是否属于生成物或本地记录，不应误提交或误删。
- `server/mock.mjs` 名称是否已经与真实本地 API 职责不一致。
- `docs/EXECUTION_PLAN.md` 是否存在已经过时的 WebSocket、TypeScript、日志中心等描述；不要把文档目标误判成已实现代码。
- `src-v2` 中是否有死状态、死 CSS、重复 helper 或只服务旧设计的组件。
- `package.json` 中是否有未使用依赖；不要为未来 WorkBuddy/Imagen 预建空适配层。
- 端口、API 路径和状态名称是否在前后端重复定义且可能漂移。

### E. 跨平台

- 路径是否统一使用 Node `path.join` 等跨平台 API？
- 启动/终止进程是否依赖 macOS 专用命令？
- Windows 下是否正确使用 `npm.cmd`、路径和进程信号？
- 是否错误假设 Codex Runtime 固定安装在某个 macOS 路径？

## 8. 审查规则

- 先给出“事实 / 风险 / 推断 / 未知”四类结论。
- 先修复会造成数据丢失、错误成功、越权读取或任务状态错误的问题。
- 清理前必须确认代码路径未被当前入口使用。
- 不要重新设计视觉风格，不要添加搜索、收藏、独立详情页或多 Provider 空架构。
- 不要删除 `.styleshelf-data`、用户原始 Skill、历史 Job 或结果文件。
- 修改后至少运行：

```bash
npm run doctor
npm run build
git diff --check
```

- 如果发现需要用户决定的许可证、模型权限、Windows 实机或外部 API，不要擅自假设；列为发布门槛。

## 9. 审查输出格式

请输出：

1. 阻塞问题（按严重程度排序，附文件和行号）；
2. 可修复问题；
3. 可以删除的无必要代码；
4. 不应删除的现有能力；
5. 已验证命令与结果；
6. 仍需用户或真实 Windows 环境确认的事项。

不要只说“代码看起来没问题”，也不要把未运行的路径描述成已验证。
