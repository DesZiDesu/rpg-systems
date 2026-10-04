# ROLEFORGE — v0.54.0

## v0.54.0 — Optional ElevenLabs dialogue voices

- Add **RoleForge Voice Addon** as a separate native Extension Settings drawer. Voice and Memory Addons default to off; saved opt-in choices remain intact. Connect a dedicated ElevenLabs key independently of the text-generation connection. Keep keys out of prompts, chat metadata and exported settings; optionally remember an encrypted key in this browser on HTTPS/localhost, with session-only keys on plain HTTP.
- Add compact grayscale **Play / Pause / Resume / Cancel**, stop and per-NPC voice-settings buttons beside dialogue, plus a play-all queue. Preserve clickable NPC headers and canonical aliases with Chat / Character scope. Use Eleven v4/v3 through the official Text to Dialogue API, account My Voices and public Library search/add, existing voice samples, a deliberate quota-consuming test and local playback speed.
- Teach the normal story reply and commerce continuation task to include optional hidden delivery directions. Read only dialogue, including spoken NPC incantations; create no extra story-model request for emotion analysis. Audio generation is manual by default, with optional autoplay after a completed new reply. Cache audio across replay/reload, bound stored clips, cancel stale queues on edits/swipes/regeneration/chat changes, and display native notifications at the voice API request boundaries.
- Display provider quota, reset date and last refresh; keep read-permission failures separate from usable speech. Do not infer dollars or exact v4 speech allowance from legacy quota fields. [Thai usage and UI](docs/voice-addon.th.md) · [interactive production UI preview](docs/previews/voice-addon.html) · [mobile/desktop screenshots](docs/previews/voice-v0540/index.html).
- Validation: **780 unit/host tests**, syntax checks and production-loader browsers at **320 / 390 / 1280 px** for Voice, existing optional systems and Memory. Voice tests use controlled provider responses, real browser audio and encrypted IndexedDB; no live ElevenLabs account or paid voice requests are used.

## v0.53.2 — Actual trade intent, inline room offers and property keys

- Read the whole player role-play in the normal reply and emit an evidence-backed buy/sell/none intent. Buy/sell composers open only from a validated current NPC offer, never a keyword-driven waiting strip. Mentions, refusal, past sales and hypothetical plans do not open commerce. Real catalog/price inquiries and owned-item sale requests still work; classification adds no API call.
- Accept a room/property key label derived from the exact disclosed place when the same seller presents its physical key. Keep wrong-place keys rejected. Compile a fully explicit Thai inn menu locally when its object is omitted: only quoted prices, visible keys, inclusions/rules and an unambiguous checkout on the story clock are used. Missing facts, deposits or ambiguous menus require proper AI data; no automatic second catalog request runs.
- Keep the full house/room/building name and price in permanent purchase lists, but deliver a named owned key to Inventory with its permanent ownership scope. Temporary stays retain timed access keys. Property quantity is one; receipts report the actual delivered key, and payment/delivery remain once-only after confirmation.
- [Thai behavior and production UI gallery](docs/commerce-intent-keys.th.md). Validation: 757 unit/host tests and syntax checks; real-loader browsers with controlled provider replies at 320/390/1280 px cover intent, room/property keys and existing commerce/training/optional systems. No user live-model account is called.

## v0.53.1 — Complete inline buy data, formatted continuations and mobile training

- Align every shop schema/example with complete per-item descriptions and typed purchase terms in the normal reply, including swipe/regenerate. Overnight rooms use timed access and an explicitly disclosed key. Missing legacy room terms cannot silently become permanent ownership; inspect/cancel remains available. Remove automatic follow-up catalog API tasks from normal buy/sell replies; retain the recovery implementation and existing auction recovery behavior.
- Require narrative/dialogue markup in commerce button continuations. Locally wrap loose legacy prose, preserve existing speech blocks and remove embedded reasoning without another API request. Show each selected item's description, properties and terms in its basket details.
- Use a separate native JSON task for training when available, with a larger response budget and a compatible single-request legacy fallback. Accept complete fenced/wrapped training results after reasoning; reject prose-only, truncated, incomplete or conflicting results without awarding mastery or automatically retrying. Expose raw failure details and clear them after a valid result.
- Make training grid tracks and buttons shrink to the mobile panel width, wrap long text, and use one column on narrow screens. Keep independent tabs, minimize/close and cancellation behavior.
- Validation: 745 unit/host tests, syntax checks, production-loader browsers at 320/390/1280 px for inline room purchase and narrative rendering, native training, rejected-result diagnostics and existing commerce/boards/rights regressions. Model responses are controlled fixtures. [Thai diagnosis, behavior and UI screenshots](docs/commerce-training-fixes.th.md).

## v0.53.0 — Permanent purchases, rentals, access and prepaid services

- Extend the existing NPC shop list with explicit purchase types. Ordinary goods stay permanently owned; rental assets and access keys link to saved contracts; prepaid services open tracked orders and deliver their agreed output only after the provider confirms completion. Track story-clock deadlines, relative durations, single/multiple uses and permanent access. Expiry never silently deletes held keys, charges another period or refunds a deposit.
- Disclose refundable deposits alongside the price before consent. Settle the basket price plus deposits once; record actual returns and confirmed full/partial refunds from the normal reply without another API call. Protect rented/access assets and items with service providers against resale and ordinary deletion. Preserve older goods, receipts and saved chats; legacy room/service catalogs without types can be inspected/cancelled but need a complete regenerated reply before purchase.
- Add compact neutral buy controls with per-entry terms, linked Inventory cards, expiry/use/order states, refund balances and collapsible history. Keep independent composer tabs and flat minimize behavior. AI receives complete schemas for opening, delivery, actual use, return, completion and refund in the same story patch, including swipe/regenerate; renewals require a new offer and purchase consent.
- [Thai mechanics, supported scope and UI gallery](docs/commerce-rights.th.md). Browser tests use the real loader and controlled provider replies at 320/390/1280 px; ordinary catalogs and lifecycle updates add no API calls. Explicit game buttons retain their existing native tasks and API notifications.

## v0.52.3 — Current inn prices in the normal buy reply

- Accept a present named NPC price menu such as “ถ้าเป็นห้องพักธรรมดา...คืนละห้าเหรียญเงิน” as current alternatives, rather than treating every conditional pricing phrase as a hypothetical visit. Validate the exact speaker, quote, item names and each option’s quoted price/currency. Keep rejection of invented/swapped prices, unavailable rooms, rumors, future/OOC requests and hypothetical availability. Unknown stock/negotiability stay unknown; opening alone transfers nothing.
- Teach the main reply contract to emit the complete npcShop list for rooms, rentals and priced services alongside the story, even while asking which option the player wants. Add a direct required-buy reminder for ordinary replies, swipe and regenerate. A valid inline list opens without an additional API call. Retain the existing missing-payload recovery path; the supplied fenced JSON response now validates too.
- Clarify already-known player ability registration after starting-loadout onboarding: acknowledge an established ability and upsert its full metadata in the same reply, preserving IDs/mastery. A wish or contradicted claim is not acquisition. Auto tracking remains required; hiding the Incantation window does not disable ability storage or chant rules.
- [Thai diagnosis and ability usage](docs/inn-commerce.th.md). Update and reload; regenerate/swipe an old incomplete reply to apply the new prompt. Validation uses controlled browser provider responses and preserves existing commerce behavior.

## v0.52.2 — RoleForge Memory Addons drawer

- Move Summary from the RoleForge overlay into its own **RoleForge Memory Addons** drawer in native Extension Settings. Enable it through the existing optional-system switch under RoleForge; an already enabled Summary stays enabled. Disabling pauses memory work and hides the drawer while keeping the library and preferences. No separate extension installation or storage migration is required.
- Use the approved compact grayscale layout: current chat, summarized/pending/saved counts, summary and new-chat actions, memory token budget, and collapsible search/archive, categories, insights, automatic summary, context, API, linked-history, backup and job sections. Native drawer collapse preserves running jobs; new failures expose diagnostic details. Settings save independently by group, and unsaved drafts survive progress refreshes while clearing on chat changes.
- Keep the existing IndexedDB archive, source evidence, revisions, search, backups, branch isolation and new-chat handoff. Memory progress stays above the chatbar; **View** opens the native memory drawer directly. Reading/searching/rendering makes no additional AI call. Summary requests retain the native pre-request API notifications introduced in v0.52.1.
- [Thai usage and verification](docs/memory-addons.th.md). Update the extension and reload once; do not clear site data. Browser verification uses controlled provider replies and real local memory storage.

## v0.52.1 — Native API request notifications

- Show a native SillyTavern information toast before each RoleForge AI request, identifying training, commerce, Memory Summary, NPC generation/image reading, H-Stats or Manual Sync. Include every NPC retry and summary batch; local browsing, copying, queued work and normal user chat do not add a request notification. Extension-started story actions are described as main API calls rather than additional tasks.
- Keep notifications nonblocking and request counters session-only. Use escaped native toast text and allow separate notifications for repeated calls. [Thai usage notes](docs/api-request-notices.th.md).
- Include a grayscale, interactive [RoleForge Memory Addons design preview](docs/previews/memory-addons-concept.html) with a separate extension drawer, compact actions, token budget and collapsible sections. This is a preview for selection; the production Summary UI and memory storage stay in their current locations until the design is approved. [Preview details and mobile images](docs/memory-addons-design.th.md).

