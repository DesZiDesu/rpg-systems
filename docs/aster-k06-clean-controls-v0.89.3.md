# K06 close control and hinge cleanup — 0.89.3 / Aster Phone 1.2.3

Removed the translucent white title bar and repeated ASTER K06 label. Only a borderless close button remains above the handset, with a 44 px touch target. This applies to desktop and mobile. The complete flip phone continues to fit the mobile viewport.

The small shapes directly above the hinge were the tops of the decorative `A S T E R` lettering. That lettering extended into the hinge's area and was partly covered by it. The redundant lettering is removed from the handset markup, leaving a clean seam.

The physical earpiece remains the visible desktop drag handle. Settings/contact scrolling, picker placement, keyboard viewport handling, saving, TH/EN and the physical keypad are unchanged.

Validation: the 1,998 unit/host tests, syntax checks and diff whitespace checks pass. Actual SillyTavern 1.19.0 layout checks cover desktop Chromium, mobile Chromium and mobile WebKit. They assert one visible close control, a transparent title-control container, no clipped branding, complete handset bounds, form saving, scrolling and pickers, TH/EN and fold/open. Desktop also checks dragging from the earpiece. Mobile checks 320 × 568, 390 × 844, 430 × 932 and 844 × 390, plus a reduced keyboard viewport. These use browser emulation, not a physical iPhone; native touch scrolling is exercised in Chromium, while WebKit uses DOM scrolling due to automation limitations.

Update RoleForge to **0.89.3** and Aster Phone to **1.2.3**, then reload. Existing settings and phone history are preserved.
