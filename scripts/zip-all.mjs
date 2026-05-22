import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const browsers = ['chrome', 'edge', 'opera', 'firefox'];
const wxtBin = resolve(
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'wxt.cmd' : 'wxt'
);

for (const browser of browsers) {
  console.log(`\n==> Zipping ${browser}`);
  execFileSync(wxtBin, ['zip', '--browser', browser], {
    stdio: 'inherit'
  });
}