## v0.52.0 — Incantations and separate composer training

- Store complete skill/technique effects, costs, cooldowns, strengths/weaknesses and distinct short/full chants with the normal AI reply. Skills now keep 0–100 Mastery and derived mastery levels; meaningful practice and casting update the existing canonical records without a level reset. Powerful short/silent casting follows established mastery and lore, not fixed damage multipliers or score unlocks.
- Add the approved grayscale incantation window: clear active/disabled buttons, copy-only chants, ability selection, expandable details and per-window minimize/close. Hiding the window retains player chant rules. NPC chanting and chant language have independent settings.
- Move the existing four-choice quiet training flow above the chat input and support powers, skills and techniques. Train closes the RoleForge overlay. Ending a pending exercise discards its late result; completed gains persist once.
- Keep ability, training and commerce windows independent. Show conditional tabs when multiple windows are open, preserving each draft and task. Minimize all above-input windows, including Summary status, to a flat strip; restore compact views and expand details without cancelling work. Bound their height to protect the message input.
- [Mechanics, settings and production previews](docs/incantation.th.md). Old abilities with unknown metadata remain unknown until established by a normal role-play reply; no extra metadata-generation request is made.

## v0.51.10 — Compact party/guild notice grid

- Show recruitment notices as compact pinned papers in two columns, including narrow mobile screens, matching the Mission Board. Each paper shows its kind, name and read-details hint; the entire paper is a keyboard-accessible button. Long titles are bounded in the overview and remain complete in the detail view and accessible label.
- Keep descriptions, tags, leader/roster/capacity/rank, requirements and sharing terms in the selected notice. Preserve filters, pagination and joining rules. New boards default to four entries per page for a 2×2 layout; explicitly saved page sizes remain supported. Browsing makes no extra AI request.
- [Mobile preview and usage](docs/group-board-paper.th.md). Verified relevant board/output tests, syntax checks and production-loader Main Chat at 320/390/1280 px, including the two-column layout, keyboard opening, filters, pagination, complete details and unchanged API/quest state. Provider replies are simulated. Update and reload to use the new appearance.

## v0.51.9 — Settled commerce and same-reply boards

- Remove the leftover raw auction session dump and continue-auction instruction from Ranks & Progression. Keep balances and transaction receipts.
- Distinguish collecting paid goods and historical auction/buy/sell references from new requests. A completed interaction at the current venue no longer seeds another opening example just because the place is named Auction House. Still allow explicit new auctions and purchases. Ignore accidental catalog openings on a collection turn.
- Give requested mission/recruitment boards complete, request-specific examples in the separate normal-reply SYSTEM contract, including when commerce is also active. Reuse the canonical board instructions, teach stationary browsing and public posted notices, and keep all applicable objects in the same final patch. No preliminary request or extra board generation is needed.
- Validate natural Thai posted recruitment/job notices as current board evidence, while retaining exact quotes, location, future/OOC and valid-entry checks. Remove the incomplete-board request-draft button; a missing payload remains an explicit generation error, never a requirement to send another request.
- [Thai diagnosis and verified UI previews](docs/settled-commerce-boards.th.md). Verified 677 unit/host tests, syntax checks and production-loader Main Chat at 320/390/1280 px, plus optional switches and null regressions. Provider replies are simulated. Update and reload; regenerate old incomplete board replies to use the new prompt. Board settings remain user-controlled.

## v0.51.8 — Approved compact composer and latest-reply continuation

- Apply the selected Summary compact A design to auction/buy/sell: quiet gold, thin borders, 32px actions, and one combined amount/denomination field. Keep short visible labels with full action names for accessibility. Expanded lists, bidder budgets, fee/deposit terms and stored coin sets remain available. Scoped sizing resists host-wide oversized input/select rules.
- Button replies now continue the latest NPC bubble even if a previous role-play decision failed validation and left the financial session anchored to its opening. Keep the opening and user messages unchanged, make one API request, and settle the established interaction once.
- Extend an existing SillyTavern `extra.display_text` together with canonical prose and the active swipe, preserving its existing content. Refresh RoleForge presentation after native rendering and fall back to formatting/text if the native renderer fails. Failed saves restore the prose, display override, swipe and resources together.
- [Thai diagnosis and UI previews](docs/commerce-compact-continuation.th.md). Verified 671 unit/host tests, syntax checks, production-loader mobile/desktop auction settlement in RoleForge/native/preserved formatting, oversized host controls, optional systems, null regressions, and Summary coexistence. Provider replies are simulated. Update and reload once; no state reset is needed.

## v0.51.7 — Role-play evidence formatting and placard bids

- Accept the same latest-user clause when a provider uses smart quotation marks or joins paragraphs with spaces. Comparison preserves words, numbers, currency, refusal and conditional intent; fabricated or changed action evidence remains invalid.
- Recognize both Thai placard actions ยกป้าย and ชูป้าย alongside an explicit price. Teach short original evidence such as `1 เหรียญทอง` while the engine compares the normalized `100 silver` offer. This fixes the supplied `evidence` rejection through the normal reply without another API call.
- [Thai diagnosis and verification](docs/commerce-roleplay-evidence.th.md). Verified the supplied formatting/action case, buy/sell quotes, negative cases, 669 unit/host tests and production-loader browser flows at 320/390/1280 px with simulated provider replies. This release retains the existing composer appearance; proposed UI designs await selection.

## v0.51.6 — Mixed currency, basket trades and Inventory wallet

- Apply the established exchange rate: 1 gold = 100 silver and 1 silver = 100 copper. Role-play and button offers convert into the interaction denomination before comparison; funds and auction holds share a single value. Payments can make exact change from larger coins while preserving total wealth minus the actual cost.
- Use coin stacks for gold/silver/copper and add balances at the top of Inventory. Choose Coin stacks, Minted coins or Outline in either RoleForge Control center or extension settings; the saved choice updates Inventory and commerce together, without an API call. Commerce symbols remain vector artwork independent of emoji/icon fonts. The composer has an offer denomination selector and an expandable item list with checkboxes, quantities, line totals and a combined quote.
- Buy several catalog items in one basket, or let an NPC offer for several actually owned items. Remove unwanted sale lines, adjust quantities and negotiate one total through UI or ordinary role-play. Changing the selection resets stale agreed totals; one explicit confirmation commits the entire basket and one payment receipt. Unknown/duplicate lines, excess stock/ownership, insufficient funds or any failed item transfer commit nothing.
- Teach formal auctions to announce a reasonable once-only entry charge and refundable commitment hold before joining, while casual events may remain free. Entry is nonrefundable; deposit stays in the wallet, is unavailable during participation and unlocks at closure/departure. Existing auction terms are preserved; there is no new hidden penalty or retroactive charge.
- [Thai mechanics and verification](docs/commerce-currency-baskets.th.md). Update and reload; existing single-item negotiations and recorded payments remain compatible. Browser/provider responses in verification are simulated.

## v0.51.5 — Teach every system in the normal reply prompt

- Add an enabled-system routing guide with triggers and exact output shapes for every story-driven tracker and Main Chat system. Header, scene, player resources/progression, inventory, skills/powers/techniques, NPC facts/knowledge/diary/relationships, contacts/letters, social invitations, quests, combat, travel/maps, H-Stats and optional boards/memory/agenda/checklists share one final patch. User-owned settings and API summary/training tasks stay under their existing controls.
- Send the output contract as a separate SYSTEM injection at chat depth zero, outside the large state/reference wrapper. Resolve the conflicting instruction about patch placement: complete the story first, then emit one closed comment containing sceneTracker, ops and every applicable system object. The payload must appear in the final answer, rather than only being planned in Thinking.
- Refresh at the official generation interceptor using the actual outgoing chat and generation type. Normal replies, swipe and regenerate receive the appropriate opening/ongoing interaction instructions; a replaced catalog does not become a stale ongoing interaction. Valid normal opening and role-play decisions use the same reply without another API call. Existing opening recovery is retained.
- Accept explicitly quoted Thai written prices such as “สิบเหรียญเงิน” alongside numeric JSON. Preserve seller/buyer identity, owned-item and present-scene checks. Refresh composer completion when host busy flags change late; incomplete finished replies show a Swipe/Regenerate hint instead of waiting indefinitely.
- [Thai diagnosis and system guide](docs/normal-reply-system-instructions.th.md). Verification covers native SillyTavern prompt assembly, unit/host tests and production-loader normal commerce, role-play, swipe/regenerate, board/settings and null flows at mobile/desktop widths. Provider responses in these tests are simulated. Update and reload once; no RPG data reset is needed.

## v0.51.4 — Recover missing commerce openings and remove null

