import test from 'node:test';
import assert from 'node:assert/strict';
import {validateConfig, checkRanges, checkMergedFactoryImage} from '../assets/config.js';
import {md5} from '../assets/md5.js';

const base = () => ({schemaVersion:2, devices:[{id:'BOARD_V1',name:'Board V1',chip:'ESP32',visual:'board',releases:[]}]});

test('an unpublished board can appear without enabling a firmware release', () => {
  assert.equal(validateConfig(base()).devices[0].releases.length, 0);
});

test('firmware must stay in its device directory and include a SHA-256', () => {
  const config = base();
  config.devices[0].releases = [{version:'1.0',parts:[{path:'firmware/OTHER/app.bin',offset:'0x10000',sha256:'a'.repeat(64)}]}];
  assert.throws(() => validateConfig(config), /ruta de firmware/);
  config.devices[0].releases[0].parts[0].path = 'firmware/BOARD_V1/app.bin';
  config.devices[0].releases[0].parts[0].sha256 = '';
  assert.throws(() => validateConfig(config), /SHA-256/);
});

test('overlapping erase sectors are rejected', () => {
  assert.throws(() => checkRanges([{address:0,bytes:new Uint8Array(5000)},{address:4096,bytes:new Uint8Array(100)}]), /solapan/);
});

test('MD5 accepts byte arrays used by esptool-js 0.7', () => {
  assert.equal(md5(new TextEncoder().encode('abc')), '900150983cd24fb0d6963f7d28e17f72');
});

test('factory image must include bootloader, matching app, and partition table', () => {
  const image = new Uint8Array(0x10020);
  for (const offset of [0x2000, 0x10000]) {
    image[offset] = 0xe9;
    image[offset + 1] = 3;
    image[offset + 12] = 23;
  }
  image[0x8000] = 0xaa;
  image[0x8001] = 0x50;
  assert.doesNotThrow(() => checkMergedFactoryImage(image, 'ESP32-C5'));
  image[0x10000 + 12] = 9;
  assert.throws(() => checkMergedFactoryImage(image, 'ESP32-C5'), /incompatible/);
  image[0x10000 + 12] = 23;
  image[0x8000] = 0xff;
  assert.throws(() => checkMergedFactoryImage(image, 'ESP32-C5'), /particiones/);
});
