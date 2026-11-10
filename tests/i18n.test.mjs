import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dictionaries} from '../assets/i18n.js';

test('all visible translation keys and device descriptions exist in each language', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const keys = [...html.matchAll(/data-i18n(?:-aria|-placeholder|-alt)?="([^"]+)"/g)].map(match => match[1]);
  const devices = JSON.parse(readFileSync(new URL('../devices.json', import.meta.url), 'utf8')).devices;
  assert.deepEqual(Object.keys(dictionaries), ['es', 'en', 'zh-CN']);
  for (const [lang, dictionary] of Object.entries(dictionaries)) {
    for (const key of keys) assert.equal(typeof dictionary[key], 'string', `${lang}: ${key}`);
    for (const device of devices) assert.equal(dictionary.devices[device.id]?.length, 2, `${lang}: ${device.id}`);
  }
});
