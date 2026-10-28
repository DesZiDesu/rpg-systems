# Why H-Stats stayed unchanged — investigation and fix

Release: **RoleForge 0.88.7 / Aster Phone 1.1.7**

The automatic relationship update path was incomplete. This was a functional tracking failure, not a problem with the dossier's appearance. The earlier body-profile fill fix and Aster app-name update did not repair that path. I should have caught this before describing H-Stats as working broadly.

## Verified causes

### 1. Standalone Aster replies never reached the relationship engine

The previous phone response schema requested profiles, messages, calls, posts and news. Its merger saved those records and the shared clock but never called the relationship updater. Even an established NPC expressing affection repeatedly through the phone could leave the RPG relationship graph unchanged.

The phone narrator also lacked the relationship event contract and the current directed relationship reference. Improving the phone UI, timekeeping or app names could not make this missing state update happen.

### 2. Main-chat instructions contradicted the actual accepted format

The final output contract told the model to update relationships using `npcValues` operations. The relationship engine requires top-level `relationshipEvents`, while direct affection/trust/loyalty/corruption edits are restricted to protect the directed graph. A model following that final recipe could therefore emit metadata that did not advance the displayed relationship.

Other instructions described the correct event format, so behavior depended on which instruction the model followed. This contradiction has been removed. Missing or rejected event metadata previously had no recovery path for a clearly stated emotional change in ordinary prose.

### 3. Identity and evidence checks rejected some legitimate conversations

The engine expected stable IDs and identifiable people in the quoted act. Models sometimes supplied character names instead of IDs. Direct phone speech such as “I trust you” also lacked a verified sender/addressee mapping in the relationship validator. The actual conversation channel already provided those identities, but the updater was not using it.

### 4. Repeated small gains rounded down to zero

The diminishing-gain calculation used integer flooring. A second proposed gain of one point in the same scene became `floor(1 / 2) = 0`. Combined with scene limits, this could make progression appear frozen even after a valid event. There was also a filter combination that prevented attraction decreases from being applied through conflict events.

## Before/after reproduction

I checked out the previous release, commit `86ac220`, into an isolated artifact directory and ran the same fixture through both versions. It delivers **100 NPC replies**, with trust, attraction and affection statements in three separate story-time windows. Each delivery succeeds; the fixture supplies no relationship event block.

| Result | Previous release | Fixed code |
|---|---:|---:|
| Successfully delivered NPC replies | 100 | 100 |
| Love/bond | 0 | 3 |
| Interest | Unknown | 3 |
| Trust | 10 | 13 |
| Relationship event records | 0 | 100 |
| Physical encounters from remote messages | 0 | 0 |

The previous result reproduces the frozen starting values in the screenshot. The fixed result records the statements and applies bounded gains. Some of the 100 records document a reached limit, rather than another numerical gain. The existing slow progression rules still apply; the fix does not award points for every greeting or ordinary message.

This is a controlled reproduction, not a line-by-line analysis of the user's latest 100-message history: the current request included a screenshot, not that export. It establishes the missing phone update path and the separate main-chat defects directly from code and executable tests.

## Changes made

- **Main chat:** the final recipe now requests `relationshipEvents`. A shared reconciler also recovers clear, completed emotional facts from prose when metadata is missing. Unambiguous names can resolve to existing IDs; they do not create duplicate NPCs. Fictional NPC thoughts can establish their own feelings, while imagined physical actions do not become encounters.
- **Phone:** successful message and call-speech delivery now passes through the same RPG relationship engine. The model receives the contract and current relationship reference. Actual channel membership identifies direct speakers/addressees; ambiguous group pronouns do not identify a target. Another NPC's feelings cannot be changed merely by a phone sender claiming them.
- **Completed acts:** clear, completed main-scene encounters with identifiable participants can recover an encounter record without invented measurements or preferences. Remote text, roleplay claims, fantasy, continuing actions and historical recollections do not create physical encounters through this recovery path. Explicit body/history metadata retains the existing validation rules.
- **Pacing:** diminishing gains retain tenths instead of disappearing immediately through integer flooring. Scene budgets, personality resistance, milestones and existing commitments still constrain growth. Supported negative attraction/affection changes can be recorded.
- **Audit:** main replies record proposed/recovered/applied event counts. Phone records include the last assessment and reason. H-Stats Records shows whether automatic tracking is on and explains recorded limits. Both English and Thai are supported.
- **Persistence:** phone records and relationship state save together through the existing transaction and branch journal. A shared main-reply source avoids applying the same main/phone event twice. Reload, swipe, return and deletion are covered by native browser tests.

## Existing conversations

An older phone receives a one-time, local scan of up to **200 retained messages/call lines** in the current chat/branch. It recovers clearly established feelings using recorded message time for pacing, preserves the current world clock and protects manually edited pairs. Deleted messages and future branch content are excluded. This scan makes **no additional model request**. It cannot reconstruct facts that were never stored or were only implied ambiguously.

New main-chat replies use the repaired automatic path. Older main-chat history is not blindly replayed on upgrade, which would risk replaying unrelated state operations. Existing Manual Sync can reconstruct selected missed main-chat turns when historical recovery is needed.

Automatic tracking must be enabled in RoleForge, and relationship progression must be enabled in H-Stats Rules. These explicit user switches remain respected. The Records audit makes disabled tracking visible.

## Why previous checks missed this

Earlier relationship tests supplied correctly formed event blocks directly. Earlier native phone tests checked delivery, clock changes, profiles and undo using logistical messages. They proved those features, but did not test a phone conversation changing H-Stats or a long conversation with missing relationship metadata. The body-profile fill test covered initial missing body fields, not relationship progression. That coverage gap allowed the broader claim to be wrong.

The new suite tests the missing integration: prose-only main updates, the old scalar recipe, standalone phone prose and structured events, Thai dialogue, 100 successful deliveries, fractional pacing, negative changes, identity resolution, disabled tracking, ambiguous groups, hearsay, physical-claim rejection, one-time recovery and persistence.

The shorter native UI fixture shows love 0.5, interest 1 and trust 11.5 after its main/phone exchanges; it is separate from the 100-reply comparison above.

Native local SillyTavern runs verify actual main/phone provider requests, visible dossier values, Records feedback, reload, cached swipes, deletion and legacy-phone recovery. Provider replies are controlled fixtures; no paid model endpoint is used. Mobile runs are browser emulation rather than a physical-device test.

## Updating

Update RoleForge to **0.88.7**, reload SillyTavern, then update Aster Phone to **1.1.7** in Workshop. Existing phone data and settings are preserved. Check H-Stats → Records for automatic tracking status and the recorded reason for the latest relevant phone assessment.
