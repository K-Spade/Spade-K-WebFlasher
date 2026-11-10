const ACK = 0x06;
const NAK = 0x15;
const CMD_WRITE = 0x02;
const CMD_RESET = 0x04;
const CMD_BAUD = 0x05;
const CMD_XMODEM = 0x07;
const CMD_ERASE = 0x17;
const CMD_FLASH_MODE = 0x26;

const BAUD_CODES = {115200:12, 230400:16, 460800:18, 921600:20};
const BLOCK = 1024;
const SECTOR = 4096;
const PACKET_SIZE = 1032;
const CHECKSUM_SPAN = 1031;
const FLASHLOADER_ADDRESS = 0x82000;
export const FLASH_BASE = 0x08000000;
const FLASH_MODE_COMMAND = Uint8Array.of(CMD_FLASH_MODE, 1, 1, 0);

export const AMEBA_PROTOCOL = Object.freeze({ACK, NAK, CMD_WRITE, CMD_RESET, CMD_BAUD, CMD_XMODEM, CMD_ERASE, CMD_FLASH_MODE, BLOCK, SECTOR, PACKET_SIZE, CHECKSUM_SPAN, FLASHLOADER_ADDRESS, FLASH_BASE, BAUD_CODES:Object.freeze({...BAUD_CODES})});

export class AmebaError extends Error {
  constructor(message) { super(message); this.name = 'AmebaError'; }
}

export function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

export function imageChecksum(bytes, length = CHECKSUM_SPAN) {
  let sum = 0xff;
  for (let i = 0; i < length; i++) sum = (sum + bytes[i]) & 0xff;
  return sum;
}

export function padToBlocks(bytes) {
  const count = Math.max(1, Math.ceil(bytes.length / BLOCK));
  const padded = new Uint8Array(count * BLOCK).fill(0xff);
  padded.set(bytes);
  return padded;
}

export function buildDataPacket(sequence, address, block) {
  if (block.length !== BLOCK) throw new AmebaError(`El bloque debe tener ${BLOCK} bytes.`);
  const packet = new Uint8Array(PACKET_SIZE), view = new DataView(packet.buffer);
  packet[0] = CMD_WRITE;
  packet[1] = sequence & 0xff;
  packet[2] = ~sequence & 0xff;
  view.setUint32(3, address >>> 0, true);
  packet.set(block, 7);
  packet[PACKET_SIZE - 1] = imageChecksum(packet, CHECKSUM_SPAN);
  return packet;
}

export function buildEraseCommand(address, sectors) {
  if (!Number.isInteger(sectors) || sectors < 1 || sectors > 0xffff) throw new AmebaError(`Número de sectores inválido: ${sectors}.`);
  const offset = address >= FLASH_BASE ? address - FLASH_BASE : address;
  if (!Number.isInteger(offset) || offset < 0 || offset > 0xffffff) throw new AmebaError(`Dirección de borrado inválida: ${address}.`);
  const command = new Uint8Array(6), view = new DataView(command.buffer);
  command[0] = CMD_ERASE;
  command[1] = offset & 0xff;
  command[2] = (offset >>> 8) & 0xff;
  command[3] = (offset >>> 16) & 0xff;
  view.setUint16(4, sectors, true);
  return command;
}

export class Sequencer {
  constructor(start = 1) { this.value = start; }
  next() { return this.value++ & 0xffff; }
  reset(start = 1) { this.value = start; }
}

