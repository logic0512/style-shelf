# Style Shelf release

## 中文

Style Shelf 是一个本地优先的图片风格工作台，把可复用的 Skill 变成可运行的风格卡片。

### 安装与首次启动

- macOS：下载 `.dmg` 或 `.zip`，首次打开未签名应用时，按系统提示到“系统设置 → 隐私与安全性”选择“仍要打开”。
- Windows：运行 `.exe` 安装包；Windows SmartScreen 可能显示未签名提示。
- Linux：运行 `.AppImage`，必要时先为文件增加执行权限。
- 首次启动会建立本地数据目录，并种入首版附带的 8 个默认 Skill；已有同名本机 Skill 不会被覆盖。

Codex 需要用户自行安装并登录。WorkBuddy 执行器已经预留，但第三方生图模型 API 未在本版本中做真实出图验证；使用 WorkBuddy 时，请在 WorkBuddy 自己配置模型和密钥，Style Shelf 不保存这些凭据。

默认包是免费个人非商业版本。第三方 Skill 保留原作者和原始许可证限制，详情见仓库中的 `THIRD_PARTY_NOTICES.md`。

## English

Style Shelf is a local-first image style workbench that turns reusable Skills into runnable style cards.

### Install and first launch

- macOS: download the `.dmg` or `.zip`. Because this build is unsigned, use **System Settings → Privacy & Security → Open Anyway** if Gatekeeper blocks the first launch.
- Windows: run the `.exe` installer; Windows SmartScreen may show an unsigned-app warning.
- Linux: run the `.AppImage`; add execute permission first if required.
- On first launch, the app creates its local data folders and seeds the eight default Skills included in this release. Existing Skills with the same name are never overwritten.

Codex must be installed and signed in by the user. The WorkBuddy executor is reserved and wired, but this release does not claim real end-to-end image generation through a third-party image API. If you use WorkBuddy, configure the image model and credentials inside WorkBuddy; Style Shelf never stores those credentials.

The default bundle is for free personal/non-commercial use. Third-party Skills retain their original authorship and license restrictions; see `THIRD_PARTY_NOTICES.md`.
