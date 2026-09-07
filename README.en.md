<p align="center">
  <img src="assets/readme/hero.svg" width="100%" alt="Style Shelf: a local workbench for browsing, running, and saving image Skills and Prompts">
</p>

<p align="center">
  <a href="#see-it-in-use">See it in use</a> · <a href="#run-from-source">Get started</a> · <a href="README.md">中文</a>
</p>

Collect the image workflows you like. Choose a style, bring a photo or an idea, and keep the results in your own local gallery.

## See it in use

These are real screenshots of the maintainer's configured local workbench. **The Skills, Prompts, and artwork shown are demonstration content, not bundled features. New installations start empty.**

### 01 · Choose a style by its results

Browse your imported Skills as visual cards, with previews, sources, and input requirements.

![Configured local Skill shelf with real cover images](docs/images/workbench-skills.png)

### 02 · Keep reusable Prompts close

One photo, different expressions. Save and edit your own Prompts; show full covers or choose a crop.

![Local Prompt shelf showing foil, frosted glass, blueprint, and geometric interpretations](docs/images/workbench-prompts.png)

### 03 · Create in one workspace

Provide an image, add instructions, choose a ratio, then continue editing the same job while retaining its results.

![Creation workspace with image input, instructions, and style preview](docs/images/workbench-studio.png)

### 04 · Keep the results locally

Browse and filter your work. Gallery crops are saved separately from the original image.

![Local gallery with textile, block, badge, and architectural image transformations](docs/images/workbench-gallery.png)

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

The current release is the **0.2.3 workbench-only edition**. New installs start empty, with no bundled Skills, Prompts, or sample images.

Open the [latest release](https://github.com/logic0512/style-shelf/releases/latest) and choose your platform:

- macOS: `Style-Shelf-0.2.3-mac-universal.dmg` for both Intel and Apple silicon.
- Windows: `Style-Shelf-0.2.3-win-x64.exe`.
- Linux: `Style-Shelf-0.2.3-linux-x86_64.AppImage`.

Current installers are unsigned and not notarized. macOS may require **System Settings → Privacy & Security → Open Anyway**, and Windows may show a SmartScreen warning.

### Run from source

Requires Node.js `22.12+`:

```bash
git clone https://github.com/logic0512/style-shelf.git
cd style-shelf
npm install
npm run bootstrap
npm run start
```

Open <http://127.0.0.1:4173>. `bootstrap` initializes local directories and runs diagnostics. It does not add Skills or Prompts; existing user data is preserved.

Useful commands:

```bash
npm run doctor
npm test
npm run build
npm run desktop
```

## Execution backends and boundaries

### Codex (default)

- Requires an installed and signed-in Codex runtime with image-generation access.
- Style Shelf stores Jobs, source references, input copies, and result files; it never stores Codex login credentials.
- Both Skill and Prompt flows use the Codex execution path.

### WorkBuddy (optional)

- Requires a separate local WorkBuddy HTTP service and an image-model API configured inside WorkBuddy.
- The connection and result-ingestion boundary is present, but real end-to-end image generation has not been validated with a third-party image API.
- See the [WorkBuddy connection guide](docs/WORKBUDDY_CONNECTION_TEST.md).

Prompt templates are stored in `<data-dir>/prompts.json` without generating or modifying `SKILL.md`. The service binds to `127.0.0.1` by default. Installers contain no user images, Job history, `.env`, or model secrets. Repository screenshots are documentation only; they do not include importable Skills, Prompt bodies, or job data.

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