- Hidden shop/auction notices return no card. The chat renderer now checks the rendered card before appending it, preventing DOM.append(null) from injecting literal “null” after NPC dialogue. Existing story text and board notices are preserved.
- If a current buy/sell/auction reply quotes prices but omits readable opening data, recover the catalog automatically through one task call to the current API. Valid inline data and explicit local shop catalogs need no recovery call. No preliminary request button, extra story message, bidding advance or money/item transfer occurs during recovery.
- Keep an established NPC standing bid and fixed actual budgets; a narrated six-silver bid opens at six with the next Bid at seven. Reject invented goods, prices, bidders, fees, deposits, increments and player bids. Cancel or discard stale recovery after stop, chat switch, new turn, edit or disabling the system. Failed recovery stays visible with copyable diagnostics and does not retry in a loop.
- Reproduced the null failure in a browser before the fix; added regression coverage for shop/auction notices, board notices, intentional “null” in prose and stable refresh with presentation on/off at mobile and desktop widths. [Thai cause and fix](docs/commerce-opening-fix.th.md). Update and reload once; no RPG data reset is needed.

## v0.51.3 — Isolate commerce decisions from story generation

- Composer buttons use SillyTavern’s native task API with the current connection/model, bounded NPC/card/chat reference, and an action-specific JSON contract. This prevents the normal story preset from taking over a button request. Legacy hosts make one quiet request; failures never trigger a hidden retry or settlement.
- Auctions and trades have separate normal-chat instructions. Unsupported trade confirmation on an auction reports an action error; unrelated role-play negation no longer looks like refusal or a price mismatch.
- Read explicit decisions alongside NPC prose, fenced JSON, direct commerce objects and flattened results. Distinguish empty replies, missing decisions, missing NPC prose, conflicting results and unsupported markup. Increase the task output budget to 4096 while keeping NPC narration brief.
- Failed actions expose expandable, copyable diagnostics on mobile with the action, system, error and raw reply. Funds/items remain unchanged and no absent NPC choice is invented.
- [Thai cause, fix and verification](docs/commerce-task-fix.th.md). Update and reload once; existing RPG records stay intact.

## v0.51.2 — Automatic commerce UI and reliable decision parsing

- Requests to buy, sell or attend an auction open a waiting composer automatically; the NPC’s first reply supplies its goods and prices. Removed the preliminary commerce draft-request card. Bid directly from the opening auction; entry fees and refundable deposits are visible before bidding.
- Auction goods no longer trigger a shop warning. An ongoing interaction updates through commerce rather than repeatedly asking for new catalogs; old missing-shop notices are cleared on continuation.
- Explicit NPC decisions accept existing unique names, field aliases, numeric strings, and normal prose with hidden commerce patches. Simultaneous bids are evaluated by price; missing decisions and motives have specific errors. Unknown bidders, overspending and invented consent remain invalid.
- [Thai diagnosis and validation](docs/commerce-auto-open.th.md). Update and reload once; existing data stays intact.

## v0.51.1 — Role-play and buttons share the same commerce

- Make offers, confirm trades, bid, wait or leave through ordinary in-character chat. The existing main API reply supplies NPC reactions and a validated hidden decision; no second commerce request is made.
- Buttons remain shortcuts. After a user message, the next button continues the latest NPC reply. Questions and persuasion preserve prices and funds; inspecting a named catalog item updates its selection.
- A proposal never pays automatically. Explicit consent uses the selected item's established quote; prices, stock, actual NPC budgets and once-only receipts use the same engine as buttons. Conditional/refused actions, stale decisions and failed saves do not settle a transaction.
- A spoken first bid may enter an offered auction with its established fee and deposit in that same reply. NPCs retain independent choices and can win.
- [Thai role-play flow and validation](docs/commerce-roleplay.th.md). Update and reload once; existing RPG data stays intact.

## v0.51.0 — Rebuilt AI commerce in the chat composer

- Replaced live auction and buying/selling/haggling flows with one new composer runtime and settlement engine. The collapsible bar sits above the chat input, shows the item/price, and expands for catalog details and fixed NPC funds.
- Every game action makes **one call to the current SillyTavern API**. Brief NPC reactions append to the **same assistant message and active swipe**; no generated user command or extra chat bubble. Viewing details and selecting an item make no API calls. The bar disappears when its interaction ends.
- AI decides rival bids, passes, withdrawal, all-in spending and closure from character motives. No fixed willingness ceiling, minimum-bid grind, forced player victory or three-click countdown. Actual NPC funds are shared across lots and cannot increase. Local rules validate funds, explicit price consent and once-only settlement.
- Existing balances, inventory, commitments and paid receipts migrate without another charge. Stale responses after edit/swipe/chat switch, double clicks, malformed decisions and detectable save failures cannot settle twice.
- Main Chat now also shows collapsible story-memory, appointment and objective receipts beside their source reply, plus party/guild and household invitations. Optional switches retain data when paused.
- [Thai flow and validation notes](docs/commerce-rebuild.th.md) · [All Main Chat UI previews](docs/previews/main-chat-systems.html). The preview uses real extension UI with clearly labeled simulated data and replies.

Older commerce release notes below describe retired behavior. Update the extension and reload once; do not clear RPG data.

## v0.50.2 — Main Chat interaction recovery

- Enabled shop, auction and board cards now receive a final, request-specific patch reminder. Viewing or negotiating while already at the venue no longer requires a new arrival. Speaker headers identify an NPC outside their dialogue; conditional pricing in a separate sentence no longer cancels an actual interaction.
- Missing evidence/current location can be repaired locally from the completed reply and confirmed scene. Explicit item/price lists with one named seller can recover a shop card without another API request. Unknown stock stays unspecified; mixed currencies and ambiguous sellers are not inferred.
- A completed purchase or sale can update money/items in the same reply as a refreshed shop catalog. Pending offers still grant nothing. Incomplete requested card data now produces a Main Chat notice with a draft-request button. Turning systems off retains their records.
- Read the [Thai diagnosis and validation report](docs/main-chat-systems-fix.th.md). Update the extension and reload once; existing RPG data does not need resetting.

## v0.50.1 — RoleForge workspaces, quiet Power Mastery and chat commerce

- Added a RoleForge signature **Power & Combat** workspace with only the powers selected by the active preset. Each power has its own mastery record and a four-choice practice flow; the evaluator runs through quiet AI and returns to the workspace without posting a training card in Main Chat.
- Added evidence-backed **Location Memory** to the Scene workspace. It keeps hierarchy, conditions, visits, child places and confirmed routes with distance and direction, while journey progress still advances only from explicit movement evidence.
- Main Chat now owns the per-reply **Scene Tracker**, commerce and ledger events, plus evidence-backed mission and party/guild boards. Power Mastery and Location Memory stay in their dedicated RoleForge workspaces; Marketplace has no RoleForge tab.
- Bumped the release to **0.50.1**. The loader fetches a fresh manifest and every runtime module/style uses the release query, so iOS Safari can load the new build without clearing site data.

อ่าน [ภาพเปรียบเทียบ UI v3](docs/previews/roleforge-v3-comparison.html)

## v0.48.0 — Lore, chronology, preferences and linked memory views

- Added **Lore / Canon**, **Timeline** and **Preferences / Boundaries**, bringing the atlas to **15 categories**. Combined batches and one-request mode extract them within the same request. Category mode uses **15 requests per batch**; saved twelve-category drafts resume only missing categories.
- Added local **Open Threads / Promises**, **Timeline**, **Knowledge / Secrets** and **Corrections / Contradictions** views with source links. Stable keys connect a promise to its confirmed resolution; claims cannot close or reopen a confirmed thread. Flashbacks retain their own dates and do not replace present preferences.
- Knowledge methods have their own cited evidence. Explicitly unaware actors and inferred knowledge stay separate from witnessed/told knowledge; later disclosures update current recipient views while keeping previous knowledge in history. Unspecified visibility never makes a secret public.
- Confirmed linked corrections replace stale context facts while preserving old records and originals. Unresolved contradictory accounts retain both evidence paths and carry an uncertainty marker. References to missing, future, ambiguous or excluded-branch records do not silently update canon.
- Small local prior-record hints help extraction reuse existing keys without additional AI calls; hints and recaps shrink to the task budget. New metadata and linked views travel through existing archive backup and complete new-chat continuity. Existing completed summaries are retained without automatic paid reprocessing.

อ่าน [Workflow ของหมวดและมุมมอง Smart Memory](docs/memory-summaries-workflows.th.md)

## v0.47.0 — Complete chat handoff and structured smart memory

- **Prepare for new chat** now preserves Chat NPC dossiers as independent local records in the destination, including all alternate profiles, stats, abilities, relationship/H-Stats fields, selected stages, party/contact references and the H-Stats roster. Shared Character NPCs retain their chat overrides. Player progression, inventory, quests and payment receipts travel as exact RPG state, separately from AI summaries.
- Complete snapshots fall back to IndexedDB when local storage is full, and preparation waits for the save. Local portraits (including alternates) and music are copied; failed copies retain their records and original references with a warning. Existing destination chats remain protected. Revisit the original chat and prepare again to include NPCs missing from an older handoff.
- **Memory Summaries → Summary API and context budgets → Processing strategy** offers combined message batches, **one request for all pending sources** (only when they fit the input budget), or **one request per category per batch**. Category work saves each part immediately; explicit Retry resumes saved parts without a paid merge request. Progress in the workspace and main chat shows attempts in the current run and the workspace also shows cumulative attempts; these are not provider billing totals.
- A structured memory atlas separates **Scene, Location, Place, Relations, Characters, Missions, Quests, Chapter, Key Words / Quotes, Story, Resources and Other**. Cited quotes retain their speaker, and facts distinguish events, claims, plans, importance and open/resolved threads. Retrieval keeps relevant important facts and unresolved commitments within the existing context budgets, limits repetition and avoids superseded open entries.
- Choose **1,200–12,000 output tokens per request** (default 2,400). Extraction targets scale with this budget. Original messages remain searchable locally; only selected references and a bounded overview enter story context. Existing archives remain readable without automatic paid reprocessing. Native SillyTavern preset generation remains the default.

