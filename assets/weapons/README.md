# Weapon artwork

These are **2D illustrations and sprites**, not downloadable 3D meshes. This
directory contains only production assets; reviews and GIF captures belong in
`docs/previews/` or test artifacts, not in the runtime asset catalog.

| Directory | Files | Original bytes | Purpose |
| --- | ---: | ---: | --- |
| `generic/` | 34 SVGs | 112,837 | Original vector illustrations, one per category |
| `special/` | 2 JPEGs | 74,308 | Approved user-supplied Excalibur/Ea reference images |
| Total | 36 | 187,145 (182.8 KiB) | No duplicate files or animation-frame sequences |

`src/weapon-catalog.js` owns the stable category IDs, exact-name aliases and local
asset URLs. URLs carry the installed release version to avoid stale art caches.
Adding a model to the catalog **never grants the corresponding inventory item**.
Only a positive-quantity owned item can resolve to an equipped view. Automatic
Fate art uses exact aliases; unrelated names containing `ea` do not match.
Authors can explicitly choose special art in a scoped weapon profile.

## Generic source

Run `node tools/generate-weapon-models.mjs` from the repository root to reproduce
the original transparent 960×300 SVGs. The generator needs only Node, writes no
remote content and makes no model/API calls. Filenames are lowercase category
IDs. The vectors have no scripts, embedded HTML or remote image dependencies.
Keep the generator and generated assets together so shapes remain editable.

## Special source and motion

The two JPEGs are unchanged copies of images supplied for this project:

- `special/excalibur-front.jpg`: 719×1200, 35,403 bytes;
  SHA-256 `9aaa8beec4db29e5a9b36b250db272600c2ed8c4dc04d6d2c84f8a5a5302ddaf`.
- `special/ea.jpg`: 1200×248, 38,905 bytes;
  SHA-256 `3f5d5392f8aa915cadd08539ccee3151973b0dc3469cd038602dba57de084adb`.

Reference artwork retains its original ownership. These files are not the source
for the generic illustrations and are not represented as new original artwork.

`src/weapon-art.js` draws the approved effects at runtime. Excalibur preserves
the front-view proportions with a uniform quarter-turn and a separate blade-light
layer. Ea projects its reference texture onto three 2D cylinders; the middle
rotates opposite the upper/lower sections. Its unseen rear uses the photographed
pattern, not a newly reconstructed 3D surface. Background keying is a temporary
Canvas sprite operation and never rewrites the JPEGs.

Only the selected image loads in the chatbar. Ordinary SVG/custom images do not
animate. Special animation runs only while active, visible and allowed by Reduce
Motion; minimizing, hiding the tab or switching owner stops its animation loop.
No GIFs, videos or captured frames are required by the installed extension.

## User images and saved state

Uploaded custom artwork is resized to at most 768×320 and stored as a WebP data
URL of at most 96 KiB in **the chat/card weapon preset**. Profiles are capped at
64 and the portable profile JSON at 768 KiB, within the existing preset budget.
HTTPS image URLs are also supported, but need the external image host to remain
available. Upload an image when portability/offline access matters.

Runtime state stores item IDs, equipment, known loaded counters and event
receipts. It does **not** store image copies, model files or meshes in every
checkpoint. Prompts contain only owned item/resource facts, never artwork, image
URLs or the full visual catalog. Preset/card export carries custom uploaded art
once as configuration. Disabling the feature does not delete equipment progress.