export class AmebaSerial {
  constructor(port, log = () => {}) {
    this.port = port;
    this.log = log;
    this.queue = [];
    this.waiters = [];
    this.reader = null;
    this.writer = null;
    this.closed = false;
    this.disconnected = false;
    this.fatalError = null;
    this.signals = {};
  }
  getInfo() { try { return this.port.getInfo?.() || {}; } catch { return {}; } }
  async open(baudRate = 115200) {
    await this.port.open({baudRate, dataBits:8, stopBits:1, parity:'none', flowControl:'none'});
    this.writer = this.port.writable.getWriter();
    this.reader = this.port.readable.getReader();
    this._readLoop();
  }
  async _readLoop() {
    const reader = this.reader;
    try {
      while (!this.closed) {
        const {value, done} = await reader.read();
        if (done) break;
        for (const byte of value) this._push(byte);
      }
    } catch (error) {
      if (this.closed) return;
      this.disconnected = true;
      this.fatalError = error;
      this._failWaiters(new AmebaError(`Lectura del puerto interrumpida: ${error.message}`));
    }
  }
  _push(byte) {
    const index = this.waiters.findIndex(waiter => waiter.match(byte));
    if (index !== -1) {
      const [waiter] = this.waiters.splice(index, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(byte);
      return;
    }
    this.queue.push(byte);
    if (this.queue.length > 8192) this.queue.splice(0, this.queue.length - 8192);
  }
  _failWaiters(error) {
    for (const waiter of this.waiters.splice(0)) { clearTimeout(waiter.timer); waiter.reject(error); }
  }
  clearQueue() { this.queue.length = 0; }
  waitFor(match, timeout = 5000, label = 'respuesta') {
    const index = this.queue.findIndex(match);
    if (index !== -1) return Promise.resolve(this.queue.splice(index, 1)[0]);
    if (this.closed || this.disconnected) return Promise.reject(new AmebaError('El puerto serie está cerrado o el dispositivo se ha desconectado.'));
    if (this.fatalError) return Promise.reject(new AmebaError(`Lectura del puerto interrumpida: ${this.fatalError.message}`));
    return new Promise((resolve, reject) => {
      const waiter = {match, resolve, reject, timer:0};
      waiter.timer = setTimeout(() => {
        const position = this.waiters.indexOf(waiter);
        if (position !== -1) this.waiters.splice(position, 1);
        reject(new AmebaError(`Tiempo de espera agotado (${timeout} ms): ${label}.`));
      }, timeout);
      this.waiters.push(waiter);
    });
  }
  waitForAck(timeout = 5000) { return this.waitFor(byte => byte === ACK, timeout, 'ACK'); }
  waitForNak(timeout = 5000) { return this.waitFor(byte => byte === NAK, timeout, 'NAK'); }
  async write(bytes) {
    if (this.closed) throw new AmebaError('El puerto serie está cerrado.');
    await this.writer.write(bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes));
  }
  async setSignals(signals) {
    this.signals = {...this.signals, ...signals};
    await this.port.setSignals(this.signals);
  }
  async reopenAt(baudRate) {
    if (this.closed) throw new AmebaError('El puerto serie está cerrado.');
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        try { await this.reader?.cancel(); } catch {}
        try { this.reader?.releaseLock(); } catch {}
        try { this.writer?.releaseLock(); } catch {}
        this.reader = null; this.writer = null;
        try { await this.port.close(); } catch {}
        await this.port.open({baudRate, dataBits:8, stopBits:1, parity:'none', flowControl:'none'});
        this.writer = this.port.writable.getWriter();
        this.reader = this.port.readable.getReader();
        this.queue.length = 0;
        this.fatalError = null;
        this.disconnected = false;
        this._readLoop();
        return;
      } catch (error) {
        lastError = error;
        await delay(200);
      }
    }
    throw lastError;
  }
  async close() {
    if (this.closed) return;
    this.closed = true;
    this._failWaiters(new AmebaError('Puerto serie cerrado.'));
    try { await this.reader?.cancel(); } catch {}
    try { this.reader?.releaseLock(); } catch {}
    try { this.writer?.releaseLock(); } catch {}
    try { await this.port.close(); } catch {}
  }
}

async function sendCommand(serial, frame, {timeout = 5000, waitForNakFirst = true} = {}) {
  if (waitForNakFirst) await serial.waitForNak(timeout);
  await serial.write(frame);
  await serial.waitForAck(timeout);
}

async function switchBaud(serial, baudRate, timeout) {
  const code = BAUD_CODES[baudRate];
  if (!code) throw new AmebaError(`Velocidad no admitida: ${baudRate}.`);
  await serial.waitForNak(timeout);
  await serial.write(Uint8Array.of(CMD_BAUD, code));
  await serial.waitForAck(2000);
  await serial.reopenAt(baudRate);
}

