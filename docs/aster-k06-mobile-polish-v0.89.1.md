# Aster K06 mobile layout repair — RoleForge 0.89.1 / Aster Phone 1.2.1

The K06 now presents its LCD interface across the available mobile viewport. The physical handset, hinge, keypad and surrounding backdrop remain on desktop. Mobile has persistent Menu, Settings, fold/open and Close controls, plus the three LCD soft keys.

## Why the previous layout was difficult to use

The old mobile rule made the **outer window** fullscreen, then scaled the entire 330 × 754 px handset inside it. It did not make the actual phone screen fullscreen. On the 390 × 844 test viewport, Settings had only a **278 × 219 px** scrolling area, surrounded by the hardware rendering. The rigid LCD height, small form controls and host styling made touch interaction awkward.

The option picker also lived inside the scrolling page. Its absolute position was tied to the page's scroll origin, so opening a lower setting could put the choices above the visible screen. Eleven-pixel text inputs additionally permitted automatic input zoom on iOS. SillyTavern's global checkbox pseudo-element clipped the switch thumb into a checkmark.

A native Chromium touch swipe did scroll the old layout in the test environment. The report therefore does **not** claim to have reproduced every physical iPhone scroll lock. It reproduces the cramped layout and fixes the layout, picker positioning, keyboard viewport handling and host-style interference together.

## Changes

- Full-width mobile LCD with a continuous flex height chain; no handset frame or keypad occupies the touch viewport. Touch landscape phones use the same layout.
- A bounded scrolling page with momentum scrolling and contained overscroll. Status and soft keys stay outside the scroll area.
- Larger labels, 16 px input text and touch-sized controls; multiline contact notes and an explicit Save soft key.
- Visual viewport sizing and focused-field visibility when the software keyboard reduces the space available. Typed form values survive rendering.
- Pickers mount over the visible LCD, independently of the underlying page's scroll position. Closing a picker retains that position; navigation discards an obsolete picker.
- Circular switch thumbs isolated from host checkbox clipping; motion preferences apply to the actual UI root.
- The fixed mobile header provides access to Menu, Settings, fold/open and Close. Desktop retains its physical controls and draggable window. Landscape touch layouts cannot accidentally start a desktop drag.
- The call-screen center soft key now performs its displayed Answer/End action.

There are no new phone databases or save-schema migrations. Character configuration, contact IDs, messages, calls, images, branch history and pending work use the existing Aster runtime. Closing the window still permits generation to finish in the background.

## Validation

| Check | Result |
| --- | --- |
| Full unit/host suite | 1,998 passed, zero failures |
| JavaScript syntax checks and diff whitespace | Passed |
| Actual SillyTavern 1.19.0, desktop Chromium | Layout, mouse-wheel scrolling, picker after scrolling, contact saving, TH/EN and desktop hardware passed |
| Actual SillyTavern, mobile Chromium | Native CDP touch swipe, fullscreen LCD, contact saving, reduced keyboard viewport, picker placement and fold/open passed |
| Mobile dimensions | 320 × 568, 390 × 844, 430 × 932 and touch landscape 844 × 390 passed |
| Mobile WebKit | Fullscreen, forms, scrolling positions, pickers, reduced viewport and language checks passed |
| Full Aster K06 integration, desktop and mobile | Workshop 1.2.1 update, inbound mail/new contacts, attached image, background and deferred replies, SMS, outgoing/incoming calls, optional voice, camera journal, portal, notes, story alarms, relationship/time synchronization, reload, handset switching, swipes, deletion and branch restore passed |

The mobile scrolling page now measures **390 × 710 px** on the same 390 × 844 viewport. Status, header and touch soft keys use the remaining space.

The automated keyboard check reduces the browser viewport and verifies focus, text preservation and saving; it is not a physical keyboard test. Mobile WebKit's Playwright API cannot send native swipes or mouse-wheel events, so its scrolling check uses DOM scrolling. Chromium checks a real browser touch gesture. AI/voice integration uses controlled local responses and a test audio fixture; no paid model request is required.

Regression entry points: `tests/keitai-layout.real.browser.mjs`, `tests/keitai-release.real.browser.mjs`, `tests/keitai.test.mjs`.

## Updating

Update RoleForge to **0.89.1** and reload SillyTavern. In Workshop, update **Aster Phone to 1.2.1**. Keep the existing Aster K06 handset selection; no reinstall or reset is required. The handset layout adapts automatically to the screen.
