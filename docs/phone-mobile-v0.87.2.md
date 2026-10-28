# Aster Phone mobile and rendering improvements — RoleForge 0.87.2

The reported mobile screenshots exposed a Harbor Store banner whose heading inherited light dark-mode text over a pale background, a very small close control and an understated deferred-reply selector. Inspection also found that every refresh rebuilt the phone screen, including while closed. An incoming update could recreate the composer and always scroll the conversation to the bottom.

## Changes

- A paint reads one runtime snapshot. Phone-only state access avoids notebook rule/identity scans. Unchanged screens and closed phone content do not rebuild; background calls and AI replies still run.
- Conversation updates retain the form, textarea, selection and current draft. Older-message readers keep their position. Readers at the end follow new bubbles. The composer grows to fit several lines, up to a bounded height.
- A conversation initially mounts 80 bubbles, with older batches available through **Load earlier messages**. All messages remain stored. While browsing older messages, new arrivals retain the start of the loaded window.
- Submitting twice while a save is in progress does not duplicate a message. A newer draft typed while that save is pending is retained and saved separately.
- Opening the phone clears an already focused external text field. Closing blurs the phone before hiding it and does not focus the main chat. Hidden updates never restore text focus. The mobile shell follows both the size and offset of the visual viewport; resize/scroll handling is grouped into animation frames.
- Mobile has a separate 44 × 44 px close target in the status row. Desktop retains its external close control and draggable shell.
- Harbor Store uses an explicit dark-on-cream banner palette in both themes. Open/Get and Remove have consistent positions. Secondary text and timestamps are more readable; single-person conversations omit repeated identical sender/header labels. Group senders and differing public profile names remain visible.
- The reply mode is a labeled control below the composer. The pending indicator stays compact beside **Reply now**. Deferred mode still waits for the next main-story response; it is not a failed send.
- New labels support Thai and English. No migration, reset or change to existing phone progress is required.

## Verification

`npm run test:phone:layout:real` imports a disposable test card into a real local SillyTavern instance. It checks banner contrast, unchanged/closed refreshes, stable textarea identity and cursor, saved drafts, a send/save race and duplicate submission, 1,000-message history, loading older batches, scrolling during incoming updates and mobile widths from 320 to 430 px.

The mobile keyboard check explicitly reduces and offsets the browser's visual viewport. Chromium touch emulation and WebKit are used; this is not a physical iPhone keyboard test. Fixture messages illustrate the UI and are not recovered private chat text. No external model or voice account is used.

The pre-fix baseline rebuilt the conversation on all 20 unchanged refreshes, mounted all 1,000 test bubbles and pulled an older-message reader to the bottom. The updated screen performs zero content rebuilds on those refreshes and initially mounts 80 bubbles. Banner heading contrast improves from approximately 1:1 in dark mode to at least 8.8:1 in either theme. Elapsed browser timings depend on the test machine and do not measure model generation speed.

The existing phone integration suite separately exercises messaging, deferred replies, contacts, uploads, groups, calls/Voice, social activity, wallet and app settings. The story-sync regression covers the prior alias and missing-inbox fixes.

Release validation: **1,929 unit tests passed** and syntax checks passed. The full phone integration walkthrough, including acknowledged save failures, reload and branch restoration, passed on Chromium desktop and touch-mobile. Layout/focus/draft/history checks passed on Chromium desktop, Chromium touch-mobile and WebKit mobile. Voice tests use a local synthetic provider fixture; the native test waits for actual reply/audio delivery rather than assuming it finishes during a screenshot pause.
