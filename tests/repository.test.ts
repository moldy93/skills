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

function listTextFiles(directoryPath: string): string[] {
  const results: string[] = [];

  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') {
      continue;
    }

    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...listTextFiles(fullPath));
      continue;
    }

    if (/\.(json|md|ts)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
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
  assert.doesNotMatch(skill, /\b\d{9,}\b/);
});

test('mempalace skill and package are documented', () => {
  const readme = readText('README.md');

  assert.match(readme, /openclaw-telegram-notify/);
  assert.match(readme, /mempalace-shared-memory/);
  assert.match(readme, /packages\/ai-memory-service/);
  assert.match(readme, /rsync -a \.\/skills\/openclaw-telegram-notify\//);
  assert.match(readme, /ai-memory-bootstrap-codex <repo-root>/);
});

test('marketplace metadata keeps plugin wiring valid', () => {
  const marketplace = readJson('.claude-plugin/marketplace.json') as {
    name?: string;
    owner?: Record<string, unknown>;
    plugins: Array<{ name: string; source?: string; strict?: boolean }>;
  };

  assert.equal(typeof marketplace.name, 'string');
  assert.equal(typeof marketplace.owner?.name, 'string');
  for (const plugin of marketplace.plugins) {
    assert.equal(typeof plugin.name, 'string');
    assert.equal(plugin.source, './');
    assert.equal(typeof plugin.strict, 'boolean');
  }
});

test('gitignore covers local MemPalace and Codex artifacts', () => {
  const gitignore = readText('.gitignore');

  assert.match(gitignore, /^dist$/m);
  assert.match(gitignore, /^coverage$/m);
  assert.match(gitignore, /^\*\.log$/m);
  assert.match(gitignore, /^\.codex-plugin$/m);
  assert.match(gitignore, /^\.mempalace\.json$/m);
});

test('repo text files avoid machine-local install paths and hard-coded telegram ids', () => {
  const disallowedPatterns = [
    /\/Users\//,
    /\/opt\/homebrew\/lib\/node_modules\//,
  ];

  for (const filePath of listTextFiles(repoRoot)) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const pattern of disallowedPatterns) {
      assert.doesNotMatch(content, pattern, `${filePath} should not contain ${pattern}`);
    }
  }
});
