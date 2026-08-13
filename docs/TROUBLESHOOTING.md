# Style Shelf 故障排查

[中文](#中文) · [English](#english)

## 中文

## 页面打不开

不要直接双击 `index.html`，工作台需要本地 API。回到仓库目录执行：

```bash
npm install
npm run setup
npm run doctor
npm run start
```

然后打开 <http://127.0.0.1:4173/>。如果端口被占用，可在仓库根目录的 `.env` 中修改：

```text
STYLE_SHELF_PORT=4317
STYLE_SHELF_FRONTEND_PORT=4173
```

## 检查本地服务

打开 <http://127.0.0.1:4317/api/health>。能看到健康状态，说明 API 已启动；页面仍打不开时，检查终端中的 Vite 输出和浏览器地址是否使用了相同端口。

Electron 桌面 App 会动态选择空闲 API 端口，不应在桌面版中假定为 `4317`；请直接使用 App 内的“诊断”面板查看连接状态。

## Codex Runner 未找到

执行 `npm run doctor`。如果只提示 Runner 未找到，其他本地页面仍可使用，但真实图片任务不会执行。把可执行文件的绝对路径写入 `.env`：

```text
CODEX_BIN=/absolute/path/to/codex
```

不要把登录信息、API 密钥或完整凭据写入 `.env.example`、Job、日志或问题报告。

## Skill 无法添加

- 本机导入：确认 `CODEX_HOME/skills/<skill>/SKILL.md` 存在且可读。
- GitHub 添加：确认机器可以访问仓库，地址指向包含 `SKILL.md` 的 Skill 目录。
- Windows 使用 `python`，macOS/Linux 使用 `python3`；缺少对应运行时会由 `npm run doctor` 报告。

工作台“移出 Skill”只移除工作台调用记录，不删除 `CODEX_HOME/skills` 下的原始 Skill。

## 任务失败或无结果

先在任务栏查看失败原因，再检查：

1. `npm run doctor` 是否能找到 Codex Runner；
2. Skill 的输入是否满足该 Skill 的实际要求；
3. 应用数据目录的 `jobs/<job-id>/job.json`、图片库 `Uploads/<job-id>/` 和 `Generated/<job-id>/` 是否存在；旧版本 Job 仍可能保留 `input/`、`output/`；
4. 图片是否由当前 Job 接纳，而不是只在浏览器预览中存在。

原图和生成原图不会因为封面裁切被覆盖。封面只保存结果图库使用的 `4:3` 或 `3:4` 取景。

## 仍无法定位时

提交问题时只提供：操作系统、Node 版本、`npm run doctor` 输出、失败 Job ID 和不含隐私的错误信息。不要上传 `.env`、Codex 登录目录、原始 Skill 私有文件或图片原图。

---

## English

### The page does not open

Do not open `index.html` directly. From the repository root, run:

```bash
npm install
npm run setup
npm run doctor
npm run start
```

Then open <http://127.0.0.1:4173/>. To change occupied ports, set `STYLE_SHELF_PORT` and `STYLE_SHELF_FRONTEND_PORT` in the repository's local `.env`.

### Check the local service

Open <http://127.0.0.1:4317/api/health>. If it returns health data, the API is running. In the packaged desktop app the API port is selected dynamically; use the in-app **Diagnostics** panel instead of assuming port `4317`.

### No execution backend

Run `npm run doctor`. The UI and local gallery can still open without a runner, but real image Jobs cannot run.

For Codex, set an absolute executable path in `.env` only when automatic discovery fails:

```text
CODEX_BIN=/absolute/path/to/codex
```

For WorkBuddy, start its local HTTP service and configure the image model on the WorkBuddy side. Never put login state or model credentials in `.env.example`, Jobs, logs, screenshots, or issues.

### A Skill cannot be added

- Local import: verify that `CODEX_HOME/skills/<skill>/SKILL.md` exists and is readable.
- GitHub install: use a reachable repository URL whose selected directory contains `SKILL.md`.
- If a Skill is already installed through Codex, open **Add Skill**, search the local list, and add it to the workbench.

Removing a Skill from Style Shelf removes only its workbench entry. It never deletes the original Skill under `CODEX_HOME/skills`.

### A Job fails or produces no image

Check the task message, then verify the selected backend, the Skill's required inputs, and the current Job folders under `Uploads/<job-id>/` and `Generated/<job-id>/`. Cover cropping never overwrites the original generated image.

### Reporting an issue

Include only the operating system, Node version, `npm run doctor` output, failed Job ID, and a privacy-safe error message. Do not upload `.env`, login directories, private Skills, API keys, or original images.
