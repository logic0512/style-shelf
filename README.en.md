<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="Style Shelf connects image Skills and Prompt templates to a shared creation workspace and local gallery">
</p>

<p align="center">
  <a href="https://github.com/logic0512/style-shelf/releases/latest"><strong>Download the latest release</strong></a>
  · <a href="README.md">中文</a>
  · <a href="#run-from-source">Run from source</a>
  · <a href="THIRD_PARTY_NOTICES.md">Third-party Skills and licenses</a>
</p>

Style Shelf is a local-first image-style workbench. It turns image-generation **Skills** and reusable **Prompt templates** into visual cards, so choosing a style, providing input, generating an image, iterating, and saving the result all happen in one app.

> Style Shelf does not bundle a cloud model. Real image generation requires an installed and signed-in Codex runtime, or a WorkBuddy instance configured with an image model by the user.

## Real product, not a mockup

Built-in and user-saved Prompt templates live in their own collection. Image-transformation and text-to-image Prompts use the same creation workspace.

![Prompt collection with the two built-in test templates](docs/images/style-shelf-gallery.png)

Generated outputs share one local gallery, with controls for continuing a Job, comparing the source image, or downloading the result.

![Style Shelf result gallery](docs/images/style-shelf-results.png)

## What Style Shelf does

- **Find a style by its result** — browse covers and plain-language descriptions instead of remembering package names.
- **Keep two mechanisms distinct** — Skills and Prompts have separate collections while sharing the creation workspace and gallery.
- **Match the required input** — render image, text, multi-image, ratio, option, or guided-question inputs from the selected source.
- **Keep the working history** — run local Jobs in parallel, retain every turn, and continue editing the same Job.
- **Save work locally** — keep originals separate from `4:3` or `3:4` display crops; user data is never bundled into the installer.
- **Manage Skills safely** — import from the Codex Skill directory or install from GitHub; removing a Skill from the workbench never deletes its source.

## Workflow

1. **Choose a source** — select a card from the Skill or Prompt collection.
2. **Provide input** — upload an image, enter text, or provide both when required.
3. **Run locally** — use Codex by default; WorkBuddy remains an optional backend.
4. **Keep the result** — continue the current Job or publish a selected version to the local gallery.

## Quick start

### Download the desktop app

Open the [latest release](https://github.com/logic0512/style-shelf/releases/latest) and choose your platform:

- macOS: `mac-universal.dmg` for both Intel and Apple silicon.
- Windows: `win-x64.exe`.
- Linux: `linux-x86_64.AppImage`.

Current installers are unsigned and not notarized. macOS may require **System Settings → Privacy & Security → Open Anyway**, and Windows may show a SmartScreen warning.

### Run from source

Requires Node.js `20.19+` or `22.12+`:

```bash
git clone https://github.com/logic0512/style-shelf.git
cd style-shelf
npm install
npm run bootstrap
npm run start
```

Open <http://127.0.0.1:4173>. `bootstrap` initializes local directories, seeds missing bundled Skills, and runs diagnostics. Existing Skills are never overwritten.

Useful commands:

```bash
npm run doctor
npm test
npm run build
npm run check:bundled-licenses
npm run desktop
```

## Execution backends and boundaries

### Codex (default)

- Requires an installed and signed-in Codex runtime with image-generation access.
- Style Shelf stores Jobs, source references, input copies, and result files; it never stores Codex login credentials.
- The v0.2.0 Prompt flow is connected to the Codex execution path.

### WorkBuddy (optional)

- Requires a separate local WorkBuddy HTTP service and an image-model API configured inside WorkBuddy.
- The connection and result-ingestion boundary is present, but real end-to-end image generation has not been validated with a third-party image API.
- See the [WorkBuddy connection guide](docs/WORKBUDDY_CONNECTION_TEST.md).

Prompt templates are stored in `<data-dir>/prompts.json` without generating or modifying `SKILL.md`. The service binds to `127.0.0.1` by default. The repository and installers contain no user images, Job history, `.env`, or model secrets.

## Bundled Skills and licenses

The free personal/non-commercial package includes eight Skill styles and two built-in Prompt templates for testing. Style Shelf core code is MIT-licensed, but third-party Skills retain their own licenses. The complete default bundle is intended only for free personal/non-commercial use.

<details>
<summary><strong>Show the eight bundled Skills</strong></summary>

| Skill | Distribution | License summary |
| --- | --- | --- |
| `photo-abstract-editorial` | Bundled | Personal / educational / research / non-commercial |
| `ian-xiaohei-illustrations` | Bundled | MIT + NOTICE |
| `ink-wash-poster` | Bundled | AGPL-3.0 |
| `gc-minimal-zine-poster-v0-1` | Bundled | MIT |
| `scene-distillation-zine-v1-3` | Bundled | Personal non-commercial |
| `scenes-gathered-zine-v1-3` | Bundled | Personal non-commercial |
| `heytea-doodle-poster` | Personal/non-commercial bundle | Upstream redistribution permission not verified; source and restrictions retained |
| `vinyl-image-generator` | Bundled | MIT |

</details>

`heytea-doodle-poster` is a maintainer-local copy. It excludes private reference assets and does not grant commercial redistribution rights. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for full sources and restrictions.

## Local storage and privacy

- Uploaded copies: `~/Pictures/Style Shelf/Uploads/`
- Generated originals: `~/Pictures/Style Shelf/Generated/`
- Internal Jobs and indexes: `.styleshelf-data/` in Web mode; the OS user-data directory in the packaged app.

Paths can be overridden through `.env`; see [`.env.example`](.env.example). Never commit `.env`, login state, or API keys.

## More documentation

- [Contributing](CONTRIBUTING.md)
- [Privacy and credential boundary](docs/PRIVACY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Skill metadata rules](docs/SKILL_METADATA_RULES.md)
- [WorkBuddy connection and reserved integration](docs/WORKBUDDY_CONNECTION_TEST.md)

## License

Style Shelf application code is licensed under the [MIT License](LICENSE). Third-party Skills remain governed by their original licenses and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
