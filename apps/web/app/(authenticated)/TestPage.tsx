import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@repo/design';
import { trpc } from '@/core';

// oxlint-disable no-unused-vars

// switch brackets
switch ('test') {
  case 'test': {
    break;
  }
  default: {
    break;
  }
}

// unicorn/catch-error-name - should flag "e" instead of "error"
try {
  JSON.parse('');
} catch (error) {
  throw error;
}

// unicorn/no-nested-ternary
const nestedTernary = true ? 'test' : false ? 'test2' : 'test3';

// unicorn/no-array-for-each
const items = [1, 2, 3];
items.forEach((item) => {
  console.info(item);
});

// unicorn/prefer-array-flat-map
const flatMapped = items.flatMap((x) => [x, x]);

// unicorn/prefer-includes
const hasItem = items.indexOf(2) !== -1;

// unicorn/no-new-array
const arr = new Array(10);

// unicorn/prefer-node-protocol
import { readFileSync } from 'node:fs';

// unicorn/no-zero-fractions
const num = 1;

// unicorn/prefer-optional-catch-binding
try {
  JSON.parse('');
} catch {
  // don't use the error
}

// unicorn/prefer-string-replace-all
const replaced = 'foo-bar-baz'.replaceAll('-', '_');

// unicorn/prefer-string-slice
const sliced = 'hello'.slice(1, 3);

// unicorn/no-lonely-if
function testLonelyIf(a: boolean, b: boolean) {
  if (a) {
    return 1;
  }
  if (b) {
    return 2;
  }

  return 0;
}

// unicorn/prefer-at
const last = items.at(-1);

// unicorn/number-literal-case
const hex = 0xff;

// unicorn/prefer-number-properties
const isNan = isNaN(num);
const isFiniteVal = isFinite(num);

// unicorn/new-for-builtins
const obj = Object();

// unicorn/no-useless-undefined
function returnsUndefined() {
  return;
}

// unicorn/no-console-spaces
console.info(' padded ');

for (const item of items) {
  await Promise.resolve(item);
}

// unicorn/throw-new-error
throw new Error('not using new');
