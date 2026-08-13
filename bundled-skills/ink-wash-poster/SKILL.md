---
name: ink-wash-poster
description: Generate an ink-wash editorial poster prompt and the matching bitmap image from a user's theme, sentence, object, mood, article idea, photo, content brief, poem, memory, event, place, or other creative material. Use when the user wants a quiet, spacious, tactile ink-wash poster, cover, cultural visual, or reference-photo reinterpretation with thoughtful composition, paper texture, restrained typography, and a generated image. Default to contemporary minimal editorial composition while allowing small traditional motifs when they fit the content; use an overall traditional visual language only when the user explicitly requests it.
---

# Ink Wash Poster

Turn the user's content into:

1. a clear image-generation prompt, and
2. a generated bitmap poster made from that prompt.

## Default Behavior

- Use the built-in image generation capability by default.
- Generate the image by default. Stop at prompt-only only when the user explicitly asks for it.
- Think through the visual direction before generation, then inspect the result before returning it.
- Follow the user's explicit content, format, color, copy, and reference-image requirements over the defaults below.

## Style Mode

Use **Contemporary Editorial Mode** by default, especially for short or open-ended requests such as "做一张关于雨天的图".

- Treat ink, water, absorption, and paper as visual materials, not automatically as a traditional Chinese cultural theme.
- Choose the visual scale from the material. For an open-ended theme, favor a micro image cluster with roughly 76%-92% quiet paper. For a supplied photo whose subject should remain recognizable, allow a larger integrated image field while preserving a substantial quiet-paper region.
- Use no display title by default when the user supplies only a theme. Decide whether small editorial microtype improves the composition; a textless image is equally valid when it is aesthetically stronger. Treat the theme as content rather than a large headline.
- Prefer restrained serif, monospaced, typewriter, or clean humanist typography over brush calligraphy.
- Use small photo fragments, abstract washes, isolated objects, geometric panels, or contemporary image-text relationships.
- Traditional architecture, seals, or classical scenery may appear when they support the idea, but keep them inside the compact visual cluster selected for the composition. Treat them as small fragments or accents, not as a full-page traditional scene.

Use **Traditional Ink Mode** only when the user asks for the overall poster language to feel like traditional Chinese painting, 国风, 古风, 山水, 书法, or a historically traditional composition. A small roof fragment, seal, or classical image anchor alone does not require Traditional Ink Mode. Even in Traditional Ink Mode, preserve generous negative space unless the user requests a fuller scene.

## Ink-Wash Prompt Compiler

Before writing the final prompt, identify:

- the core subject or idea;
- the intended mood;
- one imageable motif or visual metaphor;
- the visual scale: a micro editorial cluster or a larger integrated image field;
- one dominant attention channel and at most one or two quiet supporting channels;
- a deliberate paper tone chosen from the subject, mood, source-image palette, ink contrast, and intended use;
- exact short text and factual metadata explicitly intended for the image; otherwise decide whether the poster benefits from non-factual poetic/editorial microcopy and write that copy exactly before generation;
- the role of any photo or reference image;
- the intended use or aspect ratio, if supplied.

For an article, poem, memory, or abstract idea, extract one central image instead of illustrating every part of the content. If the user provides a local photo to edit, inspect it with `view_image` first.

### Text Intent Gate

Classify every user-supplied word as either **subject matter** or **approved in-image copy** before designing the poster.

