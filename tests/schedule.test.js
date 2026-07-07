import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSchedule } from '../src/schedule.js';

const base = { currentAge: 35, endAge: 100, children: [], events: [] };

test('buildSchedule: 子5歳 — 段階の変わり目だけが年昇順で並ぶ', () => {
  const rows = buildSchedule({ ...base, children: [{ age: 5 }] }, 2026);
  assert.deepEqual(rows.map((r) => [r.year, r.age]), [
    [2027, 36], [2033, 42], [2036, 45], [2039, 48], [2043, 52],
  ]);
  assert.ok(rows.every((r) => r.items.length === 1));
  assert.ok(rows[0].items[0].includes('小学校') && rows[0].items[0].includes('年40万') && rows[0].items[0].includes('+10万'));
  assert.ok(rows[3].items[0].includes('大学入学') && rows[3].items[0].includes('年180万') && rows[3].items[0].includes('+150万'));
  assert.ok(rows[4].items[0].includes('独立') && rows[4].items[0].includes('−30万'));
});

test('buildSchedule: 同じ年の支出は1行にまとまる', () => {
  const rows = buildSchedule({ ...base, children: [{ age: 5 }, { age: 11 }] }, 2026);
  // 2027年: 子ども1が小学校(6歳) + 子ども2が中学校(12歳)
  const y2027 = rows.find((r) => r.year === 2027);
  assert.equal(y2027.items.length, 2);
  assert.ok(y2027.items[0].includes('子ども1が小学校'));
  assert.ok(y2027.items[1].includes('子ども2が中学校'));
  // 年は重複しない
  const years = rows.map((r) => r.year);
  assert.equal(new Set(years).size, years.length);
});

test('buildSchedule: イベントも同じ年の行に混ざる', () => {
  const rows = buildSchedule(
    { ...base, children: [{ age: 5 }], events: [{ age: 36, amount: 10000000, label: '住宅頭金' }] },
    2026,
  );
  const y2027 = rows.find((r) => r.year === 2027);
  assert.equal(y2027.items.length, 2);
  assert.ok(y2027.items[0].includes('小学校'));
  assert.ok(y2027.items[1].includes('住宅頭金') && y2027.items[1].includes('1,000万円'));
});

test('buildSchedule: 子どもの名前があれば表示に使う（未入力は子どもN）', () => {
  const rows = buildSchedule({ ...base, children: [{ age: 5, name: 'たろう' }, { age: 11 }] }, 2026);
  const y2027 = rows.find((r) => r.year === 2027);
  assert.ok(y2027.items[0].includes('たろうが小学校'));
  assert.ok(y2027.items[1].includes('子ども2が中学校'));
});

test('buildSchedule: 過去の段階（幼稚園）は出さない', () => {
  const rows = buildSchedule({ ...base, children: [{ age: 5 }] }, 2026);
  assert.ok(rows.every((r) => r.items.every((t) => !t.includes('幼稚園'))));
});

test('buildSchedule: 範囲外イベント・22歳以上の子は行なし、空なら空配列', () => {
  assert.deepEqual(buildSchedule(base, 2026), []);
  assert.deepEqual(buildSchedule({ ...base, children: [{ age: 25 }] }, 2026), []);
  assert.deepEqual(buildSchedule({ ...base, events: [{ age: 20, amount: 1 }, { age: 101, amount: 1 }] }, 2026), []);
});

test('buildSchedule: children/events 未指定でも動く', () => {
  assert.deepEqual(buildSchedule({ currentAge: 35, endAge: 100 }, 2026), []);
});

test('buildSchedule: 進路コースが大学費用の行に反映される', () => {
  const rows = buildSchedule({ ...base, children: [{ age: 5, course: 'private-science-away' }] }, 2026);
  const univ = rows.find((r) => r.items.some((t) => t.includes('大学入学')));
  assert.ok(univ.items[0].includes('年250万'));
});
