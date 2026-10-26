# Phone time, body-profile filling and settings — 0.88.5 / Aster 1.1.5

Phone-only exchanges previously stamped the existing world time without advancing it. The body-profile fill button only redrew its panel, never starting the existing fill operation. Phone switches also inherited SillyTavern's checkbox checkmark pseudo-elements, overriding their intended sliding handle.

## Shared story time

- A successfully sent player message or phone speech advances the shared clock by 1 minute, 2 for longer text or 3 for very long text. Starting an outgoing call takes 1 minute. Drafting, editing profiles/messages, reading and changing settings do not advance time.
- Standalone NPC replies can provide `elapsedMinutes` on each message, call speech or call result. Normal bubbles should take about 1–3 minutes; a grounded delay can take up to 10. Invalid/missing timing falls back to a small text-length estimate. Exaggerated delays are bounded, with time reserved for later bubbles so they still advance. A normal reply batch stays within 30 minutes; unusually large batched requests reserve at least a minute per event.
- Messages receive the resulting sequential timestamps. Midnight updates the day, day name and phase, including English/Thai weekdays. Only accepted events advance time. Failed generation, blocked/invalid events and duplicate delivery do not consume time again.
- Main-chat phone events and historical story recovery use the scene's established time without advancing it twice. A future appointment mentioned in a message is not a command to skip ahead.
- Clock changes and phone records save together through the existing RPG transaction and timeline journal. Scene/status state, agenda checks and subsequent AI prompts receive the shared clock. Bounded recent phone messages, including timestamps, enter the private phone context so the next main-chat continuation retains the conversation and arrangements. Private-thread knowledge boundaries remain explicit.
- Swiping, returning to a variant, deleting its originating reply and reloading restore the clock and phone history together. Existing historical timestamps are not rewritten retroactively.

## Profile filling and language

The fill action now starts the generation job for the button's NPC, disables duplicate clicks, shows loading text and removes the action once all required fields are present. Existing and concurrently confirmed values stay intact. Blank model text falls back to neutral initial values rather than leaving an incomplete field. Saves are acknowledged before reporting completion; failures expose retry feedback. Generated assumptions remain marked as such.

H-Stats fields, sections, fill/loading feedback and touched static controls display one selected interface language. New generated text is requested in that language; neutral fallback text follows it too. Saved NPC prose, user content and confirmed profile values are not silently translated. Phone settings display localized option labels instead of internal values such as `inherit`, `deferred` or `both`.

## Switches and mobile layout

Settings keep their accessible checkbox `role=switch`, with a separate visual track and thumb. Host checkmarks cannot replace that thumb. Styling includes a 44 px touch area, rounded track, shaded handle, checked/pressed feedback, keyboard focus outline and reduced-motion support.

Where supported, the phone uses a manual nonmodal popover as its overlay portal. This escapes SillyTavern's transformed document, which could otherwise scroll the fixed phone header away in mobile Chrome after typing. It keeps the phone's current viewport sizing and leaves background interaction available when the phone is closed. Older browsers without the Popover API retain the previous overlay path.

## Verification

Unit checks cover timing, limits, duplicate/denied events, midnight/phase changes, recovery without double counting and prompt context. The actual H-Stats click-handler test checks loading, duplicate-click protection, Thai generation instructions, blank fallback handling and preserved values.

Native local SillyTavern browser runs use controlled provider responses: desktop and mobile Chromium, plus mobile WebKit. They cover sequential timestamps, future appointments, main-chat prompt context, switch toggles, English/Thai labels, body-fill loading/completion, saved data and reload. Timeline checks cover clock/history restoration on swipe, return and deletion. Browser mobile emulation is not a physical iPhone test.

Update RoleForge, reload SillyTavern and update Aster Phone to 1.1.5 in Workshop. Existing phone data and preferences are preserved.
