import { appendFileSync } from 'node:fs';

import semanticRelease from 'semantic-release';

const outputPath = process.env.GITHUB_OUTPUT;

function setOutput(name, value) {
  if (!outputPath) {
    return;
  }

  appendFileSync(outputPath, `${name}=${value}\n`);
}

const result = await semanticRelease(
  {},
  {
    cwd: process.cwd(),
    env: process.env,
    stdout: process.stdout,
    stderr: process.stderr
  }
);

if (!result) {
  setOutput('released', 'false');
  process.exit(0);
}

setOutput('released', 'true');
setOutput('version', result.nextRelease.version);
setOutput('tag', result.nextRelease.gitTag);
setOutput('git_head', result.nextRelease.gitHead);
