# Sound Library recovery tools (unreleased, based on v63)

These tools transfer uploaded sounds from the original local v59 game to v63 without changing the live website. They were prepared on `dev/sound-library-backup`; no version 64 or release is created. There are no scoring, steal, animation, or sound-playback rule changes.

## Use the original v59 tab, not a newly downloaded replacement

Your original local file, a new download, the live website, and a preview website may have different browser storage contexts. Even an identical HTML file opened from a different location must not be assumed to have access to your sounds.

The recommended exporter does **not** require editing, replacing, renaming, or moving the original HTML. It adds a temporary panel in the exact tab that already shows your sounds. The panel uses the game's existing `soundDB` connection. It never calls `indexedDB.open()`, creates a database, upgrades one, or writes/deletes any stored records. Both verification and export use read-only transactions.

Keep the original file and its location intact. Keep your existing Safari profile. Do not clear website data, use library remove buttons, or upload replacements during recovery.

## Export safely from v59

1. Open the **original v59 file in its original location** using the Safari profile that shows your sounds. Open its Sound Library and confirm recognizable filenames.
2. Download `original-sound-export-helper.html` from this branch. If GitHub shows HTML source instead of downloading, right-click its raw/download link and choose **Save Linked File As…**. Keep the `.html` extension. Open this helper in a separate Safari tab. It only supplies copyable code; its own tab does not read any database.
3. In the helper, click **Copy Exporter**. If Safari blocks clipboard access, use **Select Exporter**, then Command-C. This is a ready-made installer; you do not need to edit any code.
4. Return to the **original v59 tab**. Enable Safari → Settings → Advanced → **Show features for web developers** if needed. Choose Develop → Show Web Inspector (Option-Command-I), then **Console**. Paste the copied installer and press Return once. The installer adds an Export panel to this already-open tab; it does not change your HTML file on disk.
5. Click **Verify Sound Library**. It must display the expected original file address, a nonzero stored-sound count, and your actual filenames/categories. If they are missing or the address is wrong, stop and return to the original tab/profile. Do not export an assumed or empty library from a new file.
6. Click **Export Sound Library**, wait for verification, then click the separate **Download Sound Library Backup** link. The second user click is deliberate for Safari download compatibility. Save the single `.json` file in two safe locations. The status gives the sound count and original audio byte count; keep these for comparison.
7. Close the temporary exporter or refresh the original tab when finished. Its temporary buttons disappear; the file and database remain unchanged. Keep the original v59 file and its Safari data until you have verified the imported library.

The build tool can also produce a v59 file with Export controls appended. That is optional and **not the recommended recovery route**: merely opening that new file does not establish access to the original file's storage. No replacement of the original file is necessary for the instructions above.

## Import into the existing live v63 tab without deploying

1. Open `https://mbraun-creator.github.io/battle-of-torah/` in the Safari profile you want to use for the live game. Open **Setup Options → Sound Library**.
2. Download and open `destination-sound-import-helper.html` in a separate tab. Click **Copy Importer** (or **Select Importer**, Command-C).
3. Return to the **live v63 tab**, open its Web Inspector Console, paste, and press Return once. Temporary Import/Export controls appear **inside its Sound Library**. This changes only the open tab, not GitHub Pages or the deployed HTML. Refreshing removes these controls but keeps any sounds you explicitly imported.
4. For extra protection, export the destination library first if it already contains sounds. Then click **Import Sound Library** and select your JSON backup.
5. Wait for validation of every category, filename, audio length and SHA-256 checksum. Review how many sounds will be added and skipped. Click **Add sounds — keep existing library**, or cancel without changing storage.
6. Existing records are never overwritten or deleted. Exact matches (category, filename, MIME type and audio checksum) are skipped. Different recordings with the same filename are retained separately. Imported sounds get new database IDs, so IDs from the source cannot overwrite destination records.
7. Compare category counts and filenames. Play several sounds, close/reopen Safari in the same profile, and check that the imported sounds remain. Retain both backup copies and the original v59 storage.

The repository's `index.html` on this development branch includes permanent Import/Export controls for isolated offline testing or a later approved update. Opening a downloaded copy does **not** transfer sounds into the live website. Use the live-tab steps above when the live website is your destination.

## Backup format and safeguards

- One offline JSON file, format `battle-of-torah-sound-library`, schema version 1.
- Original audio bytes encoded losslessly as Base64: no decoding/re-encoding, compression, resampling, or quality loss.
- Preserves category, filename, MIME type, original record ID for reference, upload timestamp, File timestamp where present, byte length and SHA-256 checksum.
- Import validates the whole backup and asks for confirmation before writing. All additions use `IDBObjectStore.add()` in one transaction. A write/quota/key-collision failure aborts that transaction; no partial import is retained and existing records remain intact.
- Re-importing the same backup skips exact duplicates, including duplicates within that backup.
- Explicit limits: 20 MB per sound (matching the game's upload limit), 350 MB total decoded audio, 512 MB JSON file, and 10,000 records. Larger or invalid libraries fail visibly rather than exporting/restoring a partial library. Base64 makes backups roughly one-third larger than the raw audio; larger libraries can need significant memory during verification.
- No external service, network upload, or browser-storage migration. Backup files contain your audio, so store them privately.

## Testing and limits

Automated checks use the exact uploaded v59 source in isolated test browsers with synthetic sounds; no personal Safari data is read or altered. See `tests/sound-library-transfer.cjs` for round-trip and failure cases. SHA-256 checks establish byte identity; audible quality is not judged by the tests.

Safari-compatible browser APIs are used (IndexedDB, FileReader, Blob/File, Web Crypto SHA-256, object URLs and an explicit user-clicked download). **Actual macOS Safari and local-file storage behavior cannot be verified in this Linux environment.** WebKit test-browser installation was blocked by network policy. Passing Chromium tests is not a Safari certification. The Verify step and a small Safari trial are required before relying on the recovery backup.

## Development

Canonical implementation: `tools/sound-library-transfer.js`. The game embeds it inline to remain standalone and offline-capable.

Regenerate the game and downloadable helpers:

```sh
python tools/build-sound-transfer.py --output sound-transfer
```

For a local test fixture/export-only v59 copy:

```sh
python tools/build-sound-transfer.py --legacy /path/to/the_battle_of_torah_v59.html --output /path/to/test-helpers
node tests/sound-library-transfer.cjs /path/to/the_battle_of_torah_v59.html /path/to/test-helpers
```

Optional `TEST_ENGINE=webkit` selects Playwright WebKit when its runtime is available. Do not point tests at your personal browser profile or live website.
