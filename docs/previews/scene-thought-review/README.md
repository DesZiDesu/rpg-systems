# Scene Status / Inner Thoughts review

This gallery imports the production renderers and styles for all five existing
chat themes. It does not mount the extension or mutate a chat. Serve the
repository over HTTP; ES modules do not run from a direct `file://` link.

The self-contained HTML delivered with the test artifacts is built with:

```sh
node tools/build-scene-thought-preview.mjs
```

It includes its fonts, CSS and rendered components and requires no external
assets. Its theme and desktop/mobile-width selectors and scene-detail disclosure
remain interactive. Component previews are distinct from the actual SillyTavern
screenshots produced by `tests/scene-thought.real.browser.mjs`.

See `docs/scene-thought-v0.75.0.th.md` for behavior and the validation report.
