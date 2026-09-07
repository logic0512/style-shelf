# Contributing to Style Shelf / 参与贡献

## 中文

需要 Node.js `22.12+`：

```bash
npm install
npm run setup
npm run bootstrap
npm run doctor
npm run build
```

本地开发使用 `npm run start`。不得提交 `.env`、`.env.local`、`.workbuddy/`、`.styleshelf-data/`、模型凭据、用户图片、生成结果或私有 Skill。

保持项目的本地优先边界：API 默认只监听 loopback；移出工作台不得删除用户的原 Skill；新执行器必须复用现有 Job / Turn / 产物协议，不得把凭据放入前端或 Job。

发布桌面包前至少运行：

```bash
npm test
npm run build
npm run pack:dir
```

发行版保持空白工作台，不提交内置 Skill、Prompt、样例图片或用户数据。测试使用最小自造数据。

## English

Use Node.js `22.12+`:

```bash
npm install
npm run setup
npm run bootstrap
npm run doctor
npm run build
```

Use `npm run start` for local development. Never commit `.env`, `.env.local`, `.workbuddy/`, `.styleshelf-data/`, model credentials, user images, generated results, or private Skills.

Preserve the local-first boundary: keep the API loopback-only by default; removing a Skill from the workbench must never delete the user's original Skill; new backends must reuse the existing Job / Turn / artifact protocol and must not put credentials in the frontend or Job data.

Before a desktop release, run at least:

```bash
npm test
npm run build
npm run pack:dir
```

Keep distributions empty: no bundled Skills, Prompts, sample images, or user data. Use minimal synthetic test data.

`npm run dist:mac`, `npm run dist:win`, and `npm run dist:linux` create local Electron artifacts. Signing and notarization credentials belong to the release environment, never the repository.
