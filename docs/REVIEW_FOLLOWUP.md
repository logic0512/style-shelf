# 审查修复记录

来源：[PROJECT_REVIEW_REPORT.md](./PROJECT_REVIEW_REPORT.md)

## 本轮已修复

- 本地服务启动时恢复 `queued` Job，避免服务重启后任务永久停留在排队状态。
- Codex Runner 在初始化阶段退出时立即将 Job 判定为失败，不再等待完整 15 分钟。
- GitHub Skill 地址先 URL 解码，再拒绝 `..` 路径段，避免把路径穿越交给下游安装器。
- Skill 安装器在 Windows 使用 `python`，在 macOS/Linux 使用 `python3`；`doctor` 会报告 Python 可用性。
- Skill 重新安装保留已有 `works`；成功生成会递增使用次数，前端同步更新卡片显示。
- 结果索引初始化接口只允许在结果库为空时写入，已有结果时返回 `409`，避免整表误覆盖。
- 结果索引的“空库检查 + 初始化写入”已放入同一写入队列，避免并发初始化请求互相覆盖。
- `monitorJob` 对短暂网络/API 500 错误重试，不再一次连接抖动就把任务标记为失败。
- 任务恢复监听只在应用启动时运行一次，Skill 刷新不会重复监控同一 Job 或重复递增使用次数。
- 取消请求覆盖 Codex Turn 完成后的结果接纳窗口，最终完成写入前后都会仲裁为 `cancelled`。
- 结果图片引用限制为本地 Skill 素材或本地 Job API 路径。
- 自动导入 Skill 缺少可读名称时使用格式化后的 Skill ID。

## Phase 8 已完成的第一段

- `doctor` 现在会检查实际 Codex Runner；可通过 `CODEX_BIN` 指定非 PATH 路径。
- `start` 和 `doctor` 会读取仓库根目录 `.env`，且不会覆盖命令行已有环境变量。
- `start` 使用 Node 的跨平台默认终止信号，并处理子进程启动错误。
- `.env.example` 和 README 补充 Runner 配置与 macOS、Windows、Linux 共用启动方式。
- 已验证 `setup`、`doctor`、`build`，并用临时端口完成 `start` 的 API/Web 启动冒烟。
- 重新验证当前本地 API：异常 Origin 返回 `403`，Job 路径穿越请求返回 `400`。
- 已补齐开源协作与本地故障排查入口：`CONTRIBUTING.md`、`docs/PRIVACY.md`、`docs/TROUBLESHOOTING.md`，并从 README 链接。
- 发布内容检查已排除项目内部 `.workbuddy/` 记忆与截图；旧 `src/` 仍按计划保留，未做兼容入口清理。
- 临时发布目录已完成 `setup`、`doctor`、`build`，并以临时端口启动 API/Web，两个入口均返回 `200`；依赖联网安装因当前环境 DNS 不可用未执行成功。
- 新增 `.github/workflows/quality.yml`，在 macOS、Windows、Linux 矩阵执行 `npm ci`、`setup`、`doctor` 和 `build`。

## 暂缓清理

以下内容不影响当前核心链路，本轮不删除：

- 旧 `src/` 目录；
- `v2.html` 和 Vite 的双入口；
- `src-v2/styles.css` 中历史视觉类；
- `start:mock` 脚本；
- `server/mock.mjs` 的文件名。

清理前需要再次确认外部链接、历史截图、文档引用和用户本地启动习惯，避免把结构清理误当成可靠性修复。

## 仍待确认

- Windows 实机上的 Codex Runtime、Python、进程终止和路径行为；
- Linux 实机上的 Codex Runtime 发现；
- 开源许可证选择；
