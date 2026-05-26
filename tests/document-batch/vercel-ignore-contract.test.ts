import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const vercelIgnorePath = path.join(process.cwd(), '.vercelignore');

test('vercel deployment excludes local runtime, temporary, and research-only artifacts', () => {
  const content = readFileSync(vercelIgnorePath, 'utf8');
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const expectedPattern of [
    'data/',
    'data',
    '.tmp-*/',
    '.tmp-*',
    'docs/',
    'docs',
    'competitor-lab',
    'tests/',
    'tests',
    'tests documents/',
    'tests documents',
    'chat-transcript.md',
  ]) {
    assert.equal(lines.includes(expectedPattern), true, `expected .vercelignore to contain ${expectedPattern}`);
  }
});
