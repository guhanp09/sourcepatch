import { mkdir, writeFile } from 'node:fs/promises';
import { createDemo } from '../src/core/demo';
import { latest } from '../src/core/model';

const demo = await createDemo();
await mkdir('public/examples', { recursive: true });
await writeFile('public/examples/sample-workspace.sourcepatch.json', `${JSON.stringify(demo, null, 2)}\n`);
await writeFile('public/examples/experiment-handbook-v1.md', `${demo.sources[0].versions[0].body}\n`);
await writeFile('public/examples/experiment-handbook-v2.md', `${latest(demo.sources[0]).body}\n`);
await writeFile('public/examples/experiment-note.md', `${demo.outputs[0].passages.map(p => p.text).join('\n\n')}\n`);
console.log('Exported four fictional sample files.');
