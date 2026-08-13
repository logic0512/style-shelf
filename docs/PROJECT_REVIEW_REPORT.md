# Style Shelf 对抗性审查报告

> 审查时间：2026-08-07
> 审查范围：仓库内运行时代码与文档（不含 `node_modules`、`dist`、`.styleshelf-data`、`.workbuddy/`）
> 审查目标：判断工作台是否可靠；不重新设计视觉，不预建未来适配层
> 结论分级：**事实** / **风险** / **推断** / **未知**

---

## 0. 已运行的验证命令与结果

| 检查 | 命令 | 结果 |
|---|---|---|
| API 健康 | `curl http://127.0.0.1:4317/api/health` | `200`，`{ok:true, mode:"phase-2"}` |
| Web 首页 | `curl http://127.0.0.1:4173/` | `200` |
| v2 入口 | `curl http://127.0.0.1:4173/v2.html` | `200` |
| 非法 Origin | `curl -H 'Origin: http://evil.example.com' /api/health` | `403 origin_not_allowed` |
| 端口不一致 Origin | `curl -H 'Origin: http://127.0.0.1:9999' /api/health` | `403` |
| 无 Origin（curl 本机） | `curl /api/health` | `200`（行为符合本地工具链） |
| Job ID 路径穿越 | `curl /api/jobs/..%2F..%2Fetc/passwd` | `404` |
| 非法 Job ID（`.`） | `curl /api/jobs/%2E%2E` | `400` |
| 含斜杠 Job ID | `curl /api/jobs/foo%2Fbar` | `400` |
| 伪造图片上传（文本冒充 jpeg） | `curl -X PUT ... input?filename=test.jpg` | `400 image_input_required` |
| 文本 MIME 上传 | `Content-Type: text/plain` | `400 image_input_required` |
| 输出文件名穿越 | `curl /api/jobs/<id>/output/..%2Fjob.json` | `404 artifact_not_found` |
| 复活已完成 Job | `curl -X POST /api/jobs/<completed>/run` | `409 job_not_runnable` |
| 复活已取消 Job | `curl -X POST /api/jobs/<cancelled>/run` | `409 job_not_runnable` |

> 说明：仓库 `package.json` 的 `npm run build` 会因沙箱内 `safe-delete` shim 清空 `dist/` 超时失败（环境问题，非代码缺陷）；用 `npx vite build --outDir /tmp/...` 验证产物本身正常。

---

## 1. 阻塞问题（必须先修，按严重程度排序）

### 1.1 [风险] 服务重启后 `queued` 状态的 Job 永远不会被自动恢复

- 文件：`server/jobs.mjs:96-103`
- 事实：`markInterruptedJobs` 只处理 `state === 'running'`，把 `queued` 留在原地。`server/codex-runner.mjs:196` 的 `startJobRun` 也没有监听 startup 事件去枚举 `queued`。前端在用户重新打开页面时 (`src-v2/main.jsx:198-202`) 才通过 `loadJobs()` 重启这些 Job。
- 风险：用户创建 Job 后立即关闭浏览器且不再回到页面 → Job 永远停在 `queued`，磁盘目录保留 `input/` 但 Job 永不复活，也不会进入失败态。
- 修复方向：`markInterruptedJobs` 内增加 `state === 'queued'` 的处理（重置为 `failed` 或重新加入启动恢复队列），或在 `start.mjs` 启动 `mock.mjs` 后通过 stdin 触发一次恢复扫描。

### 1.2 [风险] Codex runtime 在初始化阶段意外退出，Job 卡在 `running` 最长 15 分钟

- 文件：`server/codex-runner.mjs:159-161`
- 事实：`child.on('close')` 的回调只有 `turnStarted` 为真才调用 `fail`。初始化阶段（`initialize` / `thread/start` / `turn/start` 任一步）失败时，`turnStarted` 可能仍是 `false`，回调直接吞掉关闭事件。15 分钟超时才会失败。
- 风险：本地 Codex 不可用、版本不兼容、被 macOS Gatekeeper 拦截等场景下，UI 显示"正在运行"但实际早已死锁，Job 长时间得不到反馈。
- 修复方向：把 `if (turnStarted && !completed && !cancelled) fail(...)` 改成 `if (!completed && !cancelled) fail(new Error('codex_runtime_closed'))`，关闭事件一律触发失败。

