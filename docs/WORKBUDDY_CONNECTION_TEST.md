# WorkBuddy 连接测试说明 / WorkBuddy connection guide

[中文](#中文) · [English](#english)

## 中文

这份说明用于验证 WorkBuddy 能否在本机访问 Style Shelf 的仓库、图片目录和本地 API。Style Shelf 已提供 WorkBuddy 执行器适配；生图模型仍由 WorkBuddy 自己配置，Style Shelf 只保留接口预留和结果接纳链路，不保存模型密钥。

## 1. 测试前提

- macOS、Windows、Linux 任一系统，Node.js 20.19+ 或 22.12+。
- WorkBuddy/CodeBuddy 已安装，并且可以在终端启动本地 HTTP 服务。
- 如果只做本阶段连接检查，不需要配置生图模型；需要实际出图时，才在 WorkBuddy 中配置模型供应商、API 地址、API Key 和模型名。密钥只放在 WorkBuddy 的配置中，不要写入 Style Shelf 仓库、`.env`、Job 或结果 JSON。
- 当前机器上的 Codex Skill 目录可以没有这些内置 Skill；Style Shelf 的 `bootstrap` 会把仓库内 8 个“缺失的”随包 Skill 种入 `CODEX_HOME/skills`，不会覆盖已有 Skill。`heytea-doodle-poster` 是个人非商业版附带的维护者本地副本，保留作者来源和 `REDISTRIBUTION-NOTICE.md` 限制。

## 2. 安装并启动 Style Shelf

下面的 `curl` 地址和浏览器地址只适用于从源码启动的 Web 模式。桌面 App 会自动启动窗口，并为本地 API 选择空闲端口；不要在桌面版中假定端口是 `4317`，请使用 App 内的“诊断”面板查看当前连接状态。

在 WorkBuddy 可以访问的终端中执行：

```bash
git clone <Style-Shelf-GitHub-URL>
cd <Style-Shelf-GitHub-目录>
npm install
npm run bootstrap
npm run start
```

然后确认：

```bash
curl -fsS http://127.0.0.1:4317/api/health
curl -fsS http://127.0.0.1:4317/api/storage
```

预期结果：

- `/api/health` 返回 `ok: true`。
- `/api/storage` 返回 `Uploads` 和 `Generated` 两个用户可见目录。
- `npm run bootstrap` 输出 `Bundled Skills: N installed · M already present`，其中 `N + M = 8`。
- 浏览器可以打开 <http://127.0.0.1:4173>。`4317` 是源码模式的 API 端口，不是页面端口。

如果使用 Electron 开发模式，也可以执行：

```bash
npm run bootstrap -- --desktop
```

## 3. 启动 WorkBuddy 本地服务

按 WorkBuddy 当前版本的 CLI 启动方式运行。官方 HTTP API 文档给出的示例是：

```bash
codebuddy --serve --port 8080 --session-id styleshelf-test
```

然后检查：

```bash
curl -fsS http://127.0.0.1:8080/api/v1/health
```

记录启动日志中的认证密码。除健康检查等豁免接口外，WorkBuddy API 请求需要 `X-CodeBuddy-Request: 1`，受保护接口还需要 `Authorization: Bearer <密码>`。

## 4. 只读连接测试

让 WorkBuddy 在 Style Shelf 仓库目录执行下面的只读任务：

```text
你正在测试 Style Shelf 与 WorkBuddy 的本地连接。只读检查，不生成图片，不修改文件：
1. 读取仓库中的 bundled-skills/manifest.json；
2. 确认 bundled-skills/photo-abstract-editorial/SKILL.md 存在；
3. 请求 http://127.0.0.1:4317/api/health 和 /api/storage；
4. 返回仓库绝对路径、Style Shelf API 返回的 dataDir/libraryDir、8 个随包 Skill ID；
5. 不要输出任何 API Key、Cookie 或认证密码。
```

通过标准：WorkBuddy 能读到仓库和 Skill 文件，并能返回两个 Style Shelf API 的 JSON；失败时记录 HTTP 状态码、错误文本和 WorkBuddy 使用的工作目录。

## 5. 生图接口预留（本阶段不测试）

本阶段不要求用户提供生图模型 API，也不以真实出图作为连接验收条件。WorkBuddy 的本地服务连接成功后，Style Shelf 会显示“WorkBuddy 已连接”；诊断页会另外显示“需在 WorkBuddy 配置生图模型”。只有 WorkBuddy 自己完成模型配置后，运行 Skill 才具备真实生图条件。

下面的内容仅作为未来有模型 API 时的可选验证，不是当前安装完成条件。

准备一张测试图，例如 `/absolute/path/to/test.jpg`。不要使用隐私照片。让 WorkBuddy 执行：

```text
请在 Style Shelf 仓库中做一次受控链路测试：
1. 读取 bundled-skills/photo-abstract-editorial/SKILL.md；
2. 使用 /absolute/path/to/test.jpg 作为输入；
3. 使用你在 WorkBuddy 中配置的图像模型执行一次图片转绘；
4. 将原图副本放到 Style Shelf 的 Uploads/<test-job-id>/，将生成原图放到 Generated/<test-job-id>/；
5. 不删除、不覆盖仓库中已有文件；
6. 返回模型名、输入绝对路径、输出绝对路径、输出文件尺寸和 MIME 类型。
```

通过标准：

- WorkBuddy 能读取 Skill 的规则和本地图片；
- 生图 API 能实际返回图片，而不是只返回文字或任务计划；
- 结果落在 `Generated/<job-id>/`，原图仍在 `Uploads/<job-id>/`；
- 返回的文件可被 Style Shelf 的本地服务读取。

## 6. 启用 WorkBuddy 执行器（已实现）

Style Shelf 的执行层现在可以切换。默认是本地 Codex Runner；切换为 WorkBuddy 后，"运行这个 Skill"会通过 WorkBuddy 的 `/api/v1/runs` 派发任务，Job、Turn、产物、封面和图库协议保持不变。

在 `.env` 中配置（不要提交到仓库）：

```bash
STYLE_SHELF_EXECUTOR=workbuddy
STYLE_SHELF_WORKBUDDY_BASE=http://127.0.0.1:8080
STYLE_SHELF_WORKBUDDY_TOKEN=<codebuddy --serve 启动时打印的密码>
```

也可以打开 Style Shelf 的“诊断”面板，在“执行器配置”中选择 WorkBuddy。这个选择会保存到工作台自己的数据目录；网页不会代替 WorkBuddy 保存服务地址、token 或生图模型密钥，地址和 token 仍按上面的 `.env` 配置读取。

约定：

- 生图模型只在 WorkBuddy 侧配置（`--text-to-image-model` / `--image-to-image-model` 或其配置项）；Style Shelf 不读取、不转发、不记录任何模型密钥。
- Style Shelf 派发的 prompt 会指示 WorkBuddy 使用其配置的图像模型，而不是内置默认生图工具。
- WorkBuddy 把结果图片写入 Job 的输出目录后，Style Shelf 校验图片签名并接纳进 `Generated/<job-id>/`，后续封面与图库流程与 Codex Runner 完全一致。
- `/api/health` 的 `executor.state`：`configured` 表示 token 已配置；`missing_token` 表示缺少 `STYLE_SHELF_WORKBUDDY_TOKEN`。
- 并发上限 5，超出排队；取消任务会同时调用 WorkBuddy 的 run cancel 接口。

当前验收范围：WorkBuddy 本地服务连接、Skill/图片目录访问、Job 派发和结果接纳接口预留。真实模型调用和端到端出图留到用户配置生图模型后再验证。

## 7. 当前版本必须如实区分的结果

以下结果属于“连接能力通过”或接口预留成立：

- WorkBuddy 能访问仓库、Skill、Uploads/Generated 和 Style Shelf API；
- WorkBuddy 执行器状态能与生图接口状态分开显示；
- WorkBuddy 能在未来配置模型后把结果图片交给 Style Shelf 接纳。

启用 WorkBuddy 执行器后（见第 6 节），以下行为成立：

- Style Shelf 的"运行"通过 WorkBuddy 的 `/api/v1/runs` 执行；
- WorkBuddy 的 `runId` 映射为 Style Shelf 持久 Job/Turn 的 runner 记录；
- WorkBuddy 生成的图片经签名校验后进入 Style Shelf 的运行历史与图库。

以下行为在当前版本仍然不会自动成立：

- WorkBuddy 的模型 API 配置出现在 Style Shelf 的设置页（密钥只留在 WorkBuddy 侧，这是有意设计）；
- 未配置生图模型时的自动兜底（任务会明确失败并报告 `workbuddy_no_image_artifact` 或模型配置错误，不会假装成功）。

真实生图验证不属于当前阶段；待用户在 WorkBuddy 中配置模型后，再单独验证 `/api/v1/runs`、流式结果和图片接纳。

## 8. 反馈模板

请把下面信息原样回传：

```text
系统：
Node：
WorkBuddy 版本：
Style Shelf commit/tag：
Style Shelf /api/health：PASS / FAIL（附 JSON 或错误）
Style Shelf /api/storage：PASS / FAIL（附 JSON 或错误）
WorkBuddy /api/v1/health：PASS / FAIL（附 JSON 或错误）
只读连接测试：PASS / FAIL
生图测试：PASS / FAIL
模型名：
输入路径：
输出路径：
输出尺寸/MIME：
失败步骤与完整错误：
```

## 官方接口参考

- [WorkBuddy Code HTTP API（Beta）](https://www.workbuddy.ai/docs/cli/http-api)：本地服务启动、健康检查、请求头、认证、Runs、SSE 和本地附件字段。
- [Style Shelf README](../README.md)：本地安装、bootstrap、Electron 和目录约定。

---

## English

This guide checks whether WorkBuddy can access the Style Shelf repository, image library, and local API. Style Shelf includes a WorkBuddy executor adapter. WorkBuddy itself remains responsible for image-model configuration; Style Shelf does not store model credentials.

### 1. Requirements

- macOS, Windows, or Linux with Node.js `20.19+` or `22.12+`.
- WorkBuddy/CodeBuddy installed and able to start a local HTTP service.
- An image API is not required for the connection check. Real generation requires text-to-image and image-to-image providers configured inside WorkBuddy.
- `npm run bootstrap` seeds the eight missing bundled Skills into `CODEX_HOME/skills` without overwriting existing Skills. `heytea-doodle-poster` is included only in the free personal/non-commercial package as a maintainer-local copy; retain its source and redistribution notice.

### 2. Start Style Shelf from source

The following `curl` and browser addresses apply only to source mode. The packaged desktop app opens its own window and selects an available localhost API port at startup; do not assume `4317` for the desktop app. Use the in-app **Diagnostics** panel to see the active connection.

```bash
git clone <Style-Shelf-GitHub-URL>
cd <Style-Shelf-GitHub-directory>
npm install
npm run bootstrap
npm run start
```

Check the source-mode API:

```bash
curl -fsS http://127.0.0.1:4317/api/health
curl -fsS http://127.0.0.1:4317/api/storage
```

Expected results: `/api/health` returns `ok: true`; `/api/storage` returns the visible `Uploads` and `Generated` folders; bootstrap reports `N + M = 8`; the source-mode UI opens at <http://127.0.0.1:4173>.

### 3. Start WorkBuddy

Follow the CLI syntax supported by the installed WorkBuddy version. The current HTTP API example is:

```bash
codebuddy --serve --port 8080 --session-id styleshelf-test
curl -fsS http://127.0.0.1:8080/api/v1/health
```

Protected requests require `X-CodeBuddy-Request: 1` and `Authorization: Bearer <password>`. Keep that password private.

### 4. Select the WorkBuddy executor

Store local connection values only in your uncommitted `.env`:

```bash
STYLE_SHELF_EXECUTOR=workbuddy
STYLE_SHELF_WORKBUDDY_BASE=http://127.0.0.1:8080
STYLE_SHELF_WORKBUDDY_TOKEN=<password printed by codebuddy --serve>
```

You can also select WorkBuddy in Style Shelf's **Diagnostics** panel. The selection is persisted by Style Shelf, while the service address and token remain in `.env`. Image-model provider URLs, keys, and model names remain inside WorkBuddy.

### 5. Current validation boundary

This release can dispatch a Job through `/api/v1/runs`, associate the WorkBuddy `runId` with a persistent Style Shelf Job/Turn, validate returned image signatures, and accept images into `Generated/<job-id>/`.

It does **not** claim validated end-to-end image generation through a third-party model API. Without an image provider, the Job fails explicitly instead of reporting a false success. Real model testing is optional and should be performed only by users who already have a working image API.

### 6. Read-only connection check

Ask WorkBuddy to read `bundled-skills/manifest.json`, confirm one bundled `SKILL.md`, request the source-mode `/api/health` and `/api/storage` endpoints, and return the eight bundled Skill IDs. It must not print API keys, cookies, or authentication passwords.

### 7. Feedback template

```text
OS:
Node:
WorkBuddy version:
Style Shelf commit/tag:
Style Shelf /api/health: PASS / FAIL
Style Shelf /api/storage: PASS / FAIL
WorkBuddy /api/v1/health: PASS / FAIL
Read-only connection check: PASS / FAIL
Image-generation test: NOT TESTED / PASS / FAIL
Failure step and privacy-safe error:
```

### References

- [WorkBuddy Code HTTP API (Beta)](https://www.workbuddy.ai/docs/cli/http-api)
- [Style Shelf README](../README.md)
