# Permanent development preview

Preview: **https://battle-of-torah-preview.johnlegooky.chatgpt.site/**

Live game, unchanged: **https://mbraun-creator.github.io/battle-of-torah/**

Preview details: https://battle-of-torah-preview.johnlegooky.chatgpt.site/preview-status.html

The preview is a separate, owner-private Sites website. It has a stable hosted URL rather than an expiring local tunnel. It initially serves the exact `index.html` from `dev/version-64`, commit `a6e680798fae302c895279817a7b2d2f7f25f3e2`. No pull request was merged to create it. Preview publication does not deploy GitHub Pages.

## Open and test

1. Open the preview link in Safari.
2. If prompted, sign in using the ChatGPT account that owns this preview.
3. Import a question bank and, if wanted, a COPY of your sound backup into the preview. Your live website's saved data does not appear automatically.
4. Test the game. The details page identifies the source branch, full commit, game version and SHA-256 checksum of the served game file.

## Update from a development branch

Tell Codex: **“Update the preview from `dev/version-64`. Do not merge or deploy the live game.”** Substitute another `dev/...` branch when needed.

The update is an explicit, manual preview-only operation. There are no push webhooks, Actions deploy jobs, schedules, auto-merges or connections to GitHub Pages. Ordinary development pushes do not update the preview or live site. Updating this preview never merges the selected branch into `main`.

For the developer:

1. Read root `AGENTS.md`, `preview/site.json` and this document. Reuse the exact existing preview project ID; do not register another Site or write a Sites manifest into the GitHub game repository.
2. Get the existing preview Site and a fresh source-write credential using the Sites tools. Preserve its owner-private access and hostname. Open its separate source checkout with the supported Sites source workflow.
3. From the GitHub game checkout, run:

   ```sh
   python tools/prepare-preview.py --branch dev/version-64 --output /workspace/sites/battle-of-torah-preview
   ```

   The preview checkout must already have `.openai/hosting.json` with the exact preview ID from `preview/site.json` and `"static": {"directory": "dist"}`. The helper validates these before fetching, refuses `main` and `gh-pages`, and refuses output inside the game checkout or its ancestors. It fetches only the explicitly selected development branch and copies its tracked standalone `index.html` byte-for-byte. It never executes build scripts from that branch, checks it out, merges, pushes, deploys, or touches browser storage.

4. Validate the copy and provenance. Run the preview guard and browser-isolation tests. If future game code needs separate assets, explicitly review and add those assets to the preview preparation; the current game is self-contained in `index.html`.
5. Use the Sites source workflow to push/package **only the separate preview Site repository**. Save and deploy that exact source/archive to the preview project ID only, using the owner-private operation while access remains owner-private. Do not use GitHub Pages deployment tools or push `main` in the GitHub repository.
6. Confirm successful preview deployment and return the SAME preview URL. Do not create another preview hostname on every update: browser test data belongs to the existing preview origin.

The Sites helper scripts were not installed in the initial execution environment. The initial publication therefore used ordinary Git with the native short-lived Site credential supplied through hidden stdin, a scoped in-memory HTTP header, and a manually packaged archive containing the exact pushed `.openai/hosting.json` and `dist/` files. No credential was saved in source, configuration files, documentation or Git history. Prefer the supported helper when available; never invent credentials or target GitHub Pages as a fallback.

## Storage separation

The two sites have different HTTPS hostnames, so their localStorage and IndexedDB are isolated by the browser even though game storage keys and database names are unchanged. A second repository or folder under `mbraun-creator.github.io` would NOT provide this isolation and is not used.

No live sounds, questions, images, roster data or browser settings were copied, migrated, cleared or accessed. Preview storage begins separately. Preview versions share this preview hostname's test data, but cannot access the live hostname's storage. Existing session-only game data, such as active roster/progress, retains its original behavior; hosting adds no new persistence features.

## GitHub settings and approvals

**No GitHub settings, Actions secrets, access tokens, Pages source changes or live deployment approvals are required for this setup.**

1. Leave the existing repository's Settings → Pages configuration unchanged.
2. Keep reviewing game changes in their pull requests. Approving or updating a preview does not approve a production merge.
3. Only when the teacher separately approves publishing the game should its usual `main`/GitHub Pages workflow be used.

The preview setup documentation/helper is kept on `dev/permanent-preview-setup` for review. Merging it is not required to use the already-hosted preview, and it must not be merged without approval. The pending v64 game pull request remains independent.

## Initial validation

- Nine Python guard tests passed: correct separate Site accepted; same-host/path-only preview, HTTP, wrong Site ID, unexpected output path, incorrect policy, game-checkout output, symlinked output and production branch selections rejected.
- Six Chromium checks passed using intercepted requests in a disposable profile: exact development-source bytes; separate localStorage/IndexedDB under the actual intended hostnames; preview edits leave live-origin test values untouched; separate data after refresh; independent in-memory student rosters; and separate saved data after closing/reopening the test browser.
- No real live or preview browser data was used by those tests. Network requests were intercepted rather than sent to the real websites.
- The native Sites deployment reported success at the preview URL. Actual Safari behavior and the signed-in deployed-page experience were not tested in this environment.
- No game code or game version was changed by the setup. The GitHub live `main` remained at `f2d3f6e281e9055ce7483ea7cd6415c567f4c69c` during preparation.

Re-run guard tests with `python tests/test_preview_setup.py`; run isolated browser checks with `node tests/preview-storage-isolation.cjs /workspace/sites/battle-of-torah-preview/dist`. The latter requires Playwright and `/usr/bin/chromium` and uses only a disposable test profile.
