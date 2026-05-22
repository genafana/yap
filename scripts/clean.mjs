import { rmSync } from 'node:fs';

for (const path of ['.output', '.wxt', 'coverage', 'dist', 'build']) {
  rmSync(path, { force: true, recursive: true });
}

