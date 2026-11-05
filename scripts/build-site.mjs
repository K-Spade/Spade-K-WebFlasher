import {cp, mkdir, rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, sep} from 'node:path';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = resolve(root, '_site');
if (output === root || !output.startsWith(root + sep)) throw new Error('Destino de compilación fuera del repositorio.');
await rm(output, {recursive:true, force:true});
await mkdir(output, {recursive:true});
for (const name of ['index.html','devices.json','.nojekyll']) await cp(resolve(root,name), resolve(output,name));
await cp(resolve(root,'assets'), resolve(output,'assets'), {recursive:true});
await cp(resolve(root,'firmware'), resolve(output,'firmware'), {
  recursive:true,
  filter:source => source === resolve(root,'firmware') || !source.endsWith('.md')
});
console.log(`Sitio estático preparado en ${output}`);
