# Multiple NPC reference images

NPC Management’s create/edit screen accepts up to six AI reference images. Use **Add reference images** to select several together or append another batch. Each thumbnail has an optional look label (for example, Casual or Battle armor) and its own Remove control. The UI supports English and Thai. Upload preparation is atomic: an invalid file or over-limit selection preserves existing references.

Enable image reading and press **Generate NPC from description** or **AI: fill empty fields**. The configured SillyTavern connection must support vision and have media inlining enabled. Each image is inspected in a separate quiet vision request because the host’s quiet-image interface accepts one image. A subsequent text request generates the NPC draft. No image is sent just by selecting it. Attribute-only generation and explicit image opt-out do not send references.

Numbered/labelled descriptions keep alternate looks separate. The first reference is the default unless the concept specifies otherwise. The combined summary fits the existing 1,000-character appearance field, reserving space for every attached look; lengthy descriptions are shortened per look. More references therefore trade description detail for coverage. Labels help the model distinguish outfits/forms; they are supplied as data, not instructions.

References are temporary editor attachments. They survive rebuilding the generated draft, but are released when leaving the editor or saving. Their visual descriptions are saved with the NPC; the image files themselves are not added to the card, chat metadata or portrait storage. The main chat portrait remains a separate upload. If no reference is attached, image reading continues to use that portrait as before. Automatic portrait changes and a persistent look-image gallery are outside this change; existing NPC alternate profiles remain available for separately saved versions.

If any image cannot be read, the draft is unchanged. Leaving the editor while awaiting a reply prevents later reference requests and draft replacement. An already dispatched provider request may still complete.

## Validation

- `npm test`: 1,941 passing release tests, including multiple looks, bounded summaries, opt-out, a later-image failure and leaving during generation.
- `npm run check`: passed.
- `CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/npc-workspace.browser.mjs`: batch append, removal, label preservation, six-image limit, legacy single-image/portrait behavior and the existing workspace flow passed.
- `ST_REAL_URL=http://127.0.0.1:18230 node tests/npc-references.real.browser.mjs`: real local SillyTavern frontend/server, desktop 1920×1080 and mobile 390×844 touch emulation. Two distinct reference reads followed by one draft request; both looks saved, references retained through draft rebuilding, no portrait assignment or reference bytes persisted. Model responses were controlled local fixtures; no paid provider was used.

Available in RoleForge 0.88.2.