อ่าน [คู่มือ Memory Summaries และการย้ายข้อมูลทั้งหมด](docs/memory-summaries-workflows.th.md)

## v0.46.4 — Native preset summaries and recoverable event indexing

- Main-chat summaries now default to SillyTavern's native `Generate('quiet')` path through `generateQuietPrompt()`, using enabled user preset prompts, JB, chat context and WI/Author’s Note according to host settings. Compact raw generation remains selectable. RoleForge pauses its own story/patch instructions for the archive task and never adds summary output as story or pays rewards from it.
- Missing optional event metadata and message/segment ID formatting are repaired locally when the quoted source matches. Unsupported event entries are omitted with a visible warning; complete chapter summaries and original messages are saved before continuing. Local repairs use no additional API requests. Incomplete JSON and empty replies stop at the last saved batch; explicit Retry uses a smaller batch.
- API diagnostics distinguish missing models/endpoints, access, quota, context and service failures when the host supplies that information. No automatic paid retry or silent connection fallback occurs. Native cancellation releases prompt guards and avoids reprocessing the last story reply.
- Prepare for new chat reports whether automatic RPG continuity is disabled or its snapshot cannot be saved. Exact player state (including levels, resources, skills, inventory, currency and payment receipts) travels through character continuity, separately from story summaries; Chat NPCs remain scoped to their original chat.

## v0.46.3 — Reliable summary scheduling and mobile module menus

- Memory Summaries checks SillyTavern's actual generation state instead of relying on a Start event that can stay set after a dry run or an interrupted command. A real story reply queues the summary; it starts automatically when the reply finishes, with no summary API timeout or summary request while waiting.
- **Main chat: current SillyTavern API and model** uses SillyTavern's native raw generation request, the same API and model as the story. A **Connection Manager** profile remains optional. Summaries are separate requests and do not add story messages. Requests target shorter output, use up to eight cited events, and request at most **2,400 output tokens**. New installations default to **five messages per batch**; saved preferences and completed chapters remain intact.
- A stalled summary tokenizer falls back after **two seconds**. Each validated batch is saved before the next request. If final memory-prompt preparation fails, the completed summaries stay saved and the UI shows a warning; that memory prompt is cleared until it can be rebuilt within its budget. Provider/API failures still stop at the saved checkpoint without a paid automatic retry.
- **Quick menu** opens without automatically focusing Search or opening the mobile keyboard. Its list scrolls within the available space, including **System Audit**, without the RoleForge footer covering the last items.

อ่าน [คู่มือ Memory Summaries](docs/memory-summaries-workflows.th.md) และ [วิธีเลือกรูปแบบหมวด](docs/navigation-options-preview.th.md)

## v0.46.2 — Faster module navigation and visible summary progress

- **Extension Settings → RoleForge → General & continuity → Module navigation** selects **Classic carousel**, **Quick menu** or **Module grid**. The original carousel remains the default. The menu groups and searches all modules; the grid opens a module directly with RoleForge's dark surfaces and gold SVG icons. The layout selector stays in extension settings to keep the RPG window clear. The saved preference applies across reloads without changing RPG records.
- Memory Summaries shows its current step, saved batches and elapsed time beside the **main-chat composer**, including while the RPG window is closed. Its own square Stop button cancels summary work and restores Send when finished; SillyTavern's story Stop keeps control of a story reply. Completed chapters and the unsent message draft remain intact.
- Summary API requests allow **240 seconds** by default, configurable from **60–600 seconds**. Errors distinguish API timeouts, request failures, token-counting problems and waiting for the story reply. A stalled summary tokenizer falls back to a conservative estimate; memory injected into story prompts still requires token counting within its budget.
- Every validated summary batch is saved before the next request. After an API timeout, **Retry / continue** uses smaller batches for the remaining sources and keeps the saved batch-size preference. RoleForge does not automatically make another paid request after a failure. Providers may still process and charge for a request already sent even after cancellation or timeout.

อ่าน [วิธีเลือกรูปแบบหมวดและดูสถานะสรุปใน Main Chat](docs/navigation-options-preview.th.md) และ [คู่มือ Memory Summaries](docs/memory-summaries-workflows.th.md)

## v0.46.1 — Saved summary batches and compact extension settings

- Memory Summaries processes a backlog in sequential batches of **10 original messages** by default. Choose **5, 10, 20 or 50**, or set **1–100 messages per batch**. Input budgets can make a request smaller; a very long message can span multiple requests. The automatic-summary interval remains a separate setting.
- Each validated batch is saved before the next request. Progress shows pending original messages, the current batch, completed saves and elapsed time. Cancel, API failure or reload retains completed chapters; **Retry / continue** processes the remaining sources. Summary preparation also uses these batches across explicitly linked history.
- Added bounded waits for summary stages and clearer errors instead of leaving token counting or requests indefinitely pending. Summarization still uses the configured separate API/profile and consumes that provider's tokens.
- Simplified the extension drawer to match SillyTavern settings. Fixed native `menu_button` minimum-content sizing that squeezed Open / Sync labels into vertical columns on mobile. Existing controls and collapsible groups remain available.

อ่าน [วิธีตั้งจำนวนข้อความต่อชุดและทำต่อเมื่อสรุปหยุด](docs/memory-summaries-workflows.th.md)

## v0.46.0 — NPC Alternate Information and organized settings

- One NPC can keep its original dossier and up to **20 alternate versions**, such as childhood, adulthood or a later chapter. Each version has its own profile fields, stats, abilities, relationship values, portrait and presentation style. Stable identity, encounter/hostile status, contacts, group links, diary and knowledge remain shared.
- **NPC Management → a character → Alternate Information** adds, edits, selects and removes versions. Selection is manual, saves immediately and updates NPC/chat presentation and the next model context. Draft edits save only when confirmed. Inactive biographies are kept in storage; prompts use current fields plus short version labels. Selecting a version does not rewind the chat or change scene time.
- Story patches and optional progression updates target the selected version without replacing the original or switching versions. Character-scoped updates merge per version and per field, so unrelated archive edits still reach other chats. Image backups, scope copies and continuity include alternate images. JSON export retains same-server image references, without embedding image bytes.
- Reorganized **Extension Settings → RoleForge** with Open / Sync at the top, separate General, Tracking, Chat/NPC, Optional Systems and Notifications groups, and collapsible appearance, presets, writing and diagnostics. Existing preferences and controls are retained, with layouts for mobile and narrow desktop drawers.
- Preserved the original Header / Dialogue / Narrative default, optional native regex preservation and native Edit/save/cancel protections.

อ่าน [วิธีใช้ Alternate Information และ Drawer ใหม่แบบเป็นขั้นตอน](docs/npc-alternate-information.th.md)

## v0.45.6 — Original story presentation by default

- Restored the original source-based **Header / Dialogue / Narrative** behavior for replies with RoleForge tags. Extra host wrappers, attributes, or display regex rewrites no longer silently suppress all three blocks by default.
- **Extension Settings → RoleForge**, beside NPC Management, adds **Preserve regex / HTML formatting (optional)**. It defaults OFF. Enable it to give native regex/HTML rendering priority for structured replies; unstructured messages keep their native DOM in both modes. The presentation switch still controls the format independently.
- A status line shows the loaded module version, selected presentation mode and whether the latest character reply has readable presentation blocks. No private story text is shown. Untagged saved replies stay plain; update/reload cannot add missing speaker/block tags. Generate a new reply or regenerate when structure was not emitted.
- Kept native Edit/save/cancel/autosave protection and source-aware restoration. An external formatter wrapping an existing story now settles without repeated remounting or duplicate headers.

อ่าน [การเลือกโหมดแสดงผลและวิธีตรวจข้อความเดิม](docs/optional-systems-and-regex.th.md)

## v0.45.5 — Restore Header / Dialogue / Narrative with regex

- Enabled display regex no longer disables RoleForge's story instructions or all structured story rendering. **Header / Dialogue / Narrative** remains controlled by its own switch. An unrelated or no-op regex can coexist with unchanged RoleForge story blocks.
- Presentation checks each message's actual native content. Custom HTML/widgets, transformed display text, bound actions and native message editing stay protected; ordinary protocol text can use RoleForge's character headers and narration/dialogue boxes.
- Existing replies with RoleForge tags can render again after reload. Replies generated without those tags during the regression remain plain; continue with a new reply or regenerate the affected reply to request structure again. The extension does not guess speakers or rewrite saved prose.

อ่าน [คู่มือการใช้ร่วมกับ regex และการตรวจข้อความเดิม](docs/optional-systems-and-regex.th.md)

## v0.45.4 — Native message editing

