import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('all deployed environment values use safely serialized GitHub Secrets', () => {
  const workflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  assert.doesNotMatch(workflow, /^\s*secret:/m);
  const entries = [...workflow.matchAll(/- name: ([A-Z_0-9]+)\n\s+value: (.+)/g)];
  assert.equal(entries.length, 18);
  for (const [, name, value] of entries) {
    assert.equal(value.trim(), '${{ toJSON(secrets.' + name + ') }}');
  }
  assert.doesNotMatch(workflow, /cloudtype-github-actions\/connect@/);
});
