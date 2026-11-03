# THE BATTLE OF TORAH
## Master Development Guide for Codex
**Project:** `MBraun-creator/battle-of-torah`  
**Current GitHub baseline:** v62  
**Application:** Standalone HTML classroom review game  
**Primary file:** `index.html`

---

## 1. Your Role

You are the ongoing software developer for *The Battle of Torah*, an interactive Chumash review game for elementary-school boys.

The teacher is not a programmer. He will describe requested changes in ordinary English. You are responsible for inspecting the existing code, implementing changes, troubleshooting, testing, and preparing updates.

Do not require the teacher to manually edit HTML, CSS, or JavaScript.

**Preserve the existing application. Improve it incrementally rather than rebuilding it.**

## 2. Source of Truth

Before making changes:

1. Read the complete current `index.html`.
2. Identify all existing features and their implementation.
3. Read this development guide.
4. Preserve existing working behavior unless specifically instructed otherwise.
5. Ask for clarification when a requested change conflicts with an established rule.

The current repository is the source of truth for what is actually implemented.

This guide also documents earlier design decisions and feature requests. Some may not exist in v62 or may have changed. Do not automatically overwrite the current implementation to match an older specification.

## 3. Game Overview

The Battle of Torah is a competitive, castle-themed classroom review game.

Students answer Torah questions to earn actions that affect their teams' castles.

The game combines:
- Knowledge-based competition
- Castle battles and defensive strategies
- Individual student participation
- Teacher-controlled gameplay
- Cinematic animations and sound effects
- End-of-game statistics and celebrations

It must be exciting, visually impressive, intuitive, and reliable during a live classroom session.

**Target runtime:** Approximately 30 minutes.

## 4. Teams and Castles

Support two, three, or four teams.

Default team names:

- Lions
- Leopards
- Eagles
- Stags

Allow customization of team names, icons, castle images, and team assignments.

Each team has a castle with a visible health bar and numeric health points.

The current v62 implementation reportedly starts each team at 200 HP. Preserve this default unless instructed otherwise.

Health bars should visually progress from green to yellow to red as health decreases.

A team reaching zero HP is not automatically eliminated. It can continue answering questions and repairing its castle.

The teacher must be able to manually adjust HP.

## 5. Scoring and Actions

After a correct answer, the team chooses an action.

**Attack:** Damages opponents' castles.

**Repair:** Restores the team's castle health.

**Shield:** Temporarily protects the castle against attacks.

The latest Codex inspection of v62 reports:

| Action | Normal | Final third |
|---|---|---|
| Attack | 10 damage | 20 damage |
| Repair | 5 HP | 10 HP |
| Shield | 2 question turns | 2 question turns |

Attack reportedly affects every opposing team.

Earlier versions used different repair values. Preserve the verified v62 mechanics unless the teacher requests a change.

The final-third increase should activate at a fair point aligned with a complete team round.

Shield effects must remain visible while active.

Do not silently alter action values, health calculations, or win conditions.

## 6. Questions and Question Library

The teacher must be able to manage questions without modifying source code.

Support:

- Multiple-choice questions
- Four answer choices
- Correct-answer selection
- Teacher-controlled answer reveal
- Optional explanations
- Question editing and deletion
- Question-bank import and export
- Question shuffling
- Import validation and useful error messages
- A prompt generator for creating questions with AI

Earlier designs also called for open-ended questions and *Mi Amar El Mi* questions. Verify whether these are implemented before changing them.

Question content may include Chumash, Rashi, shorashim, translations, and other Torah material.

**Never overwrite an existing question bank without explicit authorization.**

Invalid imports must not destroy existing questions.

The current v62 reportedly ships without built-in questions.

Questions must persist correctly after a browser refresh or restart.

## 7. Student Roster and Participation

Support student names imported through CSV or text, with first and last names.

The teacher should be able to:

- Add and remove students
- Assign students manually
- Randomize team assignments
- Randomize only unassigned students
- Move students between teams
- Edit team rosters during gameplay

Participation tracking is important.

Once a student has participated, his name should become gray until every eligible student has had an opportunity.

Steal participation must also count.

After everyone participates, the system should begin a new participation cycle.

### Player selection

Historical designs included three selectable modes:

1. Randomly select a student before displaying the question.
2. Display the question, allow a brief preview, then select a student.
3. Allow the teacher to select a student before the question.

Earlier requests included a 10-second decision interval; the inspected v62 reports a five-second preview in one mode.

Preserve the currently implemented timing until the teacher specifies otherwise.

## 8. Stealing Questions

Stealing must be fair and exciting.

Historical requirements include:

- Randomly selecting eligible opposing teams.
- Avoiding repeated steal opportunities for the same team before other eligible teams receive opportunities.
- Counting steal participation toward student rotation.
- Handling ties fairly.
- Maintaining appropriate turn order after steals.

Earlier requests also distinguished between skipping a question and skipping a team's turn.

**Skipping a question must not automatically cost the active team its turn.**

Codex's v62 inspection reports a single randomly assigned steal opportunity. Other historical requests discussed more extensive steal sequences.

Do not change the current steal rules without a specific instruction.

## 9. Teacher Controls

The teacher needs reliable access to:

- Start Game
- End Game
- Skip Question
- Answer Reveal
- Answer Undo
- Adjust Points or HP
- Apply a manual HP penalty
- Edit teams and players
- Question Setup
- Sound Library
- Fullscreen
- Play Again
- In-game settings
- Confirmation dialogs

Earlier versions also requested a teacher-controlled halftime video.

