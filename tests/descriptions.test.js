import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DESCRIPTIONS } from '../src/descriptions.js';
import { allTypes } from '../src/share.js';

test('DESCRIPTIONS: share.js の全16タイプコードと一致する', () => {
  const codes = allTypes().map((t) => t.code);
  assert.deepEqual(Object.keys(DESCRIPTIONS).sort(), [...codes].sort());
});

test('DESCRIPTIONS: 各タイプ4段落・空段落なし・第1段落にタイプ名を含む', () => {
  for (const t of allTypes()) {
    const paras = DESCRIPTIONS[t.code];
    assert.equal(paras.length, 4, `${t.code} は4段落`);
    for (const p of paras) {
      assert.ok(typeof p === 'string' && p.trim().length >= 50, `${t.code} に空/短すぎる段落`);
    }
    assert.ok(paras[0].includes(t.name), `${t.code} 第1段落に「${t.name}」`);
  }
});
