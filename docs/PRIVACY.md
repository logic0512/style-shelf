# 本地隐私边界 / Local privacy boundary

## 中文

Style Shelf 将工作台索引、Job 状态和内部元数据保存在配置的本地数据目录。`/api/health` 返回的 `dataDir` 只是本机诊断用的绝对路径，不会上传到外部服务。用户提供的图片副本保存在可见的 `Uploads` 目录，接纳的生成原图保存在 `Generated`。页面不能任意访问本机文件系统，本地服务默认只监听 `127.0.0.1`。

Codex 登录状态、WorkBuddy 或模型 API 密钥、原始 Skill 文件都留在用户自己的环境中。不要把它们放进仓库、Job、日志、截图或 Issue。输入图片会复制到当前 Job，不会移动或覆盖原文件；封面裁切只修改图库展示数据，不会改变生成原图。

首次初始化只创建数据目录，不安装 Skill 或添加 Prompt。已有用户内容保留，用户导入内容遵循其来源许可。

## English

Style Shelf stores workspace indexes, Job state, and internal metadata in the configured local data directory. The absolute `dataDir` returned by `/api/health` is a local diagnostic path only and is not uploaded to an external service. User-provided image copies are stored in the visible `Uploads` folder, while accepted generated originals are stored in `Generated`. The UI has no arbitrary filesystem access, and the local service binds to `127.0.0.1` by default.

Codex login state, WorkBuddy or model API keys, and original Skill files remain in the user's own environment. Never place them in the repository, Jobs, logs, screenshots, or issues. Image inputs are copied into the current Job, so the original file is not moved or overwritten. Cover cropping changes only gallery presentation data, never the generated original.

Bootstrap only creates data directories. No Skills or Prompts are installed. Existing user content is preserved; imported content retains its source terms.