### 1.3 [风险] Skill 重新安装会清零 `works`（使用次数）

- 文件：`server/skill-installer.mjs:67-85`、`server/skill-installer.mjs:128-135`
- 事实：`readManifest` 始终把 `works: 0` 写进 manifest；`installSkill` 在 `existing && !parsed.url` 分支直接返回 `existing`，但在 `existing && parsed.url` 分支调用 `updateSkill(skillId, manifest)`，整个 manifest 被覆盖，`works` 回到 0。
- 风险：用户工作台统计失真；已删除的 Skill 不受影响（`restoreSkill` 单独走路径）。
- 修复方向：`updateSkill` 合并时保留旧 `works`，或在 `readManifest` 里把 `works` 字段去掉，由 `installSkill` 在 update 路径显式 set。

### 1.4 [风险] GitHub 路径未做 `..` 校验，直接传给安装器

- 文件：`server/skill-installer.mjs:42-49`
- 事实：`path = parts.slice(4).join('/')`。URL 为 `https://github.com/owner/repo/tree/main/../../etc` 时，`path = '../../etc'`，随即作为参数传给 `install-skill-from-github.py --path`。本地 Python 脚本如果没做强校验，等于允许任意文件系统路径。
- 风险：依赖下游 Python 脚本的安全设计；如果脚本有 bug 或被替换，会成为路径穿越入口。
- 修复方向：在 `parseSource` 中追加 `if (path.split('/').includes('..')) throw new Error('invalid_github_path')`；同时约束 path 段数与字符集。

### 1.5 [风险] `PUT /api/results` 是无差别覆盖

- 文件：`server/mock.mjs:246-254`
- 事实：仅校验 `validResults(payload?.results)` 通过即写入；无幂等键、无 last-write-wins 提示。前端只在首次访问无结果时调用 (`src-v2/main.jsx:179`)，但任何本地进程（包括误调的浏览器扩展、调试脚本）都能把整张结果图库替换掉。
- 风险：单点误操作即可清空结果索引，磁盘图片文件还在，但前端再也看不到。
- 修复方向：要么改成 `PATCH` 仅追加 / 更新单条，要么要求请求带确认 token，或者只允许 `POST /api/results` 单条写入并禁用 `PUT` 替换。当前 `POST` 路径 (`server/mock.mjs:256-265`) 已经能完成"添加/覆盖单条"，`PUT` 多余。

### 1.6 [风险] 已完成 Job 在重启后的窗口期内可能被自动复活

- 文件：`server/jobs.mjs:96-103`、`server/codex-runner.mjs:207`
- 事实：`markInterruptedJobs` 把 `running` 改成 `failed`，但紧接着前端 `loadJobs` + `jobs.filter((job) => job.state === 'queued').forEach((job) => runJob(...))` (src-v2/main.jsx:198-202) 不会复活 `failed`。`runJob` 对 `failed` 是允许的（`startJobRun` 第 207 行）。这本身没问题；但 `markInterruptedJobs` 不处理 `queued`，问题在 1.1。
- 风险：本条单独不构成新风险；但叠加 1.1 后形成"用户以为完成了的 Job 实际可能从未启动"。
- 修复方向：随 1.1 一起处理。

---

## 2. 可修复问题（影响正确性但不阻塞核心）

### 2.1 [风险] `monitorJob` 的网络抖动会把任务直接判失败

