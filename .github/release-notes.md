# Style Shelf 0.2.0

## 中文

Style Shelf 是一个本地优先的图片风格工作台，把可复用的 Skill 和 Prompt 模板变成可运行的风格卡片。

### 本次更新

- 新增独立 Prompt 风格仓库，与 Skill 风格分开管理。
- Prompt 支持图片转化型和纯文本生成型，可新增、编辑、删除，并复用现有创作页、任务历史和图库。
- 内置“油墨印章图章”和“复古几何版画”两个测试模板，作为 Prompt 工作流示例。
- 精简桌面安装包：移除重复素材，只保留中文和英文 Electron 语言资源。
- Prompt 首版通过本地 Codex 执行；WorkBuddy 仍不声明 Prompt 真实出图支持。

### 安装与首次启动

- macOS：下载 `.dmg` 或 `.zip`，首次打开未签名应用时，按系统提示到“系统设置 → 隐私与安全性”选择“仍要打开”。
- Windows：运行 `.exe` 安装包；Windows SmartScreen 可能显示未签名提示。
- Linux：运行 `.AppImage`，必要时先为文件增加执行权限。
- 首次启动会建立本地数据目录，并种入首版附带的 8 个默认 Skill；已有同名本机 Skill 不会被覆盖。

Codex 需要用户自行安装并登录。WorkBuddy 执行器已经预留，但第三方生图模型 API 未在本版本中做真实出图验证；使用 WorkBuddy 时，请在 WorkBuddy 自己配置模型和密钥，Style Shelf 不保存这些凭据。

默认包是免费个人非商业版本。第三方 Skill 保留原作者和原始许可证限制，详情见仓库中的 `THIRD_PARTY_NOTICES.md`。

## English

Style Shelf is a local-first image style workbench that turns reusable Skills and Prompt templates into runnable style cards.

### What's new

- Added a separate Prompt style collection alongside the existing Skill collection.
- Added image-transformation and text-to-image Prompt templates with create, edit, delete, shared creation workspace, task history, and gallery flows.
- Included two experimental workflow examples: Ink Stamp Travel and Retro Geometric Print.
- Reduced the desktop package footprint by removing duplicate assets and retaining only Chinese and English Electron locale resources.
- Prompt execution is supported through local Codex in this release; WorkBuddy Prompt image generation is not claimed as validated.

### Install and first launch

- macOS: download the `.dmg` or `.zip`. Because this build is unsigned, use **System Settings → Privacy & Security → Open Anyway** if Gatekeeper blocks the first launch.
- Windows: run the `.exe` installer; Windows SmartScreen may show an unsigned-app warning.
- Linux: run the `.AppImage`; add execute permission first if required.
- On first launch, the app creates its local data folders and seeds the eight default Skills included in this release. Existing Skills with the same name are never overwritten.

Codex must be installed and signed in by the user. The WorkBuddy executor is reserved and wired, but this release does not claim real end-to-end image generation through a third-party image API. If you use WorkBuddy, configure the image model and credentials inside WorkBuddy; Style Shelf never stores those credentials.

The default bundle is for free personal/non-commercial use. Third-party Skills retain their original authorship and license restrictions; see `THIRD_PARTY_NOTICES.md`.
