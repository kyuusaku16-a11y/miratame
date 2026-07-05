// 「これからの大きな支出」予定表を作る純粋関数。
// グラフの凸凹（教育費の段階変化・ライフイベント）を言語化する。

import { educationCostAt } from './calc.js';

// 教育段階の変わり目（進入年齢 → 表示名）。19歳の減額は載せない（騒がしさ回避）。
const STAGES = [
  [3, '幼稚園・保育園'],
  [6, '小学校'],
  [12, '中学校'],
  [15, '高校'],
  [18, '大学入学'],
  [22, '独立'],
];

const man = (yen) => `${Math.round(yen / 10000).toLocaleString()}万`;

// params: { currentAge, endAge, children?, events? }
// currentYear: 注入可能（テスト用）
// 返り値: [{ year, age, items: [text] }]（year昇順・同じ年は1行にまとめる）
export function buildSchedule(params, currentYear = new Date().getFullYear()) {
  const { currentAge, endAge, children = [], events = [] } = params;
  const entries = [];

  children.forEach((child, i) => {
    const who = child.name || `子ども${i + 1}`;
    const baseCost = educationCostAt(child.age);
    for (const [entryAge, stage] of STAGES) {
      const adultAge = currentAge + (entryAge - child.age);
      if (adultAge <= currentAge || adultAge > endAge) continue;
      const cost = educationCostAt(entryAge);
      const delta = cost - baseCost;
      const text =
        entryAge === 22
          ? `${who}が独立（教育費 −${man(baseCost)}/年）`
          : `${who}が${stage} 年${man(cost)}（${delta >= 0 ? '+' : '−'}${man(Math.abs(delta))}/年）`;
      entries.push({ age: adultAge, text });
    }
  });

  for (const ev of events) {
    if (ev.age <= currentAge || ev.age > endAge) continue;
    entries.push({ age: ev.age, text: `${ev.label || 'イベント'} ${man(ev.amount)}円` });
  }

  // 年齢順に並べ、同じ年（＝同じ年齢）の項目は1行にまとめる
  entries.sort((a, b) => a.age - b.age);
  const rows = [];
  for (const e of entries) {
    const last = rows[rows.length - 1];
    if (last && last.age === e.age) last.items.push(e.text);
    else rows.push({ year: currentYear + (e.age - currentAge), age: e.age, items: [e.text] });
  }
  return rows;
}
