# Style Shelf

[中文](README.md)

A local-first image workbench for user-imported Skills, user-created Prompts, jobs, and image collections.

**Starting with 0.2.2, no Skills, Prompt templates, sample images, or preset style catalog are included. A new installation starts empty. Existing user data is preserved.**

## Get started

Requires Node.js 20.19+ or 22.12+.

```bash
git clone https://github.com/logic0512/style-shelf.git
cd style-shelf
npm install
npm run bootstrap
npm run start
```

Open http://127.0.0.1:4173. Bootstrap creates local directories and checks the environment; it does not install Skills. Import your own Skill or create a Prompt to begin. Covers support full-image display or cropping. Removing a Skill does not delete its original files.

Generation requires an installed and authenticated Codex runtime. WorkBuddy is optional and requires separate model configuration; see [integration notes](docs/WORKBUDDY_CONNECTION_TEST.md). No model or account is included.

```bash
npm test
npm run build
npm run desktop
npm run pack:dir
```

## Distribution and data

The workbench-only version is currently available as source. Older releases and Git history may contain previously bundled content; this update does not rewrite history or remove older installers.

Uploads and generated images live under `~/Pictures/Style Shelf/`. Web indexes default to `.styleshelf-data/`; desktop indexes use the system user-data directory. See [.env.example](.env.example). Do not commit user data or credentials.

See [Contributing](CONTRIBUTING.md), [Privacy](docs/PRIVACY.md), and [Troubleshooting](docs/TROUBLESHOOTING.md).

Application code is [MIT licensed](LICENSE). Imported content retains its own source terms. See [third-party notices](THIRD_PARTY_NOTICES.md).
