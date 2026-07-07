import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seasonalMessage } from '../src/seasonal.js';
import { buildRecordIcs } from '../src/calendar.js';

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

test('buildRecordIcs: 毎月1日の繰り返し予定を含む正しいICS', () => {
  // 7/4 に作成 → 初回は 8/1
  const ics = buildRecordIcs(new Date(2026, 6, 4));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('RRULE:FREQ=MONTHLY;BYMONTHDAY=1'));
  assert.ok(ics.includes('DTSTART:20260801T090000'));
  assert.ok(ics.includes('マネービジョン'));
  assert.ok(ics.trimEnd().endsWith('END:VCALENDAR'));
});

test('buildRecordIcs: 1日当日に作ったら初回は当日', () => {
  const ics = buildRecordIcs(new Date(2026, 7, 1));
  assert.ok(ics.includes('DTSTART:20260801T090000'));
});
