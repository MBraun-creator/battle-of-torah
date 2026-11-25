"""Read-only guard tests plus validation of the prepared preview copy."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('prepare_preview', ROOT / 'tools/prepare-preview.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PreviewGuards(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='battle-preview-guards-')
        self.output = Path(self.temp.name)
        self.config = json.loads((ROOT / 'preview/site.json').read_text())
        (self.output / '.openai').mkdir()
        self.manifest = self.output / '.openai/hosting.json'
        self.manifest.write_text(json.dumps({'project_id': self.config['project_id'], 'static': {'directory': 'dist'}}))

    def tearDown(self):
        self.temp.cleanup()

    def test_registered_separate_site_is_accepted(self):
        self.assertEqual(module.validate_target(self.config, self.output), self.output.resolve())

    def test_a_different_path_on_the_live_hostname_is_rejected(self):
        self.config['preview_url'] = 'https://mbraun-creator.github.io/preview/'
        with self.assertRaises(ValueError): module.validate_target(self.config, self.output)

    def test_http_preview_is_rejected(self):
        self.config['preview_url'] = self.config['preview_url'].replace('https:', 'http:')
        with self.assertRaises(ValueError): module.validate_target(self.config, self.output)

    def test_game_checkout_and_ancestors_are_rejected(self):
        for output in (ROOT, ROOT / 'preview', ROOT.parent):
            with self.assertRaises(ValueError): module.validate_target(self.config, output)

    def test_wrong_site_identity_is_rejected(self):
        self.manifest.write_text(json.dumps({'project_id': 'another-site', 'static': {'directory': 'dist'}}))
        with self.assertRaises(ValueError): module.validate_target(self.config, self.output)

    def test_unexpected_output_path_is_rejected(self):
        self.manifest.write_text(json.dumps({'project_id': self.config['project_id'], 'static': {'directory': '../game'}}))
        with self.assertRaises(ValueError): module.validate_target(self.config, self.output)

    def test_non_preview_policy_is_rejected(self):
        self.config['update_policy'] = 'automatic-production'
        with self.assertRaises(ValueError): module.validate_target(self.config, self.output)

    def test_symlinked_output_cannot_redirect_into_the_game(self):
        (self.output / 'dist').symlink_to(ROOT, target_is_directory=True)
        with self.assertRaises(ValueError): module.validate_target(self.config, self.output)

    def test_main_and_gh_pages_never_fetch_or_write(self):
        for branch in ('main', 'gh-pages', '--all'):
            result = subprocess.run([sys.executable, str(ROOT / 'tools/prepare-preview.py'), '--branch', branch, '--output', str(self.output)], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse((self.output / 'dist').exists())


if __name__ == '__main__': unittest.main()