- 文件：`src-v2/main.jsx:312-316`
- 事实：`loadJob` 抛错（瞬时离线）会进入 catch 分支并把 task 标记为 `failed` + `message: error.message`，但服务端的 Job 实际仍可能是 `running`/`waiting_input`。
- 风险：一次 API 抖动 = 前端误标失败 → 用户立即在右栏看到"重试"按钮，可能点掉真正的运行。
- 修复方向：网络错误（`fetch` / `TypeError`）只标记 `storageState = 'offline'`，不修改 task 状态；只在确认 `job.state` 为终止态时才更新 task。

### 2.2 [风险] Skill 重新安装的 `theme` 强制为 `'gather'`

- 文件：`server/skill-installer.mjs:81`
- 事实：所有自动导入的 Skill `theme` 都是 `gather`，导致四张已有卡片之外的新卡视觉都长一个样，违背设计交接"每张卡独立视觉身份"的原则。
- 修复方向：`readManifest` 根据 Skill 内容关键字或 hash 给 `theme` 一个分散的默认（photo / scene / poster / gather 循环），或保留中性灰风格块。

### 2.3 [风险] `name` 字段在导入时被存为原始 Skill 文件名

- 文件：`server/skill-installer.mjs:67`
- 事实：`name: content.match(/^name:\s*["']?([^"'\n]+)["']?/m)?.[1]?.trim() || skillId`。当前 `skills.json` 里 `ian-xiaohei-illustrations` 的 `name` 直接是 Skill 文件夹名（`ian-xiaohei-illustrations`），不是 `Ian Xiaohei Illustrations` 这种可读名（虽然 english 字段已规范化）。用户可见的卡片名因此很难读。
- 修复方向：若 YAML front matter 没有 `name`，使用 `english` 字段值替代，而不是文件夹 ID。

### 2.4 [推断] `validResult` 没有校验 `image` 字段形态

- 文件：`server/mock.mjs:22-30`
- 事实：`image` 字段未被检查。本地进程可 PUT 一条 `image: 'file:///etc/passwd'` 的结果，前端会尝试 `fetch`，受限于浏览器沙箱但仍能写入索引。
- 修复方向：`validResult` 追加 `image` 必须为 `http://127.0.0.1:...` 或 `/skill-assets/...` 或 `null`。

### 2.5 [推断] `coverRatio` / `coverPosition` 只校验结构，不与原图实际比例联动

- 文件：`server/mock.mjs:267-289`、`src-v2/main.jsx:611-619`
- 事实：用户可以保存 `4:3` 封面但原图是 `1:1`；拖动位置只是 UI 状态，无视觉提示告诉用户取景框越界。
- 风险：极轻（封面取景不会损坏原图）。
- 修复方向：可选改进。

### 2.6 [事实] `mock.mjs` 名字已脱离实际职责

- 文件：`server/mock.mjs`
- 事实：实际承载完整本地 API（Skill 注册、Job 编排、Codex Runner、Skill Workshop），已不是 mock。`package.json` 里 `start:mock` 仍是 legacy 入口，未被 `start` 调用。
- 修复方向：重命名为 `server/api.mjs`（或 `server/index.mjs`），同步更新 `scripts/start.mjs:6`。`start:mock` 脚本可移除。

### 2.7 [事实] `python3` 在 Windows 上不可用

- 文件：`server/skill-installer.mjs:16`
- 事实：`spawn('python3', ...)`；AGENTS.md 与 CONTRIBUTING.md 都承诺 macOS / Windows / Linux 跨平台。
- 风险：Windows 用户启动工作台后，任何 Skill 添加都失败（spawn ENOENT）。
- 修复方向：`spawn(process.platform === 'win32' ? 'python' : 'python3', ...)`，并在 `doctor.mjs` 里检查。

### 2.8 [风险] 长任务的 15 分钟硬超时

- 文件：`server/codex-runner.mjs:162`
- 事实：`setTimeout(() => fail(...), 15 * 60 * 1000)`；前端 `monitorJob` 也是 900 次 × 1s = 15 分钟（src-v2/main.jsx:291）。
- 风险：图片生成在 Codex 排队 + 实际生成时容易超过 15 分钟，长 Job 被静默判失败。
- 修复方向：把硬超时换成"无 stdout/stderr 活动 N 分钟则超时"（看 Codex runtime 实际是否还活着），或暴露给用户配置。

