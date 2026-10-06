# Character Forge 0.58.10 — mobile keyboard focus

Tapping a field on iPhone can bring up the keyboard while leaving only a thin form border above a blank chat area. This is a layout/focus problem, not lost character data.

The old host fitter calculated the form height from the intersection between the chat rectangle and the visual viewport. While Safari pans the viewport to a focused control inside an iframe, that intersection can temporarily be empty or only a few pixels high. The fitter then set the whole iframe to 1px. Its fields also used 13px text, below Safari's usual 16px threshold for automatic input zoom.

Touch controls now use 16px text without disabling user zoom. An empty or thin panned viewport intersection falls back to the chat/visible viewport height. Focus and resize events keep the selected control visible by scrolling the form itself; an entirely displaced card is brought back into view. Focus listeners are rebound after iframe reload and removed when the card disappears. The existing theme, draft and profile formats remain intact; desktop pointer controls retain their previous text size.

## Validation

The new keyboard-pan regression fails against the unchanged 0.58.9 layout module. The updated production-loader browser checks cover 320/390px touch screens and 1280px desktop, a simulated viewport pan completely beyond the iframe, a 4px intersection, switching focused fields, resizing to a keyboard-sized viewport, restoring full height and persisting typed data. These extend the existing draft reload, theme/contrast, overflow, optional skill, preset, Arsenal, Party/Guild and BEGIN checks.

All 1,058 unit/host tests and syntax checks pass. Startup and native drawer checks cover current/legacy loader and mobile/desktop layouts. Actual and fallback fonts are checked in Chromium. The visual viewport pan is simulated: this environment cannot open the iOS keyboard or certify behavior on a physical iPhone. The previously documented combined-commerce fixture limitation is unchanged; this release changes Forge layout/focus and asset cache versions.