async function enterDownloadMode(serial, scheme, delayFn) {
  const sequences = {
    A:[[{requestToSend:true, dataTerminalReady:false},500],[{requestToSend:false, dataTerminalReady:true},200],[{requestToSend:false, dataTerminalReady:false},500]],
    B:[[{requestToSend:false, dataTerminalReady:false},50],[{requestToSend:true, dataTerminalReady:false},100],[{requestToSend:false, dataTerminalReady:false},1],[{requestToSend:false, dataTerminalReady:true},300]]
  };
  if (!sequences[scheme]) throw new AmebaError(`Secuencia de arranque desconocida: ${scheme}.`);
  for (const [signals, ms] of sequences[scheme]) {
    await serial.setSignals(signals);
    await delayFn(ms);
  }
}

async function tryDetectBootloader(serial, {log, onManual, delayFn}) {
  const vendorId = serial.getInfo().usbVendorId;
  try {
    await serial.waitForNak(900);
    await serial.waitForNak(900);
    log('Download mode already active.');
    return true;
  } catch {
    serial.clearQueue();
  }
  const schemes = vendorId === 0x1a86 ? ['B', 'A'] : ['A', 'B'];
  for (const [index, scheme] of schemes.entries()) {
    if (index) { try { await serial.reopenAt(115200); } catch {} }
    serial.clearQueue();
    await serial.setSignals({requestToSend:false, dataTerminalReady:false});
    await enterDownloadMode(serial, scheme, delayFn);
    try {
      await serial.waitForNak(3000);
      await serial.waitForNak(3000);
      log(`Download mode ready (sequence ${scheme}).`);
      return true;
    } catch {}
  }
  log('Automatic download mode failed; waiting for manual BOOT/RST sequence.');
  for (let attempt = 0; attempt < 3; attempt++) {
    await serial.setSignals({requestToSend:false, dataTerminalReady:false});
    onManual(attempt + 1);
    try {
      await serial.waitForNak(15000);
      await serial.waitForNak(3000);
      return false;
    } catch {
      log(`No response to manual sequence ${attempt + 1}; retrying.`);
    }
  }
  throw new AmebaError('No se pudo entrar en modo de descarga. Mantén BURN, pulsa RST y suelta BURN.');
}

async function enterReceiveMode(serial, baudRate, {timeout, log, signal}) {
  const attempt = async rate => {
    if (signal?.aborted) throw new AmebaError('Operación cancelada.');
    if (rate !== 115200) await switchBaud(serial, rate, timeout);
    await serial.write(Uint8Array.of(CMD_XMODEM));
    await serial.waitForAck(timeout);
    await serial.waitForNak(timeout);
    return rate;
  };
  if (baudRate !== 115200) {
    try {
      return await attempt(baudRate);
    } catch (error) {
      log(`High-speed handshake failed (${error.message}); retrying at 115200.`);
      try { await serial.reopenAt(115200); } catch {}
    }
  }
  try {
    return await attempt(115200);
  } catch (error) {
    if (baudRate === 115200) throw error;
    log(`Standard handshake failed (${error.message}); retrying at ${baudRate}.`);
    await serial.reopenAt(115200).catch(() => {});
  }
  return attempt(baudRate);
}

async function writeImage(serial, address, bytes, sequencer, {timeout, onBlock, signal, waitForStart = true}) {
  const padded = padToBlocks(bytes);
  const blocks = padded.length / BLOCK;
  if (waitForStart) await serial.waitForNak(timeout);
  for (let index = 0; index < blocks; index++) {
    if (signal?.aborted) throw new AmebaError('Operación cancelada.');
    const offset = index * BLOCK;
    await serial.write(buildDataPacket(sequencer.next(), address + offset, padded.subarray(offset, offset + BLOCK)));
    await serial.waitForAck(timeout);
    onBlock?.(index + 1, blocks);
  }
  return padded.length;
}