### 2.9 [推断] `payload.answers` 透传到 Codex prompt 的方式没考虑转义

- 文件：`server/codex-runner.mjs:108-113`
- 事实：`User answers: ${JSON.stringify(payload.answers || {})}` 直接插入 prompt 文本。
- 风险：极轻（Codex 是 LLM，结构化字段拼接造成的解释偏差最多是 prompt 注入）；但若 answers 含来自前端的不可信字符串，可能影响输出。
- 修复方向：把 answers 序列化成结构化块（如 markdown fenced），并对长度做上限。

---

## 3. 可以删除的无必要代码

### 3.1 [事实] `src/main.jsx` 与 `src/styles.css` 已是孤儿代码

- 事实：`index.html` 已改为引用 `/src-v2/main.jsx`；`v2.html` 也指向同一文件；全仓（除 `node_modules` / `dist` / `.styleshelf-data` / `.workbuddy`）grep `src/main.jsx` 与 `src/styles.css` 无任何引用。
- 处理建议：删除 `src/` 整个目录。两个 HTML 入口的构建行为需要保留 `vite.config.mjs` 当前两 input。

### 3.2 [事实] `v2.html` 与 `index.html` 现在指向同一脚本

- 事实：两个 HTML 都引 `/src-v2/main.jsx`；构建产物共用 `main-DgQZsPQP.js`。
- 处理建议：保留 `index.html` 作为唯一入口；`v2.html` + `vite.config.mjs` 的 `v2` input 可移除。如果担心外部已有 `/v2.html` 链接，应先在 README 里做一次公告再删除。

### 3.3 [事实] `package.json` 的 `start:mock` 脚本未使用

- 事实：`scripts/start.mjs` 直接 spawn `server/mock.mjs`，不依赖 npm script。
- 处理建议：移除 `start:mock` 脚本。

### 3.4 [推断] `src-v2/main.jsx` 中保留的占位卡片视觉代码

- 事实：原 v2 卡片有四种独立视觉（photo / poster / scene / gather），但当前实现里只剩 `visual-photo`（真实素材）和通用 `visual-placeholder-{theme}`（src-v2/main.jsx:115-134）。`visual-poster` / `visual-scene` / `visual-gather` 的旧 CSS 类名不再被 JSX 引用。
- 处理建议：在 `src-v2/styles.css` 中 grep `.visual-poster`, `.visual-scene`, `.visual-gather`, `.visual-photo .photo-sidebar`, `.poster-barcode`, `.scene-frame`, `.gather-grid`, `.gather-chips`, `.pending-tag` 等类名，删除未使用块。同时 `CardVisual` 中的 `<CardVisual skill={skill} />` 与 `CardVisual skill={skill} size="preview"` 调用方都应确认占位视觉与卡片视觉职责清晰。

### 3.5 [推断] `docs/EXECUTION_PLAN.md` 与 `docs/DESIGN_HANDOFF.md` 描述已部分过时

- 事实：`EXECUTION_PLAN.md` 提到 "WebSocket、TypeScript、日志中心" 等目标；当前实现用 HTTP + 轮询、纯 JSX、无日志中心。`DESIGN_HANDOFF.md` 提到的"页面偏工具后台+卡片列表"问题已在新前端解决，但它仍把"宽屏桌面三栏"列为待确认项。
- 处理建议：把 `EXECUTION_PLAN.md` 中"已实施"的章节标记为历史；`DESIGN_HANDOFF.md` 可转为短总结并归档到 `docs/archive/`。注意 `PROJECT_REVIEW_BRIEF.md` 是当前审查的依据，不应改。

### 3.6 [事实] `dist/` 是构建产物

- 事实：仓库根有 `dist/`（含 `index.html`, `v2.html`, `assets/main-*.{js,css}`, 公共资源镜像）。
- 处理建议：应加入 `.gitignore`。当前未确认 `.gitignore` 是否存在；如未存在，强烈建议补一份。

