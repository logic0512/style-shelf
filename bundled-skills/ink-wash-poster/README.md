# Ink Wash Poster

**English** · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Turn a sentence, mood, object, article idea, or reference photo into a finished ink-wash editorial poster. `ink-wash-poster` is a Codex skill that develops the art direction, writes a production-ready image prompt, generates the bitmap, and reviews the result before returning it.

It is designed for quiet, tactile images where paper, ink, empty space, and restrained typography carry as much meaning as the subject itself. The default direction is contemporary editorial design; traditional Chinese ink-painting language is used only when the brief asks for it.

## Use cases

`ink-wash-poster` is an image-generation skill, not only a prompt-writing helper. It can create a new image from an everyday idea or transform a supplied photo into an ink-wash visual while preserving the parts that matter.

- **Everyday creation** — personal artwork, wallpapers, journal images, poetry cards, mood pieces, and visual experiments.
- **Content and publishing** — article covers, newsletter headers, social posts, zines, editorial openers, and cultural content illustrations.
- **Promotion and campaigns** — key visuals for exhibitions, cultural events, travel, hospitality, seasonal campaigns, and product mood communication.
- **Photo reinterpretation** — portraits, landscapes, architecture, objects, and travel photos converted into spacious ink-wash compositions without losing their recognizable structure.

## At a glance

| | |
| --- | --- |
| Invoke with | `$ink-wash-poster` |
| Accepts | Natural-language ideas, exact copy, layout directions, photos, and visual references |
| Returns | Generated bitmap, final prompt, visual recipe, and review note |
| Default format | Vertical 4:5 poster, adapted when another ratio is requested |
| Default behavior | Generates the image; prompt-only mode is available on request |

## Three ways to begin

<table>
  <tr>
    <td width="25%"><img src="examples/01-natural-language-brief.png" alt="Ink-wash poster generated from a natural-language brief"></td>
    <td width="25%"><img src="examples/02-directed-text-placement.png" alt="Ink-wash poster with text requested on the left"></td>
    <td width="25%"><img src="examples/03-reference-image-original.jpg" alt="Original mountain reference photo before ink-wash transformation"></td>
    <td width="25%"><img src="examples/03-reference-image-to-ink-wash.png" alt="Mountain reference photo transformed into an ink-wash image"></td>
  </tr>
  <tr>
    <td><strong>01 · Natural-language brief</strong><br>Describe an idea in ordinary language. The skill turns it into a subject, mood, composition, paper tone, and ink treatment.</td>
    <td><strong>02 · Directed text placement</strong><br>Supply the exact wording and ask for it on the left. The image is composed with a deliberate text area instead of treating type as an afterthought.</td>
    <td colspan="2"><strong>03 · Reference image to ink wash</strong><br><strong>Original photo → ink-wash result.</strong> The mountain photo on the left was transformed into the image on the right. Its ridgeline and forest silhouette remain recognizable while the outer edges dissolve into ink and paper.</td>
  </tr>
</table>

## What shapes the result

- **Purposeful negative space** — open paper is part of the composition, not an unused background.
- **Material ink behavior** — wet blooms, dry-brush breaks, dilution, pigment edges, and visible paper fibers replace the look of a uniform digital filter.
- **Adaptive paper** — the paper hue is chosen from the subject and mood rather than fixed to the same aged beige for every image.
- **Controlled typography** — text is optional, compact, and limited to approved wording. Themes are not automatically printed as titles.
- **Reference-aware transformation** — a supplied subject, pose, horizon, or silhouette can remain legible while secondary detail fades into the page.
- **Built-in visual review** — the generated image is checked for composition, material quality, readability, and unwanted text; one targeted regeneration is made when necessary.

## From brief to poster

1. **Read the intent** — identify the subject, mood, required copy, factual details, intended use, and the role of any reference image.
2. **Choose an art direction** — select the visual scale, anchor position, paper tone, ink gesture, type density, and attention hierarchy.
3. **Compile the prompt** — turn those decisions into a compact four-part image-generation prompt with an explicit text allowlist.
4. **Generate and inspect** — create the bitmap, review the visible result, and correct a material or text failure once when needed.
5. **Return the working recipe** — provide the final image, the exact prompt, and a short explanation of the chosen direction.

## Installation

Clone the repository into the Codex skills directory:

```bash
git clone https://github.com/TwentyfiveBTea/ink-wash-poster.git \
  ~/.codex/skills/ink-wash-poster
```

Restart Codex if the skill does not appear immediately. To update an existing installation:

```bash
git -C ~/.codex/skills/ink-wash-poster pull
```

## Use it in Codex

Start a request with the skill name and describe the outcome in your own words:

```text
Use $ink-wash-poster to make a quiet poster about rain in an old town.
```

Add exact copy and placement when typography matters:

```text
Use $ink-wash-poster to create a misty lake poster. Place the exact text
"Calm Lake" on the left and keep the rest of the image text-free.
```

Attach a photo when the result should retain a recognizable subject:

```text
Use $ink-wash-poster to reinterpret this mountain photo in ink wash.
Preserve the ridgeline and forest silhouette, with the outer edges fading into paper.
```

For a prompt without image generation, add `return the prompt only` to the request.

## Text and factual details

The skill separates the **theme** from **approved in-image copy**. A request about “mountains” does not automatically authorize a `MOUNTAIN` title, a translation, or decorative characters. Dates, venues, prices, issue numbers, URLs, and calls to action are used only when you provide them.

Image models can still distort lettering. The skill inventories visible text after generation and performs one focused retry when it finds unapproved or malformed copy. For long or legally sensitive text, add final typography in a layout tool after generating the artwork.

## Repository map

```text
ink-wash-poster/
├── SKILL.md                 # Complete workflow and visual rules
├── agents/openai.yaml       # Codex skill-list metadata
├── examples/                # Images shown in this documentation
├── README.md                # English documentation (default)
├── README.zh-CN.md          # Simplified Chinese
├── README.ja.md             # Japanese
├── README.ko.md             # Korean
└── LICENSE                  # GNU AGPL v3
```

## License

Released under the [GNU Affero General Public License v3.0](LICENSE).