- Chat Presentation now recognizes SillyTavern's actual `#curEditTextarea.edit_textarea` editor and stops decorating a message while it is being edited. Native textarea identity, draft text, focus, cursor and save/cancel/autosave remain owned by the host; scene, mission and auction cards return after editing ends.
- RoleForge instructions explicitly keep bookkeeping in its marked JSON patch. Bare `SET clock.time`, `SET npc...` or `sex_stage` lines are not RoleForge's protocol and are preserved rather than interpreted or deleted. Their origin requires the source card/preset/regex; existing foreign command text is not automatically removed.

อ่าน [การแก้ข้อความและขอบเขตการแก้คำสั่งที่หลุด ภาษาไทย](docs/message-editing-and-protocol.th.md)

## v0.45.3 — Optional systems and native chat compatibility

- The Auction House uses a detailed wooden gavel with rounded striking faces, collars, a turned handle and a separate sound block, keeping the existing gold and dark aesthetic.
- **Extension Settings → RoleForge → Optional systems**, or **Control center → Optional systems**, provides six independent switches: Mission Board, Auctions, Story Memory, Appointments & Deadlines, Quest Objective Checklists and Memory Summaries. Missing preferences default to **OFF**; explicitly saved preferences remain unchanged. Turning a system off preserves its records and removes its cards, AI instructions and context. Memory Summaries also stops archive writes and summary API requests. Existing auction commitments can still be settled or left through the Wallet without reopening bidding.
- Event notifications default to OFF for new users; saved notification preferences and individual category switches remain available.
- Main-chat cards now decorate SillyTavern's rendered message instead of rebuilding it from raw text. Display regex output, custom HTML, tables, form state and handlers survive scene/board/auction updates. Enabled assistant display regex disables RoleForge story restyling instructions; native message edits and asynchronous renders remain authoritative. Covered global, character and preset regex behavior; other add-ons that replace the message DOM may still require a specific compatibility check.

อ่าน [คู่มือสวิตช์ระบบเสริมและการใช้ร่วมกับ regex ภาษาไทย](docs/optional-systems-and-regex.th.md)

## v0.45.2 — Auction House

- A confirmed arrival at an auction venue opens an **Auction House card in the main chat**, styled with RoleForge's dark surfaces, gold frames and existing UI fonts. Preview the catalog and revealed item details before joining; entry fee and refundable deposit are shown first. The normal story reply creates 1–8 lots and present rivals. No extra API request is made by auction buttons.
- Local rules own **joining, minimum/custom bids, fixed rival ceilings, three auctioneer counts, winners, payment and Inventory delivery**. Rounds advance only by player actions. Leading bids and deposits reserve funds; outbids release the leading commitment. Wallet edits, AI spending and guild founding cannot consume reserved funds. Currency changes wait until the event is finished or left.
- Won items and entry fees have permanent event/lot receipts. Closed lots cannot settle again; AI auction payout/item operations are rejected. Successful results emit auction, wallet and Inventory notifications. Failed saves restore currency, items, receipts and the reply checkpoint, with an inline retry message. Unrelated metadata saves wait until the auction commit finishes.
- Active sessions survive reload and state export/continuity. **Ranks & Progression → Auctions** resumes an event when its original chat card is unavailable. Returning to the actual venue is required for new bids; existing commitments can still be resolved. Leaving while leading is blocked. The catalog/history and completed results remain readable.

อ่าน [คู่มือระบบประมูลและ workflow ภาษาไทย](docs/auction-workflows.th.md)

## v0.45.1 — Mission Board and growth notifications

- A confirmed visit to a mission/quest board now produces **1–4 paper cards in the main chat** from the normal reply's structured patch. Click a paper to read the description, issuer, objective checklist, difficulty, reward and stated deadline. **Back** returns to the papers; **Accept mission** saves one Active mission locally, with no immediate reward or extra API request. The canonical quest enters the next generation's context.
- Board offers are scoped to the source chat and reply variant. Reading does not accept a mission. Duplicate acceptance, old controls, a superseded board, being at another location and acceptance during generation are blocked. Reload preserves the board; swipe rollback follows its source variant. Save failure restores the unaccepted state for retry.
- Main-chat notifications now separate **new skills**, **training/skill progress**, **purchases** and **items received/removed**. Diffs use saved quantities and proficiency increases, including SET/upsert updates and actual capped gains. An unchanged skill refresh produces no learned notification. Custom power rank progression is supported; replenishing resources is not training. Multiple events queue in groups of up to four, so busy turns do not discard later inventory events. Each category can be disabled in extension settings.
- Verified existing behavior: AI can update an enabled, manually created NPC from friendly to **Hostile** and back via its stable ID. The dossier remains in NPC Management; hostile characters are excluded from friendly rosters. No change to the hostility system was needed.

อ่าน [คู่มือ Mission Board, notifications และ NPC Hostile ภาษาไทย](docs/mission-board-workflows.th.md)

## v0.45.0 — Memory Summaries and new-chat history

- **Memory Summaries** archives loaded user/character messages in browser IndexedDB, including captured replaced/deleted versions. Separate API requests create cited chapter summaries, a continuity recap and searchable people/place/event entries. Original text remains searchable when a minor encounter was omitted from the event index.
- Choose the current SillyTavern API or a **Connection Manager** profile for summarization. Automatic mode defaults to one batch after 15 pending character replies; manual summarization processes the current backlog, and **Prepare for a new chat** completes linked ancestor backlogs too.
- Persistent job status and notifications report waiting, summarizing, validating, saving, success, partial coverage, failure, cancellation and interrupted reloads. Failed requests retain prior chapters and expose retry. Summary requests and prompt token counts are visible; budgets are configurable.
- Continuity carries the exact RPG state and an archive ancestry link. Before each normal generation, relevant history is selected within overview/retrieval token budgets. Historical memory never executes state patches or grants rewards. NPC knowledge remains limited to established witnessed/told facts. Alternative branches are excluded unless explicitly linked.
- Edited/swiped/deleted sources invalidate their summaries and dependent recaps; delayed results cannot cross chats. Summary edits retain up to 20 earlier revisions. Export the **full memory archive** separately from RPG state to back up originals or move devices; IndexedDB does not sync across browsers automatically.
- Update and reload once. Real-model summary quality and billing depend on the selected API; matching source quotes validate provenance, not every semantic interpretation.

อ่าน [คู่มือ Memory Summaries ภาษาไทย พร้อม workflow การย้ายแชต การค้นสถานที่ และ notifications](docs/memory-summaries-workflows.th.md)

## v0.44.9 — Story memory, quest steps and narrative deadlines

- **Story Memory** keeps confirmed facts, promises, secrets and unresolved threads per chat. Edit, pin, resolve, archive or reopen records. Normal prompts select relevant memories and active pinned records within a bounded context; resolved and archived records are past outcomes. A saved secret does not grant NPC knowledge.
- **Quests** now include required and optional objective checklists. Progress derives from completed required steps; skipped required steps remain unsatisfied. Reaching 100% makes a quest ready for confirmation, without completing it or paying automatically. Confirming completion through the UI grants no reward; confirmed story rewards still use the once-only payment receipt.
- **Appointments & Deadlines** use the current story day and `HH:mm` clock. Upcoming, today, due, overdue and unspecified times update with the narrative clock. Vague timing stays as written until clarified. Reaching a deadline never automatically fails a quest, spends money or completes a meeting.
- Normal tracking uses the main reply without extra AI requests. Add/edit forms save locally. **Manual Sync** explicitly checks a selected chat range and preserves newer story records and player corrections when auditing older replies.
- All three belong to the existing RPG state, including reload, Export/Import, Continuity and turn/swipe history. Existing chats need no reset or automatic guessed backfill. Update the extension and reload once.

อ่าน [คู่มือภาษาไทยแบบทีละขั้น พร้อมตัวอย่างการใช้ทั้งสามระบบร่วมกัน](docs/story-systems-workflows.th.md)

## v0.44.8 — Quest payment receipts and story locations

- Quest rewards now keep a payment receipt independent of reward wording, amount and the visible quest archive. A paid quest cannot pay again through a later reply, balance replacement, Manual Sync or deleting/recreating its archive entry. Distinct reward components can be granted together in the first payment; completion without payment can receive its first reward later. Each quest payment must identify one known quest.
- Removed the bundled World Map, atlas assets, coordinate tracking, NPC map markers and geography reference injected into AI prompts. **Central Crown** came from the old atlas's default starting city. New locations follow the story; region and continent are optional. Local room layouts remain available.
- Saved atlas locations, travel geography and scene history migrate locally: repeated breadcrumbs and the old default Central Crown/Crown Heartlands/Central Continent are cleared while actual place names, character data, room layouts and balances are retained. Confirmed geography entered after migration stays usable.
- Existing balances are not recalculated or reduced: old transaction descriptions alone cannot prove which money was duplicated. Update the extension and reload SillyTavern once; no saved-data reset is needed.

## v0.44.7 — Safer H-Stats and existing group recovery

