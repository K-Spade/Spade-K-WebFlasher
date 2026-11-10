import test from 'node:test';
import assert from 'node:assert/strict';
import {validateConfig, checkRanges, checkMergedFactoryImage, baudRateNumber, supportsBrowserFlashing, downloadFileName} from '../assets/config.js';
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

test('custom baud rate accepts supported bounds and rejects invalid values', () => {
  for (const rate of [9600, 115200, 230400, 460800, 921600, 250000]) assert.equal(baudRateNumber(String(rate)), rate);
  for (const rate of ['', ' ', 'abc', '1e5', '0x10000', 9599, 921601, -1, 115200.5, Infinity, null, true]) assert.throws(() => baudRateNumber(rate), /Invalid baud rate/);
});

test('BW16 is catalogued for downloads and cannot use the ESP32 driver', () => {
  const config=base();config.devices=[{id:'BW16',name:'BW16',chip:'RTL8720DN',visual:'board',downloadOnly:true,releases:[]}];
  assert.equal(validateConfig(config).devices[0].id,'BW16');
  assert.equal(supportsBrowserFlashing(config.devices[0]),false);
  assert.equal(supportsBrowserFlashing(base().devices[0]),true);
  assert.equal(supportsBrowserFlashing({chip:'UNKNOWN'}),false);
  config.devices[0].downloadOnly=false;
  assert.throws(()=>validateConfig(config),/downloadOnly/);
});

test('download-only releases omit write addresses and erase flags', () => {
  const config=base();config.devices=[{id:'BW16',name:'BW16',chip:'RTL8720DN',visual:'board',downloadOnly:true,releases:[{version:'1.0',parts:[{path:'firmware/BW16/sub/km0_km4_image2.bin',filename:'BW16-v1.0-km0_km4_image2.bin',sha256:'b'.repeat(64)}]}]}];
  assert.doesNotThrow(()=>validateConfig(config));
  assert.equal(downloadFileName(config.devices[0].releases[0].parts[0]),'BW16-v1.0-km0_km4_image2.bin');
  assert.equal(downloadFileName({path:'firmware/BW16/plain.bin'}),'plain.bin');
  config.devices[0].releases[0].parts[0].offset='0x0';
  assert.throws(()=>validateConfig(config),/dirección de escritura/);
  delete config.devices[0].releases[0].parts[0].offset;
  config.devices[0].releases[0].eraseAll=true;
  assert.throws(()=>validateConfig(config),/borrar la memoria/);
});

test('download file names cannot escape their names or directories', () => {
  const config=base();config.devices=[{id:'BW16',name:'BW16',chip:'RTL8720DN',visual:'board',downloadOnly:true,releases:[{version:'1.0',parts:[{path:'firmware/BW16/a.bin',filename:'../a.bin',sha256:'c'.repeat(64)}]}]}];
  assert.throws(()=>validateConfig(config),/nombre de descarga/);
  config.devices[0].releases[0].parts[0].filename='name with space.bin';
  assert.throws(()=>validateConfig(config),/nombre de descarga/);
  config.devices[0].releases[0].parts[0].filename='ok-name.bin';
  assert.doesNotThrow(()=>validateConfig(config));
});

test('ameba devices require a loader and flash by offset', () => {
  const config=base();config.devices=[{id:'BW16',name:'BW16',chip:'RTL8720DN',visual:'board',flashProtocol:'ameba',ameba:{flashloader:{path:'firmware/BW16/_common/loader.bin',sha256:'a'.repeat(64),address:'0x82000'}},releases:[{version:'1.0',parts:[{path:'firmware/BW16/app.bin',offset:'0x6000',sha256:'b'.repeat(64)}]}]}];
  assert.doesNotThrow(()=>validateConfig(config));
  assert.equal(supportsBrowserFlashing(config.devices[0]),true);
  config.devices[0].ameba.flashloader.address='0x123';
  assert.throws(()=>validateConfig(config),/dirección/);
  config.devices[0].ameba.flashloader.address='0x82000';
  config.devices[0].releases[0].eraseAll=true;
  assert.throws(()=>validateConfig(config),/eraseAll/);
  config.devices[0].releases[0].eraseAll=false;
  config.devices[0].ameba.flashloader.path='firmware/OTHER/loader.bin';
  assert.throws(()=>validateConfig(config),/cargador Ameba/);
});
