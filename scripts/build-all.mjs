import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const browsers = ['chrome', 'firefox', 'edge', 'opera', 'safari'];
const wxtBin = resolve(
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'wxt.cmd' : 'wxt'
);

for (const browser of browsers) {
  console.log(`\n==> Building ${browser}`);
  execFileSync(wxtBin, ['build', '--browser', browser], {
    stdio: 'inherit'
  });
}