- Open **H-Stats → Directory layout** to try **Name tabs** (recommended for quick switching), **Portrait cards** (choose by picture), or **Compact selector** (save space with many characters). The preference is remembered across reloads and applies to each chat's own roster. Existing NPCs, H-Stats and portraits are preserved.
- Character selection has no remove button. Open **Manage directory**, choose **Hide** beside a name, then confirm the named character. Cancel leaves the roster intact. **Undo hide** restores the previous order and selection; hidden characters can also be added back through the picker. Hiding changes the current chat's directory only and keeps every NPC record and H-Stats value. Pending confirmation and Undo reset when switching chats.
- The directory remains usable while an initial H-Stats profile is loading. Controls have at least 44px touch targets and support Thai/English UI preferences.
- Party/Guild tracking now recognizes explicit existing membership in common Thai/English narration and player statements even when the AI omits group operations or the extra membership flags. Normal turns and Manual Sync share the same validation. NPC leadership and the player's membership role are retained; recovering an existing guild does not charge a founding fee. Invitations remain offers to accept or decline.
- Opening or switching to an existing chat locally checks up to 300 recent messages for missing group membership, after the player has replied. It also reads an opening message inside that range. Later departures, explicit deletion, saved removal audits and turn records prevent restoring groups the player already left. The recovery is saved per chat and makes no extra AI request. Statements outside this range or unclear membership descriptions are not guessed.
- Try the production-based demo in [docs/previews/preview-h-stats.html](docs/previews/preview-h-stats.html) using a local static server (for example, `python3 -m http.server 8000` in the repository root). Open `http://localhost:8000/docs/previews/preview-h-stats.html`. The demo uses sample characters; changing its directory does not affect a SillyTavern chat.

## v0.44.6 — Established groups and selected H-Stats NPCs

- If the current story or player role-play already establishes membership in a party or guild, the tracker records it immediately with the stated leader, role, and known membership details. A new invitation still shows Accept/Decline and does not join automatically. Joining an existing guild does not charge the founding fee.
- H-Stats starts with an empty NPC roster. Add a met NPC from its picker or the NPC Management H-Stats action, then remove it from the roster when desired. Existing chat-specific selections stay visible; other met NPCs remain available to add without displaying their dossiers automatically.

## v0.44.5 — Character Forge presets

In **Extensions → RoleForge → Character Forge Presets**, choose **Original Preset** to keep the Tretaresia Origin, social standings, skill categories, mastery names and Path ranks, or choose **Custom** to define each list for another character card. Each custom list starts empty. Enter one choice per line, then save. Original can be exported as editable JSON and imported again. Presets belong to the character card; existing chat profiles stay intact.

The character form now lets you type an Origin location, skill category and mastery name directly, including names absent from the configured lists. Birthplace is saved separately from the current scene. Custom Path ranks keep their names in the RPG progression display and prompt. Switching back to Original restores the bundled choices without deleting the custom definitions.

## v0.44.4 — Selective NSFW Enhance prompts

NSFW Enhance now defaults to **Auto** when enabled. Auto checks the four most recent chat messages locally and leaves the saved adult writing style and tags out of ordinary turns. During a relevant scene it selects sections from Markdown headings, using the section title or an explicit `[section:core]`, `[section:romance]`, `[section:voice]`, or `[section:intense]` label. Unsectioned custom prompts remain intact and are sent only while a relevant scene is detected. **Always** restores the previous behavior of sending the entire saved style and all selected tags on every active turn. The settings preview shows the exact prompt and how many sections and tags Auto selected. No extra AI call is made; the separate story-language instruction still follows its own setting. Recent-chat matching can miss subtle scene transitions, so choose Always when you want to force the complete prompt.

## v0.44.3 — Flexible character turns

A character may open the scene with a header before narration or speech, or the scene may begin with narration before the first header. Each uninterrupted character turn can include multiple separate narration and dialogue boxes under one header. A different speaker gets a new header. Existing dialogue-only replies remain compatible.

## v0.44.2 — Consistent interface language

English/Thai interface preferences now cover the settings drawer, character creation, RPG labels, power editor, NPC/Lore management, invitations, help and status messages. Switching UI language does not select the story language or translate saved names, descriptions, custom powers, chat text or editable prompt content. Story language remains an independent preference. Existing data is retained; reload after updating.

## v0.44.1 — Power settings in the extension drawer

Manage presets, definitions and JSON Import/Export in **Extensions → RoleForge → Power Presets**. The RPG Powers page now contains character power values only. Character creation contains power choices only; the unstyled white management button has been removed. Existing presets and values are preserved.

## v0.44.0 — Custom Power Presets

- Character creation, RPG UI and wand menu now use RoleForge branding.
- In **Extensions → RoleForge → Power Presets**, choose **Original Preset** for the existing Tretaresia powers or **Custom** to start with an empty list.
- Create, rename, edit and delete power definitions. Supported types: number, resource, rank and toggle. Configure descriptions, limits, starting values, rank names, icons, colors and availability during character creation.
- Definitions belong to the active character card; power values belong to each chat. Custom choices appear in character creation, the Powers page and normal AI state updates. Custom resources also appear on Status.
- **Export JSON / Import JSON** transfer the power preset. Exporting Original produces an editable Custom copy. Import replaces definitions only after confirmation; matching IDs retain existing chat values. Deleting a definition hides it while preserving its archived values.
- Custom supports up to 64 definitions, 2,000 description characters per power and a 1 MiB import file. JSON uses `roleforge-power-preset` version 1.
- Existing saves and Original power values remain compatible. Internal storage keys and AI patch tags retain their legacy identifiers. Updating does not require clearing saved data.
- Custom changes power systems; bundled maps, ranks and other world-specific modules are not a complete world editor.


## v0.43.8 — Lore Import / Export

In **NPC Management → Lore Management**, use **Export JSON** to download all saved Lore for the current character card, including disabled entries, keywords and pinned flags. Use **Import JSON** to select a Tretaresia Lore JSON file and confirm the destination and new-entry count. Imports append to the current card, skip exact duplicates, and never overwrite existing records. Titles shared by different entries are retained. Imported IDs are regenerated.

Files use `{ "format": "tretaresia-lore", "version": 1, "entries": [...] }`; arrays of native Lore records are also accepted. SillyTavern World Info files are not this format. Limits remain 200 entries per card, 160 characters per title, 12,000 characters per entry, 30 keywords and 12 MB per file. Invalid files, over-capacity imports and active-budget failures leave saved Lore unchanged. The card's budget and selection mode stay unchanged. Export saves entries, not unsaved edits or chat/NPC data.


ส่วนเสริมสำหรับ SillyTavern ที่แสดงสถานะ RPG, ฉาก, NPC และกลุ่มสังคมร่วมกับ Main Chat รองรับภาษาไทยและอังกฤษ รวมถึงหน้าจอมือถือ

### แก้ไข v0.43.6

- แยก Name (ชื่อบุคคล), Title (ตำแหน่ง/ฉายา), Occupation (อาชีพ) และ Relationship (ความสัมพันธ์) ให้ชัดเจนในคำสั่งทั้ง Main Chat และ NPC Management
- หัวบทพูด Father/พ่อ, Innkeeper, Gate Keeper จับคู่กับชื่อจริงจากความสัมพันธ์/อาชีพที่มีอยู่เมื่อมีผู้ตรงกันเพียงคนเดียว ไม่เดาเมื่อมีหลายคนในบทบาทเดียวกัน
- ป้องกันการสร้าง dossier ใหม่ที่ใช้คำเรียกบทบาททั่วไปเป็นชื่อ และแก้ dossier เดิมเป็นชื่อจริงได้เมื่อ AI อ้าง id เดิม โดยรักษาภาพและข้อมูลเดิม
- การเจนผ่าน NPC Management ส่งข้อมูลข้อความจากการ์ดตัวละครประกอบด้วย ตรวจชื่อก่อนเปลี่ยนร่าง และลองใหม่หนึ่งครั้งด้วยชุดช่องข้อมูลที่เล็กลงเมื่อ JSON ไม่สมบูรณ์หรือชื่อไม่ถูกต้อง รองรับทั้ง Generate และเติมช่องว่าง
- หากยังไม่สำเร็จจะเก็บร่างเดิมไว้ ไม่บันทึกอัตโนมัติ ตัวละครที่ตั้งใจปิดบังชื่อยังใช้คำบรรยายในเรื่องจนกว่าจะเปิดเผยตัวตน

### แก้ไข v0.43.4

- NPC Management เปิดอ่านภาพอัตโนมัติเมื่อเลือกรูปตัวละครหรือเปิดร่างที่มีรูป ผู้ใช้ยังปิดเพื่อเจนจากข้อความได้
- รูปลักษณ์จากภาพใช้คำบรรยายที่อ่านได้โดยตรง ไม่ต่อท้ายรูปลักษณ์ที่ AI ขั้นสร้างประวัติแต่งขึ้นอีกครั้ง
- ขอรายละเอียดภาพชัดเจนขึ้น ไม่ตัดคำบรรยายทิ้งที่ 450 ตัวอักษร และกำชับไม่ดัดแปลงภาพตามโลกแฟนตาซีหรือบริบทแชต
- ยังต้องใช้โมเดลที่รองรับภาพและเปิด Image inlining; หากอ่านภาพไม่ได้จะคงร่างเดิมไว้ ความถูกต้องของการมองภาพยังขึ้นอยู่กับโมเดล

### เพิ่มเติม v0.43.3