- A quoted or trailing word is still subject matter when it completes phrases such as "about X", "以 X 为主题", "关于 X", or "融合成 X 的海报". For example, the final `“山”` in a photo-fusion request means the visual subject is mountain; it is not permission to print `山`, `MOUNTAIN`, or `SHAN`.
- Treat text as approved in-image copy only when the user explicitly asks to display, write, typeset, title, caption, or preserve those exact words.
- Build an `allowed in-image text` list. If typography is selected without user copy, write the exact non-factual microcopy yourself and place only that wording on the list. If a textless composition is selected, the list is empty.
- Build a separate factual-metadata list from user-supplied dates, years, times, places, issue numbers, prices, URLs, schedules, and calls to action. Never infer entries from the theme, visual era, archive styling, or reference image mood.
- The final prompt must say `Render only this allowed in-image text: [...]` and `Do not render any other words, letters, Chinese characters, numerals, years, dates, labels, captions, signs, or seal inscriptions.` When the list is empty, state `Completely textless; no typography or legible symbols of any kind.`

### Visual Rules

Use these as flexible defaults, not rigid requirements:

1. **Canvas and paper**
   - Use a flat, front-facing poster rather than a framed mockup.
   - Default to a vertical 4:5 canvas when no ratio is supplied.
   - Choose the paper color for this specific brief. Do not use the same warm off-white or beige paper as an automatic signature across unrelated outputs.
   - Derive the paper tone from the emotional temperature, subject, season or time of day, reference-image colors, ink value, accent color, and intended use. State the selected hue and material explicitly in the prompt.
   - Keep most paper colors quiet and low-chroma so they support ink rather than behave like a flat colored backdrop. Suitable directions include clear white, cool porcelain white, warm rice, pale ivory, mist gray, blue-gray, muted celadon, pale mineral green, moonlit pale indigo, dusty rose-gray, light ochre, and unbleached fiber. Use charcoal, deep indigo, or another dark paper only when the concept benefits from reversed light ink or mineral pigment.
   - Preserve tactile paper behavior through fibers, pulp variation, deckled absorption, faint stains, or subtle printing wear. Do not simulate variety with a digital gradient or a uniform color fill.
   - Repeating a paper tone is valid when it is genuinely the strongest choice, but avoid unexplained repetition when recent visible outputs already use the same paper color.
   - Reserve strongly aged, yellowed, antique xuan-paper styling for Traditional Ink Mode, historical material, archival memory, or an explicit request; do not equate all ink-wash work with aged cream paper.

2. **Composition and space**
   - Build around one clear focal subject, gesture, or relation.
   - For a theme, object, poem, or abstract brief, usually use a micro editorial cluster occupying about 8%-24% of the canvas, with roughly 76%-92% quiet paper or low-information space.
   - For a supplied photo whose identity, landscape, pose, or silhouette matters, an integrated image field may occupy roughly 35%-65% of the canvas. Keep a meaningful quiet-paper field and dissolve the image into it rather than shrinking the source into a thumbnail.
   - Treat these ranges as starting points, not quotas. Judge whether the composition breathes at full size and thumbnail size.
   - Consider upper-left, upper-right, lower-left, lower-right, true center, lower-center, left-center, and right-center as available anchor positions.
   - Choose the position that best supports the subject shape, text relationship, negative-space balance, and overall beauty; do not rotate positions mechanically.
   - State the chosen position in the prompt and keep the cluster comfortably inset from the edges. Reusing a position is fine when it is genuinely the strongest composition, but do not let right-center become an unexplained habit.
   - Let the subject float, crop, dissolve, descend, or sit off-center when it supports the mood.
   - Establish one dominant attention channel: image, typography, or geometric mark. Allow at most one or two quieter supporting channels. A detailed scene, display title, storefront sign, caption block, and seal must not all compete at once.

3. **Subject treatment**
   - Translate the content into an isolated object, partial landscape, silhouette, brush gesture, photographic fragment, ink bloom, geometric panel, or abstract relation.
   - Prefer suggestion over literal scene-building.
   - For a vague theme, avoid assembling a full historical scene. For example, "雨天" may use one small tiled-roof fragment, seal, umbrella, or distant classical street detail, but keep it compact and leave most of the paper empty.
   - If a scene is naturally detailed, simplify its perimeter, background, props, and secondary signage before reducing the subject itself. Preserve the emotional evidence, not every object.
   - When using a reference photo, state whether to preserve identity, pose, shape, horizon, spatial geometry, or only the mood.
   - When the source subject is important, preserve it at a readable scale and merge it into the paper with irregular ink blooms, diluted washes, dry-brush loss, broken contours, and paper-colored gaps. Avoid a small rectangular photo pasted onto the page unless the user requests collage, specimen, or archival-panel treatment.
   - Let some photographic detail remain crisp near the focal area while edges and less important regions dissolve progressively. Do not apply a uniform gray watercolor filter over the whole photograph.

