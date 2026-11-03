# Sound transfer validation

Result: **30 sound-transfer checks plus 21 existing v63 regression checks passed in Chromium**, with no uncaught browser errors in either suite. Inline script syntax, whitespace checks and deterministic artifact regeneration also passed.

The source fixture was the teacher's exact uploaded `the_battle_of_torah_v59.html`. Tests created synthetic records in separate, disposable browser profiles/origins. They did not access the teacher's Safari profile, original sound recordings, or live website. The supplied v59 file is not committed to this branch.

Sound-transfer coverage:

- Both downloadable helper pages supply the exact installer code, handle blocked clipboard access, and do not create/access a sound database themselves.
- Original v59 receives temporary controls in its existing tab, without opening another database or editing its HTML. Verification displays database, address, filenames and count. Instrumented exporter transactions were read-only, and stored records were identical before and after export.
- All seven categories, Unicode filenames, empty MIME type, File timestamps, zero-byte audio and a file exceeding the Base64 chunk size were included. Node SHA-256 checks independently verified every exported audio payload.
- The optional patched v59 file preserved its entire original source apart from the appended export-only module.
- Destination originals with conflicting record IDs and filenames stayed unchanged. New sounds received independent IDs; exact duplicates in the destination or within the backup were skipped.
- Validation/cancellation did not write. Corrupt data, checksums, base64, filenames, categories, schema versions, byte totals, timestamps and malformed JSON were rejected before writes.
- A simulated quota exception during the second database addition rolled back the complete transaction, including the first queued addition. Retrying succeeded. Repeated confirmation did not double-import.
- A real generated WAV remained decodable and played to completion after restoring. This is not an audible quality assessment; matching hashes establish unchanged audio bytes.
- Restored records survived reload and closing/reopening the destination browser, then re-exported with matching hashes.
- The temporary importer worked against unmodified v63 without deployment. Duplicate installation was harmless. Missing connections and an empty new context did not produce a misleading legacy backup or create another database.
- Core v63 HTML/code was byte-identical after removing the added inline backup module. Two-, three-, and four-team starts, roster import, question skip, end-game and restart were exercised.

The additional existing regression suite covered question/heading/image/sound persistence, image saving failures, modal interactions, report export, team identity events, penalties, zero-HP repair, answer undo, steals, attacks and shields.

## Safari limit

Actual macOS Safari and local `file://` storage behavior were **not tested**. A Playwright WebKit download was attempted but blocked by this environment's network policy. Linux Chromium results must not be described as Safari verification.

The implementation uses browser APIs supported by current Safari and avoids asynchronous automatic downloads: the teacher explicitly clicks Download after backup preparation. It also supplies a clipboard-selection fallback. The important final check is in the teacher's original Safari tab: Verify Sound Library must show recognizable original records before exporting. Then perform a small end-to-end Safari trial and retain the original file, storage and backup copies.

## Reproduction

With Playwright and Chromium available, run from the repository root:

```sh
python tools/build-sound-transfer.py --legacy /path/to/the_battle_of_torah_v59.html --output /tmp/battle-sound-test-helpers
node tests/sound-library-transfer.cjs /path/to/the_battle_of_torah_v59.html /tmp/battle-sound-test-helpers
node tests/version63-regression.cjs
```

Tests use `/usr/bin/chromium` by default. Set `TEST_ENGINE=webkit` for the transfer suite only when Playwright's WebKit runtime is installed. Never configure these tests to use a personal browser profile.