### 3.7 [事实] `.styleshelf-data/` 是本地数据

- 事实：包含 31 个 Job 目录、2 个索引文件、用户的真实 Codex 输出图片。
- 处理建议：必须加入 `.gitignore`；不要在审查报告里贴出 Job 内真实图片路径或文件大小，避免被记录到外部。`README.md` 和 `AGENTS.md` 已经要求本地路径仅作引用，不复述具体内容。

### 3.8 [推断] `.workbuddy/screenshots/` 残留

- 事实：之前我做 v2 设计验证时留下的截图目录。审查工作本身不应再写新截图进去。
- 处理建议：可保留，也可清理。建议在 `.gitignore` 里登记 `*.workbuddy/screenshots/`，避免误提交验证图。

### 3.9 [推断] `docs/PRIVACY.md` 内容与代码一致，但措辞可更具体

- 事实：文档声明的"cover cropping only changes the gallery presentation metadata" 与 `mock.mjs:267-289` 行为一致；"image inputs are copied" 与 `jobs.mjs:122-127` 行为一致。无功能冗余。
- 处理建议：保留；若增删行为需同步。

---

## 4. 不应删除的现有能力

1. **`server/mock.mjs` 的整套 HTTP 路由**：Skill 注册、Job CRUD、输入输出文件服务、cover 元数据、Skill Workshop、results 索引。这是当前唯一前端依赖。**不要拆分或移除**。
2. **`server/jobs.mjs` 的原子写入 + Job ID/filename/路径校验**：撤掉会让上传与结果读取立刻出安全/数据问题。
3. **`server/skills.mjs` 的 `deletedAt` 软删除**：`restoreSkill` 与 `deleteSkill` 共同构成工作台"移出 + 恢复"闭环。硬删除将违反 `AGENTS.md` 的"移出工作台不删除原始 Skill"。
4. **`server/codex-runner.mjs` 的 JSON-RPC 客户端**：`approve/decline`、`tool/requestUserInput` 的应答、turn/completed 解析、artifact 接纳是关键路径。
5. **`scripts/start.mjs` 跨平台 spawn**：`npm.cmd` 已按平台分流；`start:mock` 移除即可（见 3.3）。
6. **`src-v2/api.js` 与 `src-v2/main.jsx` 的真实链路**：与本地 API 完整对接，错误状态、storage state、monitorJob 轮询逻辑都是 Phase 2/3 的真实闭环。
7. **`public/skill-assets/`**：前端真实示例的来源，README 与 Phase 1 完成标准都引用。
8. **`public/skill-catalog.json`**：种子 catalog，前端 API 离线时的回退数据源。
9. **`docs/PROJECT_REVIEW_BRIEF.md` 与 `docs/PRIVACY.md`**：定位文档与隐私边界，是开源发布的依据。
10. **`vite.config.mjs`**：构建脚本同时产出 index 与 v2 入口；如按 3.2 删除 v2.html，应同步收敛。
11. **`AGENTS.md` / `CONTRIBUTING.md` / `README.md`**：开源协作的入口说明。

---

## 5. 仍需用户或 Windows / Linux 环境确认的事项

