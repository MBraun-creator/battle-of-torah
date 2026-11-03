"""Keep the game standalone and produce an exact-file legacy export helper.

Usage: python tools/build-sound-transfer.py [--legacy PATH --output DIRECTORY]
No browser storage is accessed by this build script.
"""
import argparse
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--legacy', type=Path)
parser.add_argument('--output', type=Path)
args = parser.parse_args()
source = (root / 'tools/sound-library-transfer.js').read_text()
begin = '<!-- BEGIN SOUND LIBRARY TRANSFER -->'
end = '<!-- END SOUND LIBRARY TRANSFER -->'
block = f'{begin}\n<script>\n{source}</script>\n{end}\n'
index = root / 'index.html'
text = index.read_text()
if begin in text:
    a = text.index(begin)
    b = text.index(end, a) + len(end)
    text = text[:a] + text[b:].lstrip('\n')
text = text.replace('</body>', block + '</body>', 1)
index.write_text(text)
if args.output:
    args.output.mkdir(parents=True, exist_ok=True)
    installer = "(function(){const s=document.createElement('script');s.dataset.exportOnly='true';s.textContent=" + json.dumps(source) + ";document.body.appendChild(s);s.remove();})();"
    # This runs only when pasted into the original game's already-open tab.
    (args.output / 'install-original-sound-exporter.js').write_text(installer)
    destination_installer = installer.replace("s.dataset.exportOnly='true'", "s.dataset.exportOnly='false'", 1)
    (args.output / 'install-destination-sound-transfer.js').write_text(destination_installer)
    template = '''<!doctype html><meta charset="utf-8"><title>HEADING</title>
<style>body{font:18px system-ui;max-width:850px;margin:35px auto;padding:20px;line-height:1.5}button{font:inherit;padding:12px}textarea{width:100%;height:180px}p{overflow-wrap:anywhere}</style>
<h1>HEADING</h1>
<p>This helper does not access your browser database. No HTML file needs to be edited, moved, or replaced.</p>
INSTRUCTIONS
<button id="copy">Copy LABEL</button> <button id="select">Select LABEL</button>
<p id="status" role="status"></p><textarea id="code" readonly aria-label="Temporary installer code"></textarea>
<p>To enable Web Inspector: Safari → Settings → Advanced → Show features for web developers. Then press Option-Command-I in the game tab.</p>
<script>const code=CODE;const field=document.getElementById('code');field.value=code;
document.getElementById('select').onclick=()=>{field.focus();field.select()};
document.getElementById('copy').onclick=async()=>{try{await navigator.clipboard.writeText(code);document.getElementById('status').textContent='Copied. Return to the TARGET tab and paste into its Web Inspector Console.'}catch(e){field.focus();field.select();document.getElementById('status').textContent='Press Command-C to copy the selected installer, then paste into the TARGET tab’s Console.'}};</script>'''
    original_steps = '''<ol><li>Keep your ORIGINAL v59 file open in its original location and Safari profile. Confirm that its Sound Library still shows your sounds.</li>
<li>Click Copy Exporter below. If clipboard access is blocked, click Select Exporter, then press Command-C.</li>
<li>Return to the ORIGINAL v59 tab. Open Develop → Show Web Inspector → Console. Paste with Command-V and press Return once.</li>
<li>A temporary Export panel appears in that original tab. Click Verify Sound Library and confirm the displayed original file address, nonzero sound count, and actual filenames. A newly downloaded HTML file must not be assumed to have access to your original storage.</li>
<li>Only after verifying access, click Export Sound Library, then Download Sound Library Backup. Keep the downloaded JSON backup in two safe places.</li>
<li>You may close the exporter. Refreshing also removes its temporary buttons. Your original file and sound database stay unchanged.</li></ol>'''
    destination_steps = '''<ol><li>Open the live v63 game at https://mbraun-creator.github.io/battle-of-torah/ in your intended Safari profile, then open Setup Options → Sound Library.</li>
<li>Click Copy Importer below. If clipboard access is blocked, click Select Importer, then press Command-C.</li>
<li>Return to the LIVE v63 tab. Open Develop → Show Web Inspector → Console. Paste with Command-V and press Return once.</li>
<li>Temporary Import/Export controls appear inside its Sound Library. Export a backup of any existing destination sounds first. Then click Import Sound Library, choose your original JSON backup, review the verified summary, and click Add sounds — keep existing library.</li>
<li>Original audio bytes are verified with SHA-256. Exact duplicates are skipped. Different recordings with matching filenames are kept separately. No existing record is overwritten or deleted.</li>
<li>Test the restored sounds and check them again after reopening Safari at the SAME live address and profile. Refreshing removes the temporary controls but keeps your explicitly imported sounds. Nothing is deployed or changed on GitHub Pages.</li></ol>'''
    for filename, heading, label, target, instructions, code in [
        ('original-sound-export-helper.html', 'Export from your original v59 tab', 'Exporter', 'ORIGINAL v59', original_steps, installer),
        ('destination-sound-import-helper.html', 'Import into your live v63 tab', 'Importer', 'LIVE v63', destination_steps, destination_installer),
    ]:
        # Insert code last: never perform text substitutions on the installer itself.
        page = template.replace('HEADING', heading).replace('INSTRUCTIONS', instructions).replace('LABEL', label).replace('TARGET', target)
        page = page.replace('CODE', json.dumps(code).replace('</', '<\\/'))
        (args.output / filename).write_text(page)
    if args.legacy:
        legacy = args.legacy.read_bytes().decode('utf-8')
        # Guard against patching an unverified schema or adding a second installer.
        assert "indexedDB.open('battle_teams_custom_sounds',1)" in legacy
        assert "createObjectStore('sounds',{keyPath:'id'})" in legacy
        assert begin not in legacy and '</body>' in legacy
        export_block = block.replace('<script>', '<script data-export-only="true">', 1)
        (args.output / args.legacy.name).write_text(legacy.replace('</body>', export_block + '</body>', 1))
