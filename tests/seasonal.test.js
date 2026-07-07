import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seasonalMessage } from '../src/seasonal.js';

test('seasonalMessage: 該当月はメッセージ・対象外の月は null', () => {
  const jan = seasonalMessage(new Date(2026, 0, 15));
  assert.ok(jan.text.includes('今年'));
  assert.ok(jan.img.startsWith('assets/'));
  const jun = seasonalMessage(new Date(2026, 5, 1));
  assert.ok(jun.text.includes('ボーナス'));
  assert.equal(seasonalMessage(new Date(2026, 1, 10)), null); // 2月は無し
});

test('seasonalMessage: 金額を含まない・責めない文言', () => {
  for (let m = 0; m < 12; m++) {
    const msg = seasonalMessage(new Date(2026, m, 1));
    if (!msg) continue;
    assert.ok(!/[0-9０-９]+万円/.test(msg.text), `${m + 1}月に金額`);
    assert.ok(!msg.text.includes('遅れ'), `${m + 1}月に責め文言`);
  }
});
