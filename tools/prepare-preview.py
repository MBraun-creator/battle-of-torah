"""Copy an explicitly selected development branch into the separate preview Site.

This prepares local preview assets only. It cannot deploy, push, merge, change
GitHub Pages settings, or access any user's browser storage.
"""
import argparse
import hashlib
import html
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

REPO = Path(__file__).resolve().parent.parent


def git(*args):
    return subprocess.check_output(['git', '-C', str(REPO), *args])


def validate_target(config, output):
    output = output.resolve()
    if output == REPO or REPO in output.parents or output in REPO.parents:
        raise ValueError('Preview output must be outside the GitHub game checkout and its parent directories.')
    preview, live = urlsplit(config['preview_url']), urlsplit(config['live_url'])
    if preview.scheme != 'https' or preview.hostname == live.hostname or not preview.hostname or preview.path not in ('', '/'):
        raise ValueError('Preview must have its own HTTPS hostname, separate from live.')
    if config.get('purpose') != 'development-preview-only' or config.get('update_policy') != 'manual-preview-only':
        raise ValueError('This destination is not registered as a manual preview.')
    manifest = json.loads((output / '.openai/hosting.json').read_text())
    if manifest.get('project_id') != config['project_id'] or manifest.get('static') != {'directory': 'dist'}:
        raise ValueError('Wrong Site identity or output directory: refusing to prepare another site.')
    if (output / 'dist').resolve() != output / 'dist':
        raise ValueError('Preview dist must not redirect through a symlink to another checkout.')
    return output


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + '.tmp')
    temporary.write_bytes(data)
    os.replace(temporary, path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--branch', required=True, help='Explicit dev/... source branch; never defaults to main.')
    parser.add_argument('--output', required=True, type=Path, help='Registered separate preview Site checkout.')
    args = parser.parse_args()
    if not args.branch.startswith('dev/'):
        parser.error('Only explicit dev/... branches are accepted; main and gh-pages are never preview targets.')
    git('check-ref-format', '--branch', args.branch)
    config = json.loads((REPO / 'preview/site.json').read_text())
    output = validate_target(config, args.output)
    if git('remote', 'get-url', 'origin').decode().strip() != config['source_repository']:
        raise ValueError('Unexpected GitHub source repository.')
    # Fetch only this branch. Never check out, reset, push, or update main.
    subprocess.run(['git', '-C', str(REPO), 'fetch', '--no-tags', 'origin', 'refs/heads/' + args.branch], check=True)
    sha = git('rev-parse', 'FETCH_HEAD^{commit}').decode().strip()
    mode = git('ls-tree', sha, '--', 'index.html').decode().split()[0]
    if mode not in ('100644', '100755'):
        raise ValueError('Source index.html must be a regular tracked file.')
    source = git('show', sha + ':index.html')
    if b'<!doctype html>' not in source[:100].lower():
        raise ValueError('Source index.html does not look like the standalone game.')
    match = re.search(rb'const GAME_VERSION\s*=\s*(\d+)', source)
    info = {
        'purpose': config['purpose'], 'source_repository': config['source_repository'],
        'source_branch': args.branch, 'source_commit': sha,
        'game_version': int(match.group(1)) if match else None,
        'index_sha256': hashlib.sha256(source).hexdigest(),
        'prepared_at': datetime.now(timezone.utc).isoformat(),
        'preview_url': config['preview_url'], 'update_policy': config['update_policy'],
    }
    atomic_write(output / 'dist/index.html', source)
    atomic_write(output / 'dist/preview-info.json', (json.dumps(info, indent=2) + '\n').encode())
    details = ('<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex,nofollow">'
               '<title>Battle of Torah — Preview Details</title>'
               '<style>body{font:18px system-ui;max-width:800px;margin:40px auto;padding:20px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style>'
               '<h1>Development preview only</h1><p>This hostname has separate browser storage from the live GitHub Pages game.</p>'
               '<p><a href="/">Open the preview game</a></p><pre>' + html.escape(json.dumps(info, indent=2)) + '</pre>')
    atomic_write(output / 'dist/preview-status.html', details.encode())
    atomic_write(output / 'dist/robots.txt', b'User-agent: *\nDisallow: /\n')
    print(json.dumps(info, indent=2))
    print('Prepared only. A separate, explicitly targeted preview Site publication is required.')


if __name__ == '__main__':
    main()
