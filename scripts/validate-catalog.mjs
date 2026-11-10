import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateConfig, checkRanges, checkMergedFactoryImage, offsetNumber} from '../assets/config.js';

const config = validateConfig(JSON.parse(await readFile(new URL('../devices.json', import.meta.url), 'utf8')));
const deviceIds = new Set(config.devices.map(device => device.id));
for (const entry of await readdir(new URL('../firmware/', import.meta.url), {withFileTypes:true})) {
  if (entry.isDirectory() && !deviceIds.has(entry.name)) throw new Error(`firmware/${entry.name}: carpeta sin dispositivo en devices.json`);
  if (entry.isFile() && entry.name.toLowerCase().endsWith('.bin')) throw new Error(`firmware/${entry.name}: binario fuera de la carpeta de un dispositivo`);
}
let count = 0;
for (const device of config.devices) {
  const directory = new URL(`../firmware/${device.id}/`, import.meta.url);
  const published = new Set();
  if (device.ameba?.flashloader) {
    const flashloader = device.ameba.flashloader;
    const data = await readFile(new URL(`../${flashloader.path}`, import.meta.url));
    if (!data.length) throw new Error(`${flashloader.path}: binario vacío`);
    const digest = createHash('sha256').update(data).digest('hex');
    if (digest !== flashloader.sha256.toLowerCase()) throw new Error(`${flashloader.path}: SHA-256 incorrecto`);
    published.add(flashloader.path.slice(`firmware/${device.id}/`.length));
  }
  for (const release of device.releases) {
    const parts = [];
    for (const part of release.parts) {
      const path = new URL(`../${part.path}`, import.meta.url);
      const data = await readFile(path);
      if (!data.length) throw new Error(`${part.path}: binario vacío`);
      const digest = createHash('sha256').update(data).digest('hex');
      if (digest !== part.sha256.toLowerCase()) throw new Error(`${part.path}: SHA-256 incorrecto`);
      published.add(part.path.slice(`firmware/${device.id}/`.length));
      parts.push(device.downloadOnly ? {bytes:data} : {address:offsetNumber(part.offset), bytes:data});
    }
    if (!device.downloadOnly) {
      checkRanges(parts);
      if (device.flashProtocol !== 'ameba' && release.eraseAll && parts.length === 1 && parts[0].address === 0) checkMergedFactoryImage(parts[0].bytes, device.chip);
    }
  }
  for (const file of await readdir(directory, {recursive:true})) {
    if (file.toLowerCase().endsWith('.bin') && !published.has(file.replaceAll('\\', '/'))) {
      throw new Error(`firmware/${device.id}/${file}: binario sin entrada en devices.json`);
    }
  }
  count += published.size;
}
console.log(`Catálogo válido: ${config.devices.length} dispositivos, ${count} binarios comprobados.`);