4. **Ink and material**
   - In Contemporary Editorial Mode, choose a specific material behavior: dry-brush fracture, wet wash bloom, diluted layers, pooled pigment edge, rubbed transfer, soft photocopy grain, or an ink-absorbed photo fragment.
   - Use fine xieyi contour or controlled calligraphic strokes mainly in Traditional Ink Mode or when the concept calls for them.
   - Make paper fibers, absorption, broken edges, and tonal dilution visible enough to feel physical rather than like a gray digital filter.

5. **Typography**
   - If the user supplies only a theme, treat it as subject matter rather than mandatory in-image text.
   - Decide between textless, one small editorial phrase, or a few microtext details according to visual balance. Do not mechanically add or remove text.
   - Choose a deliberate text-density mode: textless; sparse with one short phrase; lightly annotated with two or three tiny labels; or type-led only when typography is the main concept. Do not combine every mode.
   - When the user supplies no copy and typography improves the composition, invent only non-factual microcopy that supports the theme, such as a short poetic phrase or neutral thematic label. Do not simply typeset the theme as a headline.
   - Treat dates, times, locations, venues, weather records, issue numbers, prices, URLs, schedules, and calls to action as factual metadata. Use them only when the user supplies them or explicitly asks for fictional diary/archive material.
   - For promotional, event, campaign, product, or public-information posters, never invent factual metadata. Use only supplied campaign copy; otherwise choose non-factual microcopy or a textless composition.
   - When the intended use is unclear, do not invent factual metadata. Add `no invented date, time, location, venue, schedule, issue number, URL, or CTA` to the prompt.
   - Treat every four-digit number and date-like numeric string as factual metadata. Never use a current year, decorative year, pseudo-archive date, or arbitrary number merely to make the layout feel editorial.
   - When used, keep the primary small phrase around 1.5%-3% of canvas height and secondary microtext around 0.8%-1.5%, using restrained serif, monospaced, typewriter, or clean humanist type.
   - Place text near the image cluster or in a distant area as a quiet counterpoint when that improves balance. Quote the exact wording in the image prompt so the model has something concrete to render.
   - Add a title only when the user supplies or requests one, and keep it small unless the user explicitly asks for display type. Reserve large brush lettering and vertical poetry for explicit requests.
   - Keep exact in-image text short because image models may distort long copy.
   - Treat typography as part of the composition rather than a headline. It should not compete with the image cluster unless the user asks for type-led work.
   - Count visible signs, labels inside the scene, seals, captions, and editorial copy as one shared text budget. If the scene already contains meaningful signage, reduce or remove external typography.
   - Never translate, transliterate, or repeat a theme word as extra typography unless that exact additional wording is on the allowed in-image text list. `山` does not implicitly authorize `山`, `MOUNTAIN`, and `SHAN` as three separate text elements.

6. **Color and mood**
   - Let ink value, the selected paper tone, and one optional accent form a coherent palette.
   - Adjust the ink family to the paper: neutral black or graphite on warm paper; blue-black, charcoal, or smoky indigo on cool paper; warmer carbon ink on green or ochre paper; light mineral or chalk-like pigment on dark paper.
   - Add one restrained modern accent such as yellow, cobalt, tomato red, indigo, mineral green, ochre, or a user-specified color when it helps the subject.
   - Keep the mood quiet, contemplative, tender, austere, distant, alert, nostalgic, or lightly surreal according to the brief.

