import { readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';

/** Tears down our test environment (runs only once after all tests) */
export const teardown = () => {
  // Clean up any leftover test database files (safety net)
  const generatedDir = path.resolve('tests/generated');
  for (const file of readdirSync(generatedDir)) {
    if (file.startsWith('test-') && file.endsWith('.db')) {
      unlinkSync(path.join(generatedDir, file));
    }
  }
};