- จำกัดความกว้างหน้าต่างและคอลัมน์ภายในให้พอดีหน้าจอมือถือ ป้องกันเนื้อหาหรือฟอนต์ของธีมดันปุ่มปิดออกนอกจอ
- สงวนพื้นที่ปุ่มปิด 44px และปรับความกว้างตาม viewport เมื่อหมุนจอ

### เพิ่มเติม v0.43.2

- ปิด wand menu ทันทีเมื่อเปิด RPG รวมถึงบนมือถือ และไม่ให้เมนูกลับมาทับหน้าต่างระหว่างเปิดใช้งาน
- ใช้เหตุการณ์ MESSAGE_RECEIVED ยืนยันว่าคำตอบหลักเสร็จแล้ว แม้สถานะ Waiting for AI ของโฮสต์จะค้าง จากนั้นบันทึกฉากและไดอารี เปิดปุ่มคำเชิญ และอัปเดตสถานะใน UI โดยไม่เรียก AI เพิ่ม
- ไม่ตีความคำพูดเชิญเข้าปาร์ตี้ว่าเป็นการตอบรับหรือสร้างปาร์ตี้ของผู้เล่น การเข้าปาร์ตี้ NPC เกิดเมื่อผู้เล่นกดรับคำเชิญเท่านั้น
- เพิ่มคำสั่งตรวจข้อมูล Scene Tracker ที่ท้ายพรอมต์ เพื่อเน้นให้เติมรายละเอียดฉากที่ยังขาดภายในคำตอบเดียว

### เพิ่มเติม v0.43.1

- สรุป Scene Tracker, Diary, Party/Guild และการเปลี่ยนสถานะที่ยืนยันใน patch เดียวท้ายคำตอบหลัก เพื่อให้ UI อัปเดตทันทีโดยไม่เรียก AI รอบสอง ตัวอ่านรวมข้อมูลฉากจากหลาย patch ที่อาจพบในข้อความเก่า และอ่านคำเชิญตรงจากบทพูดภาษาไทย/อังกฤษได้กว้างขึ้น

### เพิ่มเติม v0.43.0

- ตำแหน่งสมาชิก Party เป็นช่องกรอกข้อความอิสระพร้อมรายการคำแนะนำ และรักษาชื่อตำแหน่งที่กำหนดเองไว้หลังบันทึกหรือโหลดใหม่ ตำแหน่งจากคำเชิญ Party/Guild ยังคงเป็นข้อความอิสระ และคำเชิญแสดง Reputation เมื่อมีข้อมูล
- Scene Tracker รับคีย์สั้น เช่น `loc`, `t`, `who` ในข้อมูลฉาก โดยขอข้อมูลครบ 21 ช่องในฉากแรก และส่งเฉพาะข้อมูลที่เปลี่ยนในฉากถัดไป ช่องที่ไม่ส่งสืบทอดจากฉากก่อนหน้า UI ยังแสดงช่องทั้งหมด
- Scene Tracker, Diary และคำเชิญใช้ข้อมูลในคำตอบหลัก แสดงตัวอย่างระหว่างข้อความกำลังมา และบันทึกเมื่อข้อความจบโดยไม่เรียก AI เสริม การ์ดคำเชิญกดได้หลังข้อความจบ
- ถอดแท็บ World Map และช่องพิกัด X/Y จากแบบฟอร์ม Scene Tracker สถานที่กรอกเป็นข้อความ ระบบยังอ่านข้อมูลแผนที่เก่าที่บันทึกไว้เพื่อความเข้ากันได้ แต่ไม่ใช้แผนที่โลกเป็น UI สำหรับโรลต่อไป Local room layout แยกต่างหากและยังใช้งานได้

### เพิ่มเติม v0.42.0

- Party และ Guild มีแรงก์กลุ่มและจำนวนภารกิจที่สำเร็จ แสดงทั้งในการ์ดคำเชิญใน Main Chat และหน้าจัดการกลุ่ม โดยเก็บต่อเนื่องในสถานะการเล่น
- ผู้เล่นตั้งชื่อ Party/Guild เมื่อสร้าง และแก้ชื่อภายหลังได้ในหน้าจัดการกลุ่มที่ตนเป็นเจ้าของ พร้อมกำหนดแรงก์และจำนวนภารกิจสำเร็จ สำหรับกลุ่มที่ NPC เชิญจะไม่ให้ผู้เล่นแก้ข้อมูลของหัวหน้ากลุ่มผ่านแบบฟอร์มนี้
- คำเชิญเก็บแรงก์และยอดภารกิจตามข้อเท็จจริงในเนื้อเรื่อง หากยังไม่ทราบจะแสดงว่าไม่ทราบ จำนวนสมาชิกยังแยกจากรายชื่อที่รู้จัก และผู้เล่นไม่ถูกตั้งเป็น Leader เมื่อเข้าร่วม
- เมื่อภารกิจของกลุ่มสำเร็จอย่างยืนยันได้ AI สามารถอัปเดตยอดภารกิจด้วยการแก้สถานะกลุ่มในคำตอบหลัก โดยไม่เรียก AI เพิ่ม

### แก้ไข v0.41.1

คืนไฟล์ CSS ที่ตำแหน่งเดิมเพื่อรองรับ `loader.js` รุ่นเก่าที่ Safari ยังเก็บไว้ พร้อมให้ runtime ตรวจการโหลด CSS หลักโดยตรงก่อนเปิด UI แก้ปุ่มเปิด RPG ที่อาจสั่งปิดเมนูส่วนเสริมซ้ำจนเปิดเมนูกลับ และเลิกให้คำขอเว็บฟอนต์ทำให้การโหลดหน้าต่างช้า ทดสอบการเปิดทุกแท็บและ NPC Manager ใน Chromium ขนาดมือถือและเดสก์ท็อปทั้งตัวโหลดเก่าและใหม่

## สิ่งที่เปลี่ยนในเวอร์ชันนี้

- **ติดตามจากคำตอบหลัก:** Scene Tracker, Diary, คำเชิญ Party/Guild และการอัปเดตสถานะอัตโนมัติไม่เรียก AI รอบเสริม ระบบกู้ข้อมูล NPC/ฉากเบื้องหลังเดิมถูกยกเลิก
- **แสดงระหว่างสตรีม:** Scene Tracker เริ่มจากฉากล่าสุด แล้วเปลี่ยนเมื่อข้อมูลฉากใหม่มาถึง บทบรรยายและบทพูดแสดงได้ก่อนปิดแท็ก คำเชิญและ Diary ขึ้นทันทีที่ได้รับข้อมูลครบของรายการนั้น
- **คำเชิญที่ตอบได้:** แสดงชื่อกลุ่ม ผู้เชิญ ตำแหน่ง จำนวนสมาชิก และปุ่มยอมรับ/ปฏิเสธใน Main Chat การ์ดแสดงระหว่างเจนได้ แต่ปุ่มเปิดใช้งานหลังข้อความจบและบันทึกแล้ว เพื่อป้องกันการเข้ากลุ่มจากข้อความที่ยังเปลี่ยนได้
- **แยกผู้สร้างกับผู้เข้าร่วม:** ผู้สร้างกลุ่มเองเป็น Leader ส่วนผู้ตอบรับคำเชิญเป็นสมาชิกตามตำแหน่งที่เสนอ โดยไม่เปลี่ยนเป็น Leader อัตโนมัติ
- **จำนวนสมาชิกสมจริง:** แยกจำนวนทั้งหมดออกจากรายชื่อที่รู้จัก กิลด์ที่มี 120 คนยังคงมี 120 คนแม้รู้จักเพียงผู้เชิญ เมื่อเข้าร่วมจะเป็น 121 คน ไม่สร้าง NPC เปล่าเพื่อเติมจำนวน หากไม่ทราบยอดจริงจะแสดงว่าไม่ทราบ ไม่ถือว่ามีเพียงคนที่รู้จัก
- **Narrative ต่อเนื่อง:** รวมกรอบบรรยายที่ติดกันเป็นกรอบเดียวโดยคงย่อหน้า แก้การแยกข้อความเมื่อแท็กซ้อน ปิดผิดประเภท หรือยังส่งมาไม่ครบ
- **จัดโครงสร้างไฟล์และอัปเดต cache version:** โมดูลอยู่ใน `src/`, CSS อยู่ใน `styles/`, HTML อยู่ใน `templates/` และเอกสารเก่าอยู่ใน `docs/archive/` ไฟล์ CSS ขนาดเล็กที่ root เป็นทางเข้าของตัวโหลดรุ่นเก่าที่ยังอยู่ในแคช

## ติดตั้งและอัปเดต

1. เปิด Extensions → Install extension ใน SillyTavern
2. ใส่ URL `https://github.com/DesZiDesu/rpg-systems`
3. ใช้ branch `main` แล้วโหลดหน้าใหม่

สำหรับผู้ติดตั้งแล้ว ให้กด Update ในรายการ Extensions แล้วโหลดหน้าใหม่เมื่อ AI เจนเสร็จและเก็บข้อความร่างเรียบร้อย หากมีปุ่ม **Apply update** สามารถใช้ปุ่มนั้นได้ ไม่ต้องล้างข้อมูล Safari

ชื่อโฟลเดอร์ติดตั้งมาตรฐานคือ `third-party/rpg-systems` ระบบใช้ stable loader อ่านเวอร์ชันจาก `manifest.json` และโหลด JavaScript/CSS ด้วย URL ของเวอร์ชันนั้น