### Prompt Shape

Write the final image prompt as four compact paragraphs:

1. canvas, paper, composition, and negative space;
2. subject or metaphor, placement, visual scale, attention hierarchy, and ink treatment;
3. typography density, palette, surface texture, and any reference-image preservation or fusion role;
4. style mode, mood, flat scanned-paper finish, and a short avoid-list.

In Contemporary Editorial Mode, explicitly say `contemporary minimal ink-wash editorial composition, not a full-page traditional painting scene; small traditional fragments are allowed when relevant`. Prefer concrete visual instructions over a long style essay. State the exact paper hue and material, why its temperature suits the subject, the chosen anchor position, whether the composition uses a micro cluster or integrated image field, what receives first attention, how the ink behaves, the complete allowed in-image text list, that no display title should appear unless requested, and what remains empty. For photo reinterpretation, describe what stays recognizable and how its edges dissolve into paper. End the avoid-list with explicit bans on any theme-word title, extra translation or transliteration, four-digit year, date-like string, and text outside the allowlist.

## Variation Engine

Use these axes as a design vocabulary. Choose only what improves the composition; do not fill them mechanically.

### Anchor Position

- **upper-left:** compact cluster in the upper-left quadrant, open field below and right
- **upper-right:** compact cluster in the upper-right quadrant, open field below and left
- **lower-left:** compact cluster in the lower-left quadrant, expansive quiet top
- **lower-right:** compact cluster in the lower-right quadrant, expansive quiet top
- **true-center:** centered cluster with balanced paper on all sides
- **lower-center:** centered horizontally in the lower third, open upper field
- **left-center:** cluster at mid-height on the left, open right field
- **right-center:** cluster at mid-height on the right; use sparingly and avoid repeating it across consecutive outputs

### Layout

- **micro-cluster:** a very small image-and-type cluster surrounded by 80% or more quiet paper
- **breathing-center:** a small central or lower-center subject surrounded by paper
- **low-horizon:** a low wash or landscape fragment with open space above
- **offset-specimen:** an isolated object in one quadrant with balanced type
- **quiet-corner:** tiny supporting text in one corner with a distant image fragment
- **split-fragment:** two small adjacent image panels, one neutral and one accented
- **cropped-threshold:** a subject entering from one edge with a stable quiet field
- **asymmetrical-pair:** two related fragments separated by deliberate space
- **type-led:** typography leads and ink acts as the counter-mark
- **integrated-photo-field:** a recognizable supplied subject occupies a substantial area, with irregular ink-wash edges dissolving into open paper

### Ink Gesture

- dry-brush fracture
- wet wash bloom
- diluted transparent layers
- rubbed transfer
- soft photocopy or scan grain
- ink-absorbed photographic fragment
- near-erased ghost mark

### Subject Form

- isolated object
- partial landscape
- ink silhouette
- photographic fragment absorbed into wash
- abstract texture window
- one symbolic relation between two forms
- almost image-less, led by a single brush gesture

### Visual Scale

- **micro editorial:** small image or image-and-type cluster, usually for open themes and conceptual briefs
- **integrated field:** larger recognizable subject with a substantial quiet-paper counterfield, usually for photo reinterpretation

### Reference Treatment

- **preserve and absorb:** retain the subject, pose, horizon, or identity while dissolving peripheral edges into ink and paper
- **fragment and reframe:** crop the source into one or two designed fragments when collage or editorial comparison supports the idea
- **mood only:** borrow palette, light, rhythm, or texture without preserving source geometry

### Paper Tone

