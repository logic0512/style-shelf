# 本地隐私边界 / Local privacy boundary

## 中文

Style Shelf 将工作台索引、Job 状态和内部元数据保存在配置的本地数据目录。用户提供的图片副本保存在可见的 `Uploads` 目录，接纳的生成原图保存在 `Generated`。页面不能任意访问本机文件系统，本地服务默认只监听 `127.0.0.1`。

Codex 登录状态、WorkBuddy 或模型 API 密钥、原始 Skill 文件都留在用户自己的环境中。不要把它们放进仓库、Job、日志、截图或 Issue。输入图片会复制到当前 Job，不会移动或覆盖原文件；封面裁切只修改图库展示数据，不会改变生成原图。

首次初始化时，仅在同名 Skill 缺失的情况下种入 `bundled-skills/manifest.json` 中列出的 Skill，不覆盖用户已有 Skill。第三方 Skill 保留各自许可，详见 [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md)。

## English

Style Shelf stores workspace indexes, Job state, and internal metadata in the configured local data directory. User-provided image copies are stored in the visible `Uploads` folder, while accepted generated originals are stored in `Generated`. The UI has no arbitrary filesystem access, and the local service binds to `127.0.0.1` by default.

Codex login state, WorkBuddy or model API keys, and original Skill files remain in the user's own environment. Never place them in the repository, Jobs, logs, screenshots, or issues. Image inputs are copied into the current Job, so the original file is not moved or overwritten. Cover cropping changes only gallery presentation data, never the generated original.

On first bootstrap, a Skill listed in `bundled-skills/manifest.json` is seeded only when the same Skill is missing. Existing user Skills are never overwritten. Third-party Skills retain their own licenses; see [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).
