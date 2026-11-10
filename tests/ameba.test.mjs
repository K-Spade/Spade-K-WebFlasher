import test from 'node:test';
import assert from 'node:assert/strict';
import {AMEBA_PROTOCOL, imageChecksum, padToBlocks, buildDataPacket, buildEraseCommand, Sequencer} from '../assets/ameba.js';

test('Ameba blocks are padded with 0xFF to 1 KiB', () => {
  const padded = padToBlocks(new Uint8Array([1, 2, 3]));
  assert.equal(padded.length, 1024);
  assert.equal(padded[0], 1);
  assert.equal(padded[2], 3);
  assert.equal(padded[3], 0xff);
  assert.equal(padToBlocks(new Uint8Array(1025)).length, 2048);
});

test('Ameba checksum starts at 0xFF and wraps at 8 bits', () => {
  assert.equal(imageChecksum(new Uint8Array(AMEBA_PROTOCOL.CHECKSUM_SPAN)), 0xff);
  assert.equal(imageChecksum(Uint8Array.of(1, 2, 3), 3), 5);
});

test('Ameba write packets carry the sequence, address, block and checksum', () => {
  const block = new Uint8Array(1024).fill(0x5a);
  const packet = buildDataPacket(258, 0x08006000, block);
  assert.equal(packet.length, AMEBA_PROTOCOL.PACKET_SIZE);
  assert.equal(packet[0], AMEBA_PROTOCOL.CMD_WRITE);
  assert.equal(packet[1], 2);
  assert.equal(packet[2], 0xfd);
  assert.equal(new DataView(packet.buffer).getUint32(3, true), 0x08006000);
  assert.deepEqual(packet.subarray(7, 1031), block);
  assert.equal(packet[1031], imageChecksum(packet, 1031));
});

test('Ameba erase commands encode a 24-bit flash offset and sector count', () => {
  const command = buildEraseCommand(0x08006000, 219);
  assert.equal(command.length, 6);
  assert.equal(command[0], AMEBA_PROTOCOL.CMD_ERASE);
  assert.deepEqual([...command.subarray(1, 4)], [0x00, 0x60, 0x00]);
  assert.equal(new DataView(command.buffer).getUint16(4, true), 219);
  assert.deepEqual([...buildEraseCommand(0x6000, 2).subarray(1, 4)], [0x00, 0x60, 0x00]);
  assert.throws(() => buildEraseCommand(0, 0), /sectores/);
  assert.throws(() => buildEraseCommand(0x09000000, 1), /Dirección/);
});

test('Ameba packet sequence wraps at 16 bits', () => {
  const sequencer = new Sequencer(65535);
  assert.equal(sequencer.next(), 65535);
  assert.equal(sequencer.next(), 0);
  assert.equal(sequencer.next(), 1);
});
