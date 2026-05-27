import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

test('next dev config allows localhost and 127.0.0.1 for local browser hydration', () => {
  const configPath = path.join(process.cwd(), 'next.config.ts');
  const content = readFileSync(configPath, 'utf8');

  assert.match(
    content,
    /allowedDevOrigins\s*:\s*\[[^\]]*'localhost'[^\]]*'127\.0\.0\.1'[^\]]*\]/s,
    'expected next.config.ts to allow both localhost and 127.0.0.1 as dev origins',
  );
});
