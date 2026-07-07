import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildShareText } from '../src/share.js';

const params = { endAge: 100 };

test('buildShareText: 安心圏なら年齢入りのポジティブ文', () => {
  const t = buildShareText({ survivesToEnd: true, lifetimeAge: null, targetAge: 65 }, params);
  assert.ok(t.includes('100歳') && t.includes('#マネービジョン'));
});

test('buildShareText: 枯渇ケースでも数字を晒さず前向きな誘い文', () => {
  const t = buildShareText({ survivesToEnd: false, lifetimeAge: 78, targetAge: null }, params);
  assert.ok(t.includes('#マネービジョン'));
  assert.ok(!t.includes('78'), '不利な数字はシェア文に入れない');
});

test('buildShareText: 金額（万円・億円）は決して含めない', () => {
  for (const kpis of [
    { survivesToEnd: true, lifetimeAge: null, targetAge: 60 },
    { survivesToEnd: false, lifetimeAge: null, targetAge: null },
  ]) {
    const t = buildShareText(kpis, params);
    assert.ok(!t.includes('万円') && !t.includes('億'));
  }
});
