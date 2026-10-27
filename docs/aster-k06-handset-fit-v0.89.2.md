# Complete K06 handset on mobile — 0.89.2 / Aster Phone 1.2.2

The mobile version now shows the complete flip phone, like desktop: frame, LCD, hinge, physical keypad, charm and fold controls. It fits within the available viewport over a transparent background. This corrects the LCD-only mobile layout introduced in 0.89.1; that design misunderstood the requested appearance.

Scaling considers both width and height, including small phones, touch landscape and the reduced viewport when typing. The keypad and hinge remain visible during input. Desktop retains its draggable window.

The useful fixes from 0.89.1 remain: independent LCD scrolling, visible option pickers after scrolling, stable form values, multiline contact notes, the Save soft key, switch styling and reduced motion. Focused-field scroll distances account for the handset's actual scale.

Validation uses actual SillyTavern 1.19.0 with Chromium desktop/mobile and mobile WebKit. Layout checks require the complete handset to be visible and within viewport bounds at 320 × 568, 390 × 844, 430 × 932 and 844 × 390. They also cover Settings scrolling, lower-page pickers, TH/EN, contact saving, software-keyboard viewport simulation and fold/open controls. Chromium uses a native browser touch swipe; mobile WebKit uses DOM scrolling because Playwright cannot dispatch its native swipe/wheel gesture. These are browser tests, not a physical iPhone test.

The full mobile integration test exercises Workshop installation, the physical keys, incoming mail/contact creation, attachments, background/deferred responses, SMS, calls/voice, photos, the portal, notes/alarms, reload, handset switching, swipe/deletion undo and branch restore with controlled local AI/voice fixtures. The full unit/host suite passes 1,998 tests; syntax and whitespace checks pass.

Update RoleForge to **0.89.2** and Workshop's **Aster Phone to 1.2.2**, then reload. Existing phone settings and history remain intact.
