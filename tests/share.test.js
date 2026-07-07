import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseType, buildShareText, HOUSEHOLD_TYPES } from '../src/share.js';

const base = {
  currentAge: 35, annualIncome: 5000000, annualExpense: 3000000,
  monthlyInvest: 50000, endAge: 100, children: [],
};
const kpisOf = (over = {}) => ({ survivesToEnd: true, lifetimeAge: null, targetAge: 70, ...over });

test('diagnoseType: 収入0はどんな条件でも「はばたき小鳥型」', () => {
  const t = diagnoseType(kpisOf(), { ...base, annualIncome: 0, children: [{ age: 5 }] });
  assert.equal(t.id, 'bird');
});

test('diagnoseType: 目標到達が15年以内なら「まっしぐらうさぎ型」', () => {
  const t = diagnoseType(kpisOf({ targetAge: 48 }), base); // 13年
  assert.equal(t.id, 'rabbit');
});

test('diagnoseType: 子ども登録ありは「家族でバンザイ型」', () => {
  const t = diagnoseType(kpisOf({ targetAge: 70 }), { ...base, children: [{ age: 5 }] });
  assert.equal(t.id, 'family');
});

test('diagnoseType: 余剰の半分以上を投資に回す高貯蓄率は「じっくり育てるくま型」', () => {
  // 貯蓄率40%・余剰200万のうち投資120万（60%）
  const t = diagnoseType(kpisOf({ targetAge: null }), { ...base, monthlyInvest: 100000 });
  assert.equal(t.id, 'grower');
});

test('diagnoseType: 上記に該当せず安心圏なら「どっしりくま型」', () => {
  const t = diagnoseType(kpisOf({ targetAge: null }), { ...base, monthlyInvest: 10000, annualExpense: 4600000 });
  assert.equal(t.id, 'steady');
});

test('diagnoseType: どれでもなければ「これから芽ぐく型」（前向きな文言）', () => {
  const t = diagnoseType(
    { survivesToEnd: false, lifetimeAge: 78, targetAge: null },
    { ...base, monthlyInvest: 0, annualExpense: 4800000 },
  );
  assert.equal(t.id, 'sprout');
  assert.ok(t.lines.join('').includes('のびしろ'));
});

test('HOUSEHOLD_TYPES: 全タイプが名前・画像・前向きな2行コピーを持つ', () => {
  for (const t of Object.values(HOUSEHOLD_TYPES)) {
    assert.ok(t.name.endsWith('型'));
    assert.ok(t.img.startsWith('assets/'));
    assert.equal(t.lines.length, 2);
    for (const ng of ['ダメ', '不足', '危険', '失敗']) {
      assert.ok(!t.lines.join('').includes(ng), `${t.name} に責める言葉`);
    }
  }
});

test('buildShareText: タイプ名入り・金額なし・ハッシュタグあり', () => {
  const t = buildShareText(kpisOf(), base);
  assert.ok(t.includes('型') && t.includes('#マネービジョン'));
  assert.ok(!t.includes('万円') && !t.includes('億'));
});
