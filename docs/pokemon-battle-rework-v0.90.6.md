# Pokémon 1.3.0 battle presentation

Battle cinematics animate the actual battle arena and its current Pokémon artwork, not a separate dialog. The arena uses a 16:9 layout on desktop and mobile. Encounter, move, switch, capture success/failure, victory, defeat and escape effects follow successfully saved actions and can be skipped; reduced-motion and the character motion setting are respected. The party command opens a switch panel inside the battle screen. HP, maximum HP, status, EXP, level and gender are displayed from game state where available.

Choose Original or Classic Dark and enable or disable menu sounds in Pokémon settings. These preferences belong to the current character. The menu-confirm audio asset was provided by the user; playback is triggered by user interactions and browser autoplay restrictions may apply. This release uses a single button sound, not battle sound effects or background music.

Game events remain the source of truth. A rejected or failed save cannot play the outcome. Long battles, conditions and catches continue to use the existing mechanics; the animation does not implement individual capture shake rolls. Audio and visuals can be turned off independently. The compact chatbar window remains a compact interface; the full in-arena cinematic is shown when the full Pokémon window is open.
