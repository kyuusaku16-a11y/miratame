import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdvice,
  buildNarrativeReport,
  solveExtraMonthlyInvest,
  solveMonthlyExpenseCut,
} from '../src/advice.js';
import { projectAssets, deriveKpis } from '../src/calc.js';

const base = {
  currentAge: 35, totalAsset: 5000000, investedAsset: 5000000,
  monthlyInvest: 50000, annualIncome: 5000000, annualExpense: 3000000,
  expectedReturn: 5, targetAmount: 100000000,
  retireAge: 65, pensionAnnual: 1800000, pensionStartAge: 65,
  retirementBonus: 0, retiredExpenseRatio: 0.7, endAge: 100,
  events: [], children: [],
};

const run = (params) => {
  const series = projectAssets(params, params.expectedReturn / 100);
  const kpis = deriveKpis(series, params);
  const advice = buildAdvice(params, series, kpis);
  const report = buildNarrativeReport(params, series, kpis, advice, 0);
  return { series, kpis, advice, report };
};

// ---- 既存の解説（insights）----

test('buildAdvice: 貯蓄率40%を good でほめる', () => {
  const { advice } = run(base);
  const r = advice.find((a) => a.text.includes('40%'));
  assert.ok(r && r.type === 'good');
});

test('buildAdvice: 退職時点の見込み額を伝える', () => {
  const { series, advice } = run(base);
  const at65 = series.find((p) => p.age === 65);
  const r = advice.find((a) => a.text.includes('65歳時点'));
  assert.ok(r && r.type === 'info');
  assert.ok(r.text.includes('約') && at65.assets > 0);
});

test('buildAdvice: 教育費ピークの年齢と金額を予告する', () => {
  const { advice } = run({ ...base, children: [{ age: 5 }] });
  const r = advice.find((a) => a.text.includes('教育費のピーク'));
  assert.ok(r && r.text.includes('48歳') && r.text.includes('150万円'));
});

// ---- 逆算ソルバー ----

test('solveExtraMonthlyInvest: 提案額で本当に目標へ届き、1,000円少ないと届かない（最小性）', () => {
  // 目標5億は現状未達だが、余剰の範囲の上乗せで届き得るケース
  const p = { ...base, targetAmount: 500000000 };
  const kpis = deriveKpis(projectAssets(p, 0.05), p);
  const extra = solveExtraMonthlyInvest(p, 0.05);
  if (kpis.targetAge !== null || extra === null) {
    // 前提が崩れる場合はスキップ相当（fixtureの見直しが必要）
    assert.fail(`fixture invalid: targetAge=${kpis.targetAge}, extra=${extra}`);
  }
  const withExtra = { ...p, monthlyInvest: p.monthlyInvest + extra };
  assert.notEqual(deriveKpis(projectAssets(withExtra, 0.05), withExtra).targetAge, null, '提案額で届く');
  const withLess = { ...p, monthlyInvest: p.monthlyInvest + extra - 1000 };
  assert.equal(deriveKpis(projectAssets(withLess, 0.05), withLess).targetAge, null, '1,000円少ないと届かない');
  assert.ok((p.monthlyInvest + extra) * 12 <= p.annualIncome - p.annualExpense, '余剰の範囲内');
});

test('solveExtraMonthlyInvest: 余剰いっぱいでも届かないなら null', () => {
  const p = { ...base, targetAmount: 10000000000 }; // 100億は無理
  assert.equal(solveExtraMonthlyInvest(p, 0.05), null);
});

test('solveMonthlyExpenseCut: 提案額で寿命が持ち、1,000円少ないと持たない（最小性）', () => {
  const tight = { ...base, annualExpense: 4800000, monthlyInvest: 0, expectedReturn: 3 };
  const kpis = deriveKpis(projectAssets(tight, 0.03), tight);
  assert.equal(kpis.survivesToEnd, false);
  const cut = solveMonthlyExpenseCut(tight, 0.03);
  assert.notEqual(cut, null);
  const better = { ...tight, annualExpense: tight.annualExpense - cut * 12 };
  assert.equal(deriveKpis(projectAssets(better, 0.03), better).survivesToEnd, true, '提案額で持つ');
  const less = { ...tight, annualExpense: tight.annualExpense - (cut - 1000) * 12 };
  assert.equal(deriveKpis(projectAssets(less, 0.03), less).survivesToEnd, false, '1,000円少ないと持たない');
});

