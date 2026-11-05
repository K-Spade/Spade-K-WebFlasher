export const MAX_FIRMWARE_BYTES = 32 * 1024 * 1024;
export const CHIPS = ['ESP32', 'ESP32-S2', 'ESP32-S3', 'ESP32-C2', 'ESP32-C3', 'ESP32-C5', 'ESP32-C6', 'ESP32-H2'];

export function offsetNumber(value) {
  const n = typeof value === 'number' ? value : /^(0x[\da-f]+|\d+)$/i.test(String(value).trim()) ? Number(value) : NaN;
  if (!Number.isSafeInteger(n) || n < 0 || n >= MAX_FIRMWARE_BYTES || n % 4096) {
    throw new Error('La dirección debe estar alineada a 0x1000 y dentro de los primeros 32 MB.');
  }
  return n;
}

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}

export function validateConfig(config) {
  if (config?.schemaVersion !== 2 || !Array.isArray(config.devices)) throw new Error('El catálogo de dispositivos no es válido.');
  const ids = new Set();
  for (const d of config.devices) {
    if (!/^[A-Z0-9][A-Z0-9_.-]{0,63}$/.test(d.id) || ids.has(d.id)) throw new Error('ID de dispositivo duplicado o inválido.');
    ids.add(d.id);
    if (typeof d.name !== 'string' || !d.name || !CHIPS.includes(d.chip) || !['board','handheld','mini','box'].includes(d.visual)) throw new Error(`${d.id}: datos de hardware inválidos.`);
    if (!Array.isArray(d.releases)) throw new Error(`${d.id}: faltan las versiones.`);
    for (const r of d.releases) {
      if (!r.version || !Array.isArray(r.parts) || !r.parts.length) throw new Error(`${d.id}: versión sin binarios.`);
      if (r.eraseAll !== undefined && typeof r.eraseAll !== 'boolean') throw new Error(`${d.id}: eraseAll debe ser booleano.`);
      const addresses = new Set();
      for (const p of r.parts) {
        const base = `firmware/${d.id}/`;
        if (typeof p.path !== 'string' || !p.path.startsWith(base) || !/^[A-Za-z0-9_./-]+\.bin$/.test(p.path) || p.path.split('/').includes('..')) throw new Error(`${d.id}: ruta de firmware inválida.`);
        const address = offsetNumber(p.offset);
        if (addresses.has(address)) throw new Error(`${d.id}: dirección repetida.`);
        addresses.add(address);
        if (!/^[a-f0-9]{64}$/i.test(p.sha256 || '')) throw new Error(`${d.id}: falta SHA-256 del binario.`);
      }
    }
  }
  return config;
}

export async function loadConfig() {
  const response = await fetch('./devices.json', {cache:'no-store'});
  if (!response.ok) throw new Error(`No se puede cargar devices.json (HTTP ${response.status}).`);
  return validateConfig(await response.json());
}

export function checkRanges(parts) {
  const sorted = parts.map(p => ({address:p.address, length:p.bytes.length})).sort((a,b) => a.address - b.address);
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (!p.length || p.length > MAX_FIRMWARE_BYTES || p.address + p.length > MAX_FIRMWARE_BYTES) throw new Error('El binario está vacío o supera el espacio de Flash admitido.');
    if (i && p.address < Math.ceil((sorted[i-1].address + sorted[i-1].length) / 4096) * 4096) throw new Error('Las regiones de firmware se solapan.');
  }
}

export function checkMergedFactoryImage(bytes, chip) {
  const targets = {'ESP32':{boot:0x1000,id:0},'ESP32-S3':{boot:0x0,id:9},'ESP32-C5':{boot:0x2000,id:23}};
  const target = targets[chip];
  if (!target || bytes.length < 0x10018) throw new Error('Imagen de fábrica incompleta o chip no admitido.');
  for (const address of [target.boot, 0x10000]) {
    const count = bytes[address + 1];
    const imageChip = bytes[address + 12] | (bytes[address + 13] << 8);
    if (bytes[address] !== 0xe9 || count < 1 || count > 16 || imageChip !== target.id) {
      throw new Error(`Cabecera de imagen incompatible en 0x${address.toString(16)} para ${chip}.`);
    }
  }
  if (bytes[0x8000] !== 0xaa || bytes[0x8001] !== 0x50) throw new Error('Falta la tabla de particiones en 0x8000.');
  const declaredFlashMB = {2:4,3:8,4:16}[bytes[target.boot + 3] >> 4];
  if (declaredFlashMB && bytes.length > declaredFlashMB * 1024 * 1024) throw new Error('La imagen supera la capacidad Flash indicada en su cabecera.');
}