## ใช้งาน Main Chat

เปิด Auto Track เพื่อบันทึกข้อมูลจากคำตอบหลัก เปิด Chat Presentation เพื่อแสดง Narrative/Dialogue และเปิด Scene Tracker เพื่อแสดงข้อมูลฉากเหนือคำตอบ

ข้อมูลจะปรากฏได้เมื่อโมเดลส่งมาแล้วเท่านั้น ไม่สามารถรู้คำเชิญหรือบันทึกที่ยังไม่ได้เจน การพรีวิวไม่เปลี่ยนสถานะถาวร การบันทึกจริงเกิดเมื่อจบข้อความ โดยใช้ประวัติแต่ละข้อความและ swipe เพื่อป้องกันการบวกสถานะซ้ำ

หากโมเดลไม่ส่งข้อมูลครบ ระบบเก็บข้อเท็จจริงเดิมและแสดงช่องที่ยังขาด ไม่เรียก AI เพิ่มและไม่เดาข้อมูลที่ยืนยันไม่ได้ คุณยังใช้ **Manual Sync** เพื่อสั่งตรวจข้อมูลเองได้

### Party และ Guild

- สร้างกลุ่มเองจากหน้า Party/Guild ได้: Party ไม่มีค่าก่อตั้ง ส่วน Guild ใช้ค่าก่อตั้งตามระบบเดิมที่แสดงใน UI
- ผู้สร้างแก้ชื่อกลุ่ม แรงก์ และยอดภารกิจที่สำเร็จได้ในหน้าจัดการ Party/Guild; กลุ่มที่ NPC เชิญเก็บข้อมูลที่ยืนยันจากคำตอบหลักและผู้เล่นไม่ได้รับสิทธิ์แก้การจัดการกลุ่มของผู้อื่น
- เมื่อ NPC เชิญเข้ากลุ่ม การ์ดคำเชิญจะแสดงในข้อความที่เชิญ ผู้เล่นเลือกยอมรับหรือปฏิเสธเอง
- รองรับผู้เชิญที่ระบุด้วย NPC ID, ชื่อจริง หรือชื่อเรียกอื่น และใช้ตำแหน่ง Member หากไม่มีตำแหน่งระบุ
- มีตัวตรวจบทพูดเป็นทางสำรองสำหรับคำเชิญโดยตรงที่ระบุชื่อกลุ่มในเครื่องหมายคำพูด เช่น `I invite you to join the guild "Dawnspire".` หรือ `ขอเชิญคุณเข้าร่วมกิลด์ “รุ่งอรุณ”` ไม่ใช่ตัวเข้าใจภาษาธรรมชาติทุกสำนวน ข้อมูล structured จากคำตอบหลักเป็นช่องทางหลัก
- ปฏิเสธแล้วไม่เพิ่มสมาชิก ไม่เก็บค่าก่อตั้งสำหรับการเข้าร่วม และไม่ยอมรับซ้ำในรายการเดิม
- เข้าร่วม Party ได้ครั้งละหนึ่งกลุ่ม แต่มี Guild ได้หลายกลุ่มตามระบบเดิม
- กลุ่มที่เข้าร่วมมีคำสั่งออกจากกลุ่ม แทนการยุบกลุ่มของคนอื่น และไม่แสดงปุ่มไล่สมาชิก
- เก็บยอดสมาชิกทั้งหมดและสมาชิกที่ยังไม่ทราบชื่อแยกจากรายชื่อ NPC ในฉาก สำหรับกลุ่มใหม่ในโลกสมมติ prompt ขอจำนวนที่สอดคล้องกับขนาดและชื่อเสียง ส่วนข้อมูล canon ที่ยังไม่ทราบจะไม่ถูกแทนด้วยจำนวนแต่งขึ้น

### Diary

บันทึกเฉพาะ NPC ที่พบแล้ว เป็นมิตร และอยู่ในฉากหรือถูกกล่าวถึงในข้อความนั้น ตั้งความถี่ได้ Off / Rare / Normal / Often บันทึกผูกกับข้อความต้นทาง เปิดอ่านผ่านปุ่ม Diary ใต้ข้อความ ไม่ใช้ AI รอบเสริม

### Narrative และ Dialogue

ใช้หนึ่งกรอบ Narrative สำหรับย่อหน้าบรรยายที่ต่อเนื่อง สลับกรอบเมื่อมีบทพูด ไม่ต้องสร้างกรอบใหม่ทุกย่อหน้า ระบบแสดงข้อความด้วย text nodes ไม่รัน HTML ที่โมเดลส่งมา

## ฟังก์ชันอื่นที่ยังใช้งานได้

สถานะผู้เล่น, พลังและความชำนาญ, คลังสิ่งของ, ภารกิจ, เงิน, การเดินทางแบบชื่อสถานที่, NPC Management แบบ Chat/Character, รูปตัวละคร, Lore, Character Forge, Household และการเชื่อมต่อ Character Life ยังคงใช้ข้อมูลและการตั้งค่าเดิม

**การใช้โควต้า:** คำตอบหลักยังใช้โทเคนของโมเดลตามปกติ รวมข้อมูล tracker ที่แนบมาด้วย การกด Manual Sync, เจน NPC/รูป/โปรไฟล์, เปิดเรื่อง หรือคำสั่งที่ให้ AI เขียนข้อความ ยังอาจเรียก AI เพิ่ม ตัวนับใน Settings เป็นยอดสะสมของหน้านั้น ไม่ใช่จำนวนคำขอต่อข้อความ

## โครงสร้าง Repository

| ตำแหน่ง | หน้าที่ |
|---|---|
| `manifest.json`, `loader.js` | จุดเริ่มโหลดส่วนเสริมและเวอร์ชัน |
| `index.js` | เชื่อมกับ SillyTavern, state, prompt, events และหน้าหลัก |
| `ui-polish.css`, `style.css`, `npc-ui.css` | ทางเข้ารูปแบบเดิมสำหรับเบราว์เซอร์ที่เก็บตัวโหลด/โมดูลเก่า |
| `src/` | โมดูล NPC, Scene Tracker, คำเชิญ, Lore และส่วนประกอบ UI |
| `styles/` | CSS หลักและรูปแบบส่วนประกอบ |
| `templates/` | Settings และ Character Forge |
| `assets/` | ภาพประกอบและไฟล์เดิมเพื่อความเข้ากันได้ |
| `tests/` | ชุดทดสอบและขั้นตอนตรวจด้วยมือ |
| `docs/previews/` | หน้าพรีวิวสำหรับนักพัฒนา |
| `docs/archive/` | README เก่าสำหรับอ่านอ้างอิง ไม่ถูกโหลดเป็น runtime |

## สำหรับผู้พัฒนา

ต้องใช้ Node.js ที่รองรับ ES modules และ `node:test` (ทดสอบด้วย Node 24)

```sh
npm run check
npm test
```

Browser regression ต้องติดตั้ง Playwright และ Chromium ก่อน:

```sh
npm install --no-save playwright
npx playwright install chromium
node tests/npc-workspace.browser.mjs
node tests/startup.browser.mjs
```

รูปแบบข้อมูลจากโมเดลเป็น HTML comment ที่ซ่อนจากการแสดงผล เริ่มฉากก่อนเนื้อเรื่อง และส่ง event หลังบทที่เกี่ยวข้อง ข้อมูลแต่ละ operation ควรส่งครั้งเดียว:

```html
<!--tretaresia_patch:{"ops":[],"sceneTracker":{"loc":"Moon Hall","t":"08:00","who":["Rhea"]}}-->
<tr-narrative>แสงเช้าส่องผ่านหน้าต่าง

Rhea หยุดตรงหน้าคุณ</tr-narrative>
<tr-dialogue name="Rhea">ขอเชิญคุณเข้าร่วมกิลด์ “Dawnspire”</tr-dialogue>
<!--tretaresia_patch:{"ops":[["offer","guildInvitation",{"npcName":"Rhea","name":"Dawnspire","role":"Initiate","memberCount":120}]]}-->
```

ตัวอย่างย่อด้านบนละข้อมูลฉากบางช่องเพื่อให้อ่านง่าย ฉากแรกต้องครบ 21 ช่อง ส่วนฉากถัดไปส่งเฉพาะช่องที่เปลี่ยน โดยสืบทอดช่องเดิม ข้อมูลคำเชิญไม่ใช่คำสั่งให้เปลี่ยนสมาชิกทันที

## เอกสารย้อนหลัง

[README ก่อน v0.41.0](docs/archive/README-v0.40.10.md) เก็บรายละเอียดและประวัติเวอร์ชันเดิม เอกสารนี้เป็นคำอธิบายพฤติกรรมปัจจุบัน

License: [MIT](LICENSE)

### NPC role artwork (0.43.6)
NPC Management → CHAT APPEARANCE offers Classic (12 original icons), Medallion and Emblem (54 roles each). Select a style and role, then save. Existing NPC roleIcon values are retained without migration; AI updates cannot replace an existing NPC icon. New roles include Politician, Knight, Prisoner, Slave, Master (lord/owner), Clergyman and Nun. Clergyman is separate from the fantasy Priest role. Artwork is bundled locally and follows each NPC identity color.