Verify whether this feature exists in the current build before implementing or modifying it.

Teacher controls must remain accessible during fullscreen gameplay.

Opening dialogs must not unexpectedly exit fullscreen.

No dialog should appear behind another dialog or outside the visible screen.

Important buttons should be protected against accidental double-clicking during animations.

## 10. Visual Design and Animations

Preserve the existing cinematic castle-battle aesthetic.

Important visual elements include:

- Four distinctive castles
- Castle health bars
- Active-team highlighting
- Animated cannon attacks
- Explosion particles
- Castle damage and smoke
- Repair animations
- Shield effects
- Trophy presentation
- Confetti and winner celebrations
- Fullscreen-friendly layouts

Earlier requests included larger explosions, animated repair icons, and improvements to the final podium.

Animations should be exciting but should not obstruct essential controls.

Preserve the current artwork, layout, and timing unless explicitly requested to change them.

## 11. Sound Effects

The current game includes seven reported sound categories:

1. Correct answer
2. Wrong answer
3. Attack
4. Repair
5. Shield
6. Elimination
7. Victory

The Sound Library must support multiple uploaded sounds per event, randomly selecting an appropriate sound.

Use built-in sounds as fallbacks where appropriate.

Uploaded sound effects should persist between browser sessions using IndexedDB or another suitable local storage method.

Sound playback must not unexpectedly stop when an associated animation ends.

Do not delete existing audio data while making unrelated changes.

## 12. Game Results and Reports

The game should produce an exciting end-of-game presentation.

Historical requirements include:

- First through fourth place
- A podium display
- Castle health or final scores
- Correct and incorrect answers
- Steal statistics
- Trophy and celebration animations
- Downloadable game reports

The latest v62 inspection indicates the winner is determined by remaining HP, including support for ties.

Reports must use correct team identities, question topics, and event records.

Fix incorrect indexing and missing fields without changing the actual game results.

## 13. Data Storage and Backups

The application is intended to work as a standalone HTML game without a server backend.

Current storage reportedly includes:

**localStorage**
- Questions
- Title and topic
- Castle images
- Player-selection preferences

**IndexedDB**
- Uploaded sound effects

**Temporary memory**
- Active roster
- Current game progress
- Scores and event history

Do not assume every category persists automatically.

Make saved data reliable, validate imports, and provide appropriate backup and restore options.

Avoid exceeding browser storage limits when saving castle images.

Do not falsely report a successful save when storage has failed.

The application should remain usable offline.

## 14. Technical Quality

Maintain a clean, dependable application.

Prioritize:

- Functional buttons
- Correct scoring calculations
- Proper modal layering
- Fullscreen stability
- Touchscreen compatibility
- Responsive layouts
- Safe local data storage
- Clear error handling
- Reliable sound playback
- No accidental double actions
- Reduced-motion support where practical

Consolidate duplicate handlers or conflicting styles when safe, but avoid unnecessary large-scale rewrites.

Never remove a working feature simply because its implementation is complicated.

## 15. Version Control

The teacher previously established formal sequential version numbering.

The current GitHub baseline is **v62**.

Future releases should proceed sequentially, beginning with v63, unless the repository establishes a newer version.

For every completed update:

1. Record the new version number.
2. Summarize what changed.
3. Identify bug fixes.
4. Identify any changed game rules.
5. State what testing was completed.
6. Preserve a way to restore the previous version.

Use meaningful Git commits and, where appropriate, version tags.

Never discard previous working versions without authorization.

## 16. Testing Requirements

Before presenting an update as complete, test as much as the environment permits.

Test:

- Starting games with 2, 3, and 4 teams
- Correct and incorrect answers
- Attack, repair, and shield
- Steal fairness and turn order
- Student rotation
- Question skipping
- Fullscreen controls
- Question import/export
- Roster import
- Saving and restoring questions
- Sound persistence
- Castle image persistence
- Game reports
- Ending and restarting a game

When browser testing is unavailable, say so explicitly.

Do not claim a button or feature was tested merely because its handler exists in the source code.

## 17. Publishing and Deployment

The repository is:

`MBraun-creator/battle-of-torah`

The live website is:

`https://mbraun-creator.github.io/battle-of-torah/`

GitHub Pages deploys the published branch.

**Do not merge, push, or deploy changes to the live website without explicit teacher approval.**

Prepare changes for review first.

When approved, use the repository's established GitHub workflow to publish.

## 18. Working With the Teacher

The teacher communicates in plain English and may request multiple changes at once.

Your job is to translate those requests into working software.

Follow these principles:

- Do not require manual coding.
- Do not repeatedly ask for information already available in the repository or this guide.
- Ask questions only when a decision is genuinely necessary.
- Preserve existing features.
- Fix underlying causes, not merely visible symptoms.
- Explain completed changes concisely.
- Flag regressions and unresolved problems.
- Do not make unrelated design changes.
- Never publish without approval.

**The goal is a stable, continuously improving classroom game that the teacher can develop through ordinary conversation with Codex.**

---

## 19. First Development Assignment

Before implementing new features, compare the current repository against this guide.

Produce three categories:

**A. Confirmed existing features**  
Features verified in the source code.

**B. Missing or incomplete features**  
Requirements documented here that are not fully implemented.

**C. Conflicts requiring a decision**  
Cases where historical requirements differ from the current implementation.

Do not modify files during this initial comparison.

After completing the comparison, propose a prioritized development plan.

Once the teacher approves the plan, implement changes incrementally, test them, and prepare them for review.

---

**End of Master Development Guide**