- **clear or cool white:** clean, airy, snowy, precise, quiet, or high-key subjects
- **warm rice or pale ivory:** humane warmth, wood, books, memory, dusk, or intimate subjects
- **mist gray or blue-gray:** rain, lake, fog, distance, urban quiet, or reflective subjects
- **muted celadon or mineral green:** spring, plants, renewal, tea, moss, or organic calm
- **pale indigo or moonlit blue:** night, moon, winter, solitude, or cold luminous space
- **dusty rose-gray or muted clay:** tenderness, body, flowers, fading warmth, or restrained emotional work
- **light ochre or unbleached fiber:** earth, autumn, craft, history, dry landscape, or archival material
- **charcoal or deep indigo:** rare dark-paper mode for night, grief, drama, or luminous mineral marks

These are associations, not fixed mappings. Choose by overall harmony and legibility; do not rotate paper colors mechanically.

### Type Mode

- textless when visually stronger for the concept
- small poetic/editorial phrase with exact wording
- tiny theme label used as metadata, not a headline
- small supplied title, only when requested
- non-factual archive-like microtext
- fragmented floating letters
- tiny editorial caption
- loose type near the ink edge
- user-supplied date, location, or index only

## Workflow

1. Parse the user's content.
   - Identify subject, mood, intended use, useful text, supplied factual metadata, possible metaphor, reference-image role, preservation priorities, and requested format.
   - If no copy is supplied, decide whether textless or restrained invented microcopy produces the stronger composition.
   - Never infer a date, time, location, venue, issue number, schedule, URL, or CTA from the theme alone.
   - Run the Text Intent Gate. Do not treat quotation marks alone as permission to place a theme word in the image.

2. Choose a visual recipe.
   - Select Contemporary Editorial Mode by default; use Traditional Ink Mode only from explicit cues.
   - Choose micro editorial scale for most open-ended briefs or integrated-field scale when a supplied photo should remain legible and present.
   - Choose the most aesthetically balanced anchor position, layout, ink gesture, subject form, reference treatment, type mode, paper hue and material, and optional accent.
   - Select the paper tone from the brief and source palette, then check that the ink and accent remain legible. Do not fall back to warm ivory merely because the work is ink-wash.
   - Set one dominant attention channel and reduce all supporting elements. Decide the text-density mode from the final hierarchy rather than from a fixed quota.
   - Consider recent visible outputs as a diversity cue, but reuse a position when it remains the strongest choice. Avoid automatic right-center placement across unrelated themes.
   - Keep the choices coherent with the content rather than filling a checklist.

3. Write the final prompt.
   - Use the four-paragraph Prompt Shape.
   - Make the composition and material behavior explicit.
   - Name the chosen anchor position. When text is used, quote the exact small text to render; when textless, say so explicitly.
   - State the visual scale, first-read element, supporting elements, and what has been intentionally omitted. For reference photos, state both preservation priorities and the ink-to-paper edge transition.
   - Name the exact paper hue, temperature, fiber or surface character, and its relationship to the ink palette. Avoid vague wording such as only `textured paper`.
   - If the user did not supply factual metadata, explicitly exclude invented dates, times, locations, venues, schedules, issue numbers, URLs, and CTAs.
   - Include the complete allowed in-image text list and require the image model to render no text outside it. Explicitly ban numerals and four-digit years when none were supplied.

4. Generate the image.
   - Use the built-in image generation capability with the final prompt.
   - Do not stop after writing the prompt unless the user requested prompt-only.

5. Inspect the result.
   - Check the subject, composition, ink/paper feeling, unwanted additions, and thumbnail readability.
   - Inventory every visible word, character, numeral, date-like mark, sign, and legible seal. Compare the inventory with the allowed in-image text and factual-metadata lists.
   - Any unapproved title, translated or transliterated theme word, numeral, year, date, label, caption, sign, or legible seal is a hard failure, even when the rest of the image is attractive.
   - On a hard text failure, regenerate once with a targeted correction that names the unwanted content, repeats the complete allowlist, and requests its removal. Do not return the first failed image as the final result.
   - If the second result still contains unapproved text, report the remaining defect honestly rather than claiming the review passed.
   - For non-text visual misses, tighten the prompt around the main problem and regenerate once.

