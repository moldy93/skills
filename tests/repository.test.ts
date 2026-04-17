const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readJson(relativePath: string): unknown {
  return JSON.parse(readText(relativePath));
}

test('marketplace entries point to existing skills', () => {
  const marketplace = readJson('.claude-plugin/marketplace.json') as {
    plugins: Array<{ skills: string[] }>;
  };

  for (const plugin of marketplace.plugins) {
    for (const skillPath of plugin.skills) {
      const skillFilePath = path.join(repoRoot, skillPath, 'SKILL.md');
      assert.equal(fs.existsSync(skillFilePath), true, `${skillFilePath} should exist`);
    }
  }
});

test('openclaw telegram notify skill avoids hard-coded target ids', () => {
  const skill = readText('skills/openclaw-telegram-notify/SKILL.md');

  assert.match(skill, /^name: openclaw-telegram-notify$/m);
  assert.match(skill, /OPENCLAW_TELEGRAM_TARGET/);
  assert.doesNotMatch(skill, /1544452406/);
});

test('readme documents the new skill', () => {
  const readme = readText('README.md');

  assert.match(readme, /openclaw-telegram-notify/);
  assert.match(readme, /rsync -a \.\/skills\/openclaw-telegram-notify\//);
});
