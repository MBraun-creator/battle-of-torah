# Proposed v64

Adds permanent **Export Sound Library** and **Import Sound Library** buttons to Setup Options → Sound Library, using the tested sound-transfer implementation from `f93e8ed` unchanged. Exported game reports identify version 64.

- One lossless JSON backup includes all uploaded audio bytes, categories, filenames, MIME types, timestamps and SHA-256 checksums.
- Import validates the complete backup, shows a summary and asks for confirmation before adding sounds. Exact duplicates are skipped. Existing sounds are never overwritten or deleted; failed additions roll back together.
- The existing `battle_teams_custom_sounds` IndexedDB database, version 1, `sounds` store and all storage keys remain unchanged. No migration or reset is performed.
- Game rules, scoring, steals, zero-HP eligibility, settings, artwork, animations and sound playback remain unchanged.
- The original v59 export and existing-v63 recovery helpers are retained. The permanent v64 controls do not require console installation.

Validation and browser limitations are recorded in `sound-transfer/TESTING.md`. Development branch: `dev/version-64`. The current live v63 remains available from commit `266dcd8` (merged as `f2d3f6e`); this update must not be merged or deployed until approved.
