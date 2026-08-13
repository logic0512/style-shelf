# Style Shelf

**本地优先的图片风格 Skill 工作台 / A local-first workbench for image-style Skills**

[中文](#中文) · [English](#english) · [第三方-skill-与许可--third-party-skills-and-licenses](THIRD_PARTY_NOTICES.md)

Style Shelf 把喜欢的生图 Skill 变成可视、可搜索、可直接运行的风格卡片。它是独立的桌面工作台，但不内置云端模型：真实生图需要本机 Codex，或者已配置图像模型的 WorkBuddy。

Style Shelf turns image-generation Skills into visual, searchable, directly runnable style cards. It is a standalone desktop workbench, but it does not bundle a cloud model: real image generation requires either a working local Codex runtime or WorkBuddy configured with an image model.

---

## 中文

### 能做什么

- 通过风格封面和中文说明选择 Skill，不用记住 Skill 名称。
- 根据每个 Skill 的真实需求，动态显示图片、文字、多图或引导问答输入。
- 同时运行多个本地 Job，保留每轮结果，并在同一 Job 上继续修改。
- 把发布的作品存入本地图库，原图与 `4:3` / `3:4` 展示封面分开保存。
- 从本机 Codex Skill 目录导入，或从 GitHub 仓库安装 Skill。移出工作台不会删除原 Skill。
- 在系统文件管理器中直接查看和清理 `Uploads` 与 `Generated` 图片目录。

### 执行方式

| 执行器 | 用户需要准备什么 | Style Shelf 保存什么 |
| --- | --- | --- |
| **Codex（默认）** | 安装并登录 Codex，且当前账户具有可用的生图能力 | Job、Skill 引用、输入副本和结果文件；不保存登录凭据 |
| **WorkBuddy** | 启动 WorkBuddy 本地 HTTP 服务，并在 WorkBuddy 中单独配置生图模型 API | 只保存执行器选择和 Job 结果；不保存 WorkBuddy 或模型密钥 |

可在应用的“诊断”面板中选择 Codex 或 WorkBuddy。WorkBuddy 连接已预留，但由于当前没有用可用的第三方生图 API 做端到端验证，不应将其标记为“已验证真实出图”。详见 [WorkBuddy 连接说明](docs/WORKBUDDY_CONNECTION_TEST.md)。

### 桌面 App

桌面包会自动启动页面和 localhost API，不需要用户再手动运行 `npm run start`。它不会自动安装、登录或为 Codex / WorkBuddy 购买模型服务。

当前 GitHub Actions 配置了 macOS、Windows 和 Linux 构建，但发行包尚未签名或公证。在签名完成前，macOS 可能需要在“系统设置 → 隐私与安全性”中允许打开，Windows 可能显示 SmartScreen 提示。

本地打包命令：

```bash
npm run dist:mac
npm run dist:mac:universal
npm run dist:win
npm run dist:linux
```

### 从源码启动

需要 Node.js `20.19+` 或 `22.12+`：

```bash
git clone <repository-url>
cd style-shelf
npm install
npm run bootstrap
npm run start
```

打开 <http://127.0.0.1:4173>。`bootstrap` 会初始化存储目录，将缺失的内置 Skill 种入当前用户的 Codex Skill 目录，并运行环境诊断；它不会覆盖已存在的同名 Skill。

常用命令：

```bash
npm run doctor                 # 检查 Node / Python / Codex / Skill 目录
npm run build                  # 生产构建检查
npm run check:bundled-licenses # 检查随包 Skill 许可文件
npm run desktop                # Electron 开发启动
```

### 默认风格

首版展示 8 张默认风格卡，但只有 7 个 Skill 文件随 App 分发。`heytea-doodle-poster` 未找到明确的再分发许可，因此只保留来源卡片和工作台自有封面，用户需要先按作者页面安装，再回工作台导入。

| Skill | 分发状态 | 许可摘要 |
| --- | --- | --- |
| `photo-abstract-editorial` | 随 App | 个人／教育／研究／非商业 |
| `ian-xiaohei-illustrations` | 随 App | MIT + NOTICE |
| `ink-wash-poster` | 随 App | AGPL-3.0 |
| `gc-minimal-zine-poster-v0-1` | 随 App | MIT |
| `scene-distillation-zine-v1-3` | 随 App | 个人非商业 |
| `scenes-gathered-zine-v1-3` | 随 App | 个人非商业 |
| `heytea-doodle-poster` | 仅卡片，不随包 | 未找到明确再分发许可 |
| `vinyl-image-generator` | 随 App | MIT |

完整默认包含有非商业 Skill，因此当前整包只适合免费个人／非商业使用。Style Shelf 核心代码是 MIT，但第三方 Skill 仍保留各自许可。详见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。

### 本地存储与隐私

- 上传图片：`~/Pictures/Style Shelf/Uploads/`
- 生成原图：`~/Pictures/Style Shelf/Generated/`
- 内部 Job 与索引：Web 模式默认为 `.styleshelf-data/`；App 模式为系统用户数据目录。
- 服务默认只监听 `127.0.0.1`；仓库和安装包不包含用户图片、历史 Job、`.env` 或模型密钥。

目录可通过 `.env` 覆盖，示例见 [`.env.example`](.env.example)。不要把 `.env`、登录信息或密钥提交到 GitHub。

### 其他文档

- [贡献说明 / Contributing](CONTRIBUTING.md)
- [隐私与凭据边界](docs/PRIVACY.md)
- [故障排查](docs/TROUBLESHOOTING.md)
- [Skill 元数据规则](docs/SKILL_METADATA_RULES.md)
- [WorkBuddy 连接与接口预留](docs/WORKBUDDY_CONNECTION_TEST.md)

---

## English

### What it does

- Pick a Skill by its visual cover and Chinese description instead of remembering its package name.
- Render image, text, multi-image, ratio, option, or guided-question inputs from each Skill's actual contract.
- Run multiple local Jobs, keep every turn, and continue editing the same Job with a new instruction.
- Publish selected outputs to a local gallery while keeping the original image separate from its `4:3` or `3:4` display crop.
- Import installed Codex Skills or install a Skill from GitHub. Removing a Skill from the workbench never deletes the original Skill.
- Open and clean the user-visible `Uploads` and `Generated` folders in the system file manager.

### Execution backends

| Backend | What the user provides | What Style Shelf stores |
| --- | --- | --- |
| **Codex (default)** | An installed and signed-in Codex runtime with image-generation access | Jobs, Skill references, input copies, and result files; never Codex login credentials |
| **WorkBuddy** | A local WorkBuddy HTTP service plus a separately configured image-model API inside WorkBuddy | The selected backend and Job results; never WorkBuddy or model credentials |

Choose Codex or WorkBuddy from the app's **Diagnostics** panel. The WorkBuddy adapter and result-ingestion boundary are present, but real end-to-end image generation has not been validated with a third-party image API in this release. See the [WorkBuddy connection guide](docs/WORKBUDDY_CONNECTION_TEST.md).

### Desktop app

The packaged app starts its localhost API and UI automatically; end users do not need to run `npm run start`. The app does not install, sign in to, or purchase model access for Codex or WorkBuddy.

GitHub Actions is configured to build macOS, Windows, and Linux artifacts. Current artifacts are unsigned and not notarized. Until signing is configured, macOS may require **System Settings → Privacy & Security → Open Anyway**, and Windows may show a SmartScreen warning.

Local packaging commands:

```bash
npm run dist:mac
npm run dist:mac:universal
npm run dist:win
npm run dist:linux
```

### Run from source

Requires Node.js `20.19+` or `22.12+`:

```bash
git clone <repository-url>
cd style-shelf
npm install
npm run bootstrap
npm run start
```

Open <http://127.0.0.1:4173>. `bootstrap` initializes local storage, seeds missing bundled Skills into the current user's Codex Skill directory, and runs diagnostics. Existing Skills are never overwritten.

Useful commands:

```bash
npm run doctor
npm run build
npm run check:bundled-licenses
npm run desktop
```

### Default styles

The first release shows eight default cards. Seven Skill packages are bundled. `heytea-doodle-poster` has no verified redistribution license, so the app ships only its source card and a maintainer-owned cover; install the Skill from the author's page, then import it into Style Shelf.

| Skill | Distribution | License summary |
| --- | --- | --- |
| `photo-abstract-editorial` | Bundled | Personal / educational / research / non-commercial |
| `ian-xiaohei-illustrations` | Bundled | MIT + NOTICE |
| `ink-wash-poster` | Bundled | AGPL-3.0 |
| `gc-minimal-zine-poster-v0-1` | Bundled | MIT |
| `scene-distillation-zine-v1-3` | Bundled | Personal non-commercial |
| `scenes-gathered-zine-v1-3` | Bundled | Personal non-commercial |
| `heytea-doodle-poster` | Catalog card only | No explicit redistribution license found |
| `vinyl-image-generator` | Bundled | MIT |

Because the complete default bundle contains non-commercial Skills, it is currently intended only for free personal/non-commercial use. The Style Shelf core is MIT-licensed; third-party Skills retain their own licenses. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

### Local storage and privacy

- Uploaded copies: `~/Pictures/Style Shelf/Uploads/`
- Generated originals: `~/Pictures/Style Shelf/Generated/`
- Internal Jobs and indexes: `.styleshelf-data/` in Web mode; the OS user-data directory in the packaged app.
- The service binds to `127.0.0.1` by default. The repository and release artifacts contain no user images, Job history, `.env`, or model secrets.

Paths can be overridden in `.env`; see [`.env.example`](.env.example). Never commit `.env`, login state, or API keys to GitHub.

### More documentation

- [Contributing / 贡献说明](CONTRIBUTING.md)
- [Privacy and credential boundary](docs/PRIVACY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Skill metadata rules](docs/SKILL_METADATA_RULES.md)
- [WorkBuddy connection and reserved integration](docs/WORKBUDDY_CONNECTION_TEST.md)

## License

Style Shelf application code is licensed under [MIT](LICENSE). Third-party Skills are governed by their original licenses and notices in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