1. **Windows 实机**：`python3` → `python` 兼容性（§2.7）；`child.kill('SIGTERM')` 在 Windows 下是否真杀进程树；路径里空格、`C:\` 反斜杠在 `jobs.mjs:122-127` 的 `join` 行为正确性。
2. **Linux 实机**：默认 `~/.codex` 是否存在；`/Applications/...` 这两个 macOS 路径（`codex-runner.mjs:11-12`）在 Linux 上找不到 runtime 时是否优雅降级到 `codex`（已实现 `findRuntime` fallback）。
3. **长任务超时策略**（§2.8）：是否允许用户配置；默认 15 分钟是否过短。
4. **`works` 字段保留策略**（§1.3）：是否要进数据库（SQLite）或继续在 JSON 索引里维护。
5. **`PUT /api/results` 是否保留**：作为"清空 + 重置"逃生口，还是移除（§1.5）。
6. **GitHub 安装的脚本信任链**：是否接受 `openai/skills` 仓库的 `skills/.curated/<id>` 作为来源；是否要 GPG/签名校验。
7. **Codex Runtime 鉴权**：当前 `RUNTIME_CANDIDATES` 直接 `spawn`，依赖 macOS ChatGPT.app 已登录。如果用户用其他安装方式（Homebrew、源码），需要扩展路径列表。
8. **平台薄层与未来 WorkBuddy 适配**：现在不存在 `platform/` 目录也没有 `adapters/`，符合"不预建未来空架构"原则。后续若真要适配 WorkBuddy，再单独建模块。

---

## 6. 当前链路正确性速览（事实）

- **重复点击导致多个 Runner**：`codex-runner.mjs:197` 用 `activeRuns` + `startLocks` 双锁，并发重复 run 会直接返回同一份 job；不会启动第二个 Codex runtime。✓
- **取消在初始化 / RPC / Turn / 结果接纳 各阶段的最终状态**：cancelJobRun → control.cancel → fail('job_cancelled') → catch 分支（line 234-236）写 `state: 'cancelled'`。四个阶段都汇到这一处。✓
- **失败重试**：前端用 `runJob` 重发请求；服务端 `startJobRun:207` 允许从 `failed` / `queued` / `waiting_input` 进入。新 Job 的 input/不会被旧 artifacts 覆盖（saveJobArtifact 用 `artifacts.length + 1` 编号，旧文件保留）。✓（但 1.3 的 works 计数除外）
- **服务重启后 `running` Job 处理**：见 §1.1。
- **completed/cancelled Job 不能被 `/run` 复活**：已验证（409）。✓
- **没有有效图片输出时进入结果图库**：服务端 `codex-runner.mjs:227` 抛 `codex_no_image_artifact`；前端 `monitorJob:302-310` 也再校验 `job.artifacts?.[0]`。✓
- **只监听 localhost**：`server.listen(port, '127.0.0.1', ...)`（mock.mjs:304）。✓
- **Origin / Job ID / filename / MIME / 路径校验**：见 §0 已验证命令。✓
- **GitHub 输入命令注入**：argv 形式 spawn，不会被 shell 解释。但 §1.4 的路径校验仍需补。
- **结果元数据伪造 / 越界 cover position**：cover position 在 [0,100]、coverRatio 受限；image 字段未校验（§2.4）。
- **原图 / 输出 / 索引孤儿文件**：saveJobArtifact 先 stat + realpath + underRoot + hasImageSignature，再 copyFile 到 outputDir，原子写入 job.json；删除/重置 Job 不会动 output/。✓

---

## 7. 建议的修复优先级（最小动作集）

按最小代价获得最大可靠性排序：

1. **§1.2**：把 Codex 关闭事件无条件触发失败（1 行改动）。
2. **§1.1**：让 `markInterruptedJobs` 也处理 `queued`（约 5 行 + 注释）。
3. **§1.5**：禁用 `PUT /api/results`，或加确认头（1 行/几行）。
4. **§1.4**：在 `parseSource` 拦截 `..`（2 行）。
5. **§1.3**：updateSkill 时保留 `works`（约 5 行）。
6. **§2.7**：Windows python3 fallback（1 行）。
7. **§3.1**：删除孤儿 `src/` 目录。
8. **§3.6/§3.7**：补 `.gitignore` 覆盖 `dist/` 与 `.styleshelf-data/`。
9. **§2.1**：`monitorJob` 网络错误时不要把 task 标失败（4 行）。
10. **§3.2**：评估是否删除 `v2.html`（需用户对历史链接的影响做一次决定）。

> 完成 1–7 后，工作台核心可靠性（数据完整性、状态正确性、跨平台最小兼容）即达到首版可发布水平。