6. Return the final image and prompt.

## Default Avoids

Avoid by default: invented dates, four-digit years, times, locations, venues, schedules, issue numbers, URLs, CTAs, pseudo-archive numbers, or other factual-looking metadata; any unrequested title; automatic translation or transliteration of the theme; text outside the explicit allowlist; oversized brush lettering; a full-page traditional scene; oversized architecture; large decorative seals; or multiple classical motifs competing for attention. Small traditional buildings, seals, lanterns, umbrellas, classical street fragments, or antique scenery are allowed when relevant, but subordinate them to the chosen hierarchy and retain a meaningful quiet-paper field. Also avoid using the same aged cream or warm beige paper for every subject; arbitrary paper-color rotation unrelated to the brief; saturated digital background fills; gradients used as fake paper variation; a detailed scene competing with a title, signboard, caption block, and seal; reducing an important reference photo to a tiny pasted rectangle; uniform watercolor-filter treatment; glossy 3D mockups; cinematic lighting; neon effects; crowded collages; generic stock-photo polish; too many competing objects; and long dense text.

## Output Format

````markdown
**生成图**

![Ink-wash poster](absolute-image-path-or-rendered-image)

**最终 Prompt**

```text
[final prompt used for image generation]
```

**说明**

- Mode: [Contemporary Editorial / Traditional Ink]
- Recipe: [visual scale / anchor position / layout / attention hierarchy / ink gesture / subject form / reference treatment / type density / paper / accent / mood]
- Allowed in-image text: [exact list, or none]
- [one short note about the content interpretation or regeneration]
````

If the generated image renders directly without a file path, show it normally and still include the final prompt.

## Quick Review

Before returning the result, check:

- Did an underspecified request use Contemporary Editorial Mode rather than defaulting to traditional imagery?
- Did the content become one clear image or relation?
- Did the visual scale fit the material: micro cluster for an open brief, or a larger integrated field for a recognizable reference subject?
- Is there a substantial quiet-paper or low-information field appropriate to that scale?
- Is there one clear first-read element, with no more than one or two quiet supporting channels?
- Does the choice between textless and microtype feel aesthetically deliberate?
- If typography is present, is it clearly subordinate rather than behaving like a large title?
- Does every date, time, location, venue, schedule, issue number, URL, or CTA come directly from the user or an explicit fictional-archive request?
- Does every visible word, character, numeral, sign, and legible seal appear on the allowed in-image text or factual-metadata list?
- Was a quoted theme correctly treated as subject matter rather than automatically rendered, translated, or transliterated as a title?
- If the user supplied no year or numeric metadata, is the image free of four-digit years, dates, and decorative numbers?
- For promotional or public-information work, is all factual metadata supplied rather than invented?
- Was the user's theme treated as content rather than automatically rendered as a title?
- Do ink and paper feel material rather than digitally filtered?
- Does the paper hue support this subject, mood, source palette, and ink contrast rather than repeating the same warm off-white by habit?
- Is the selected paper color low-chroma and materially believable, without a digital gradient or flat saturated fill?
- Does the selected layout and gesture fit the mood?
- If traditional architecture, a seal, or classical scenery appears, is it a small fragment or accent rather than a dominant scene?
- If a reference photo is important, does the result preserve its key subject or geometry at a readable scale and dissolve peripheral edges naturally into the paper rather than presenting a pasted thumbnail?
- Does the anchor position feel deliberately chosen for this composition rather than mechanically defaulted to right-center?
- Does the poster still read at thumbnail size?
- Was the image actually generated?

## Example Requests

- "用 $ink-wash-poster 做一张关于春雨的海报"
- "把这句诗做成一张留白很多的水墨海报"
- "用这张照片做一张水墨编辑封面，保留人物姿态"
- "把这篇文章的核心想法转成一张抽象水墨 poster"
