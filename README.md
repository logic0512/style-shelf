# Style Shelf

[English](README.en.md)

Style Shelf 是本地优先的图片创作工作台，管理用户自己导入的 Skill、创建的 Prompt、运行任务和本地图库。

**从 0.2.2 起，原版不附带任何 Skill、Prompt 模板、样例图片或预置风格目录。首次启动为空白工作台，已有用户数据保留。**

## 从源码运行

需要 Node.js 20.19+ 或 22.12+。

```bash
git clone https://github.com/logic0512/style-shelf.git
cd style-shelf
npm install
npm run bootstrap
npm run start
```

打开 http://127.0.0.1:4173。初始化只创建数据目录并检查环境，不安装 Skill。添加你自己的 Skill 或新建 Prompt 后即可使用。封面支持完整展示或铺满裁切，移出工作台不会删除原始 Skill。

真实生图需要本机已安装并登录的 Codex。WorkBuddy 为可选执行器，需自行配置模型，见[连接说明](docs/WORKBUDDY_CONNECTION_TEST.md)。工作台不附带模型或账户。

```bash
npm test
npm run build
npm run desktop
npm run pack:dir
```

## 版本与数据边界

当前纯工作台版本通过源码提供。旧 Release 和 Git 历史可能包含此前的内置内容；此次未重写历史或删除旧安装包。

上传和生成图片位于 `~/Pictures/Style Shelf/`。Web 索引默认在 `.styleshelf-data/`，桌面版使用系统用户数据目录。配置见 [.env.example](.env.example)。不要提交用户数据、图片、任务、密钥或登录信息。

## 文档与许可

- [贡献说明](CONTRIBUTING.md)
- [隐私](docs/PRIVACY.md)
- [故障排查](docs/TROUBLESHOOTING.md)
- [修复回顾](docs/RELIABILITY_REVIEW.md)
- [Skill 元数据规则](docs/SKILL_METADATA_RULES.md)

应用代码使用 [MIT](LICENSE)。用户自行导入内容遵循其来源许可，工作台许可不覆盖这些内容。参见[第三方说明](THIRD_PARTY_NOTICES.md)。
