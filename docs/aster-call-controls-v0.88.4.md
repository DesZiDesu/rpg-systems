# Call controls — RoleForge 0.88.4 / Aster Phone 1.1.4

Incoming-call buttons shared the 58 px circular icon styling while still containing raw Accept/Decline text. The captions overflowed their fixed-height buttons, inherited the 23 px icon font and crowded each other.

Call actions now use a transparent button containing a circular icon and a separate 13 px caption below it. Both remain part of the same accessible touch target. Decline appears on the left and Accept on the right. Active-call mute, speaker and end actions use the same layout, with pressed-state feedback on the icon circle.

The local SillyTavern browser checks cover desktop 1920×1080 and mobile 390×844 emulation, English/Thai and light/dark themes. Geometry assertions verify captions stay below icons and within their touch targets, and neighboring actions do not overlap. Interaction checks cover accept, decline, mute, speaker and end. Mobile WebKit also passes. No physical iPhone or external AI/voice provider was used.

Update RoleForge and reload SillyTavern. Aster Phone 1.1.4 is available in Workshop; existing phone data and preferences remain intact.