// ---- 新しい💡分析 ----

test('buildAdvice: 未達なら「毎月あと約◯円」の逆算tipが出る', () => {
  const { advice } = run({ ...base, targetAmount: 500000000 });
  const r = advice.find((a) => a.type === 'tip' && a.text.includes('毎月あと約'));
  assert.ok(r, '逆算tipがある');
  assert.ok(r.text.includes('届く計算'));
});

test('buildAdvice: 寿命が持たないなら支出の生き残りラインtipが出る', () => {
  const tight = { ...base, annualExpense: 4800000, monthlyInvest: 0, expectedReturn: 3 };
  const { kpis, advice } = run(tight);
  assert.equal(kpis.survivesToEnd, false);
  const r = advice.find((a) => a.type === 'tip' && a.text.includes('しぼると') && a.text.includes('100歳まで'));
  assert.ok(r);
});

test('buildAdvice: 小さい月額改善でも0万円とは表示しない', () => {
  const tight = { ...base, annualExpense: 4380000, monthlyInvest: 0, expectedReturn: 3 };
  const { kpis, advice } = run(tight);
  assert.equal(kpis.survivesToEnd, false);
  const r = advice.find((a) => a.type === 'tip' && a.text.includes('しぼると'));
  assert.ok(r);
  assert.ok(!r.text.includes('0万円'));
  assert.ok(r.text.includes('約1万円'));
});

test('buildAdvice: 下振れチェック — 耐えるプランには安心材料として出る', () => {
  const { advice } = run(base); // 5%→3%でも持つはず
  const r = advice.find((a) => a.text.includes('3%に下がっても'));
  assert.ok(r && r.title === '安心材料');
});

test('buildAdvice: tipは最大3件・余剰ゼロ(収入0)では積立の逆算を出さない', () => {
  const fire = { ...base, annualIncome: 0, annualExpense: 6000000, totalAsset: 60000000, investedAsset: 55000000, monthlyInvest: 0, currentAge: 39 };
  const { advice } = run(fire);
  assert.ok(advice.filter((a) => a.type === 'tip').length <= 3);
  assert.ok(!advice.some((a) => a.text.includes('毎月あと約')));
});

test('buildAdvice: 収支が厳しすぎる場合でも改善のヒントを出す', () => {
  const severe = { ...base, annualIncome: 3000000, annualExpense: 4200000, monthlyInvest: 0 };
  const { kpis, advice } = run(severe);
  assert.equal(kpis.targetAge, null);
  assert.equal(kpis.survivesToEnd, false);
  const r = advice.find((a) => a.type === 'tip' && a.title === '改善のヒント');
  assert.ok(r, '厳しい条件でも改善のヒントがある');
  assert.ok(r.text.includes('収支') || r.text.includes('支出'));
});

// ---- 診断レポート（既存仕様の維持）----

test('buildNarrativeReport: 3行以上の診断コメントを返す', () => {
  const { report } = run(base);
  assert.equal(report.type, 'diagnosis');
  assert.equal(report.title, '今回の診断');
  assert.ok(report.lines.length >= 3);
  assert.ok(report.lines.every((line) => line.length >= 20));
});

test('buildNarrativeReport: 家計評価・退職時点を含める', () => {
  const { report } = run(base);
  const text = report.lines.join('\n');
  assert.ok(text.includes('40%'));
  assert.ok(text.includes('65歳時点'));
});

test('buildNarrativeReport: 教育費ピークがある場合は診断内で山場を伝える', () => {
  const { report } = run({ ...base, children: [{ age: 5 }] });
  const text = report.lines.join('\n');
  assert.ok(text.includes('教育費') && text.includes('48歳') && text.includes('150万円'));
});

test('buildNarrativeReport: 資産寿命が持たない場合は見直し余地を伝える', () => {
  const tight = { ...base, annualExpense: 4800000, monthlyInvest: 0, expectedReturn: 3 };
  const { kpis, report } = run(tight);
  assert.equal(kpis.survivesToEnd, false);
  assert.ok(report.lines.join('\n').includes(`${kpis.lifetimeAge}歳`));
});
