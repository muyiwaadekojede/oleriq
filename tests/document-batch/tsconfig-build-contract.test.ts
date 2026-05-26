import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type TsConfigShape = {
  exclude?: string[];
  include?: string[];
};

test('tsconfig excludes do not hard-code optional local research mounts', () => {
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8')) as TsConfigShape;
  const excludes = tsconfig.exclude ?? [];

  assert.equal(
    excludes.includes('competitor-lab'),
    false,
    'expected tsconfig.json to avoid excluding the optional competitor-lab mount by literal path',
  );
});

test('tsconfig includes stay scoped to project source roots instead of global ts globs', () => {
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8')) as TsConfigShape;
  const includes = tsconfig.include ?? [];

  assert.equal(
    includes.includes('**/*.ts'),
    false,
    'expected tsconfig.json to avoid a global **/*.ts include that pulls in optional research repos',
  );
  assert.equal(
    includes.includes('**/*.tsx'),
    false,
    'expected tsconfig.json to avoid a global **/*.tsx include that pulls in optional research repos',
  );
});