async function eraseImage(serial, address, length, timeout) {
  const sectors = Math.max(1, Math.ceil(length / SECTOR));
  await sendCommand(serial, buildEraseCommand(address, sectors), {timeout:Math.max(timeout, 20000)});
  return sectors;
}

/**
 * Flashes an AmebaD / RTL8720DN over an already-authorized Web Serial port.
 * The RAM flashloader is required; parts are written sequentially to their absolute flash addresses.
 */
export async function flashAmeba({port, flashloader, parts, baudRate = 921600, log = () => {}, onProgress = () => {}, onManual = () => {}, signal, timeout = 5000, delayFn = delay}) {
  if (!port) throw new AmebaError('No hay ningún puerto serie autorizado.');
  if (!flashloader?.bytes?.length) throw new AmebaError('Falta el cargador Ameba.');
  if (!Array.isArray(parts) || !parts.length) throw new AmebaError('No hay imágenes para escribir.');
  const ordered = [...parts].sort((a, b) => a.address - b.address);
  const totalBytes = flashloader.bytes.length + ordered.reduce((sum, part) => sum + part.bytes.length, 0);
  let writtenBytes = 0;
  let currentBaud = 115200;
  const serial = new AmebaSerial(port, log);
  const report = (phase, extra = {}) => onProgress({phase, writtenBytes, totalBytes, ...extra});
  try {
    report('enter');
    await serial.open(115200);
    await tryDetectBootloader(serial, {log, onManual, delayFn});

    currentBaud = await enterReceiveMode(serial, baudRate, {timeout, log, signal});

    report('flashloader');
    await writeImage(serial, flashloader.address, flashloader.bytes, new Sequencer(1), {
      timeout, signal, onBlock:(done, blocks) => onProgress({phase:'flashloader', writtenBytes:Math.round(done / blocks * flashloader.bytes.length), totalBytes})
    });
    writtenBytes += flashloader.bytes.length;

    report('reset');
    await sendCommand(serial, Uint8Array.of(CMD_RESET), {timeout});
    if (currentBaud !== 115200) {
      await serial.reopenAt(115200);
      currentBaud = 115200;
    }
    await serial.waitForNak(timeout);
    await serial.waitForNak(timeout);
    await sendCommand(serial, FLASH_MODE_COMMAND, {timeout});
    log('Flash mode enabled.');

    report('erase');
    for (const part of ordered) await eraseImage(serial, part.address, part.bytes.length, timeout);
    log(`Erased ${ordered.length} image region(s).`);

    currentBaud = await enterReceiveMode(serial, baudRate, {timeout, log, signal});
    const sequencer = new Sequencer(1);
    for (const [index, part] of ordered.entries()) {
      report('write', {index, total:ordered.length, name:part.name || `image-${index + 1}`});
      const base = writtenBytes;
      await writeImage(serial, part.address, part.bytes, sequencer, {
        timeout, signal,
        onBlock:(done, blocks) => onProgress({phase:'write', index, total:ordered.length, name:part.name || `image-${index + 1}`, writtenBytes:base + Math.round(done / blocks * part.bytes.length), totalBytes})
      });
      writtenBytes = base + part.bytes.length;
    }

    report('finalize');
    await serial.setSignals({dataTerminalReady:false});
    await delayFn(60);
    try {
      await sendCommand(serial, Uint8Array.of(CMD_RESET), {timeout:Math.min(timeout, 2000)});
    } catch (error) {
      if (serial.disconnected) throw error;
      log('The reset command was not acknowledged; finishing anyway.');
    }
    if (currentBaud !== 115200) {
      try { await serial.reopenAt(115200); } catch {}
      currentBaud = 115200;
    }
    try {
      await serial.setSignals({dataTerminalReady:false});
      await delayFn(60);
      await serial.setSignals({requestToSend:true});
      await delayFn(150);
      await serial.setSignals({requestToSend:false});
      await delayFn(300);
    } catch {}
    report('done');
    return {writtenBytes, totalBytes};
  } finally {
    await serial.close();
  }
}
