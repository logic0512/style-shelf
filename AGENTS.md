# Style Shelf 项目规则

- 运行环境：Node.js 20.19+ 或 22.12+。标准命令：`npm run setup` 初始化本地目录，`npm run doctor` 做环境检查，`npm run start` 同时启动页面和 localhost API，`npm run build` 做生产构建检查。
- 这是本地优先 Web 应用。不要把密钥写入仓库、Job、日志或前端状态。
- Skill 的“移出工作台”只改变 `.styleshelf-data` 中的调用目录；不得删除 `CODEX_HOME/skills` 下的原始 Skill。
- 导入本地 Skill 时读取 `SKILL.md` 即可，不要移动或复制用户原文件。
- 修改后至少运行受影响的语法检查或 `npm run build`；未得到明确请求不要提交或推送 Git。
