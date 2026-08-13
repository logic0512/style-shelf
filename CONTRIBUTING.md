# Contributing to Style Shelf / 参与贡献

## 中文

需要 Node.js `20.19+` 或 `22.12+`：

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
npm run check:bundled-licenses
npm run build
npm run pack:dir
```

任何新的内置 Skill 都必须在 `THIRD_PARTY_NOTICES.md` 记录原作者、原始链接、许可证和封面来源。没有明确再分发许可时，只能作为不含 Skill 文件的外部目录卡片。

## English

Use Node.js `20.19+` or `22.12+`:

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
npm run check:bundled-licenses
npm run build
npm run pack:dir
```

Every new bundled Skill must be listed in `THIRD_PARTY_NOTICES.md` with its author, original source, license, and cover provenance. If redistribution rights are unclear, ship only an external catalog card without the Skill files.

`npm run dist:mac`, `npm run dist:win`, and `npm run dist:linux` create local Electron artifacts. Signing and notarization credentials belong to the release environment, never the repository.
