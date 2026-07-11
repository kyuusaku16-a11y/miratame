// ライフプラン表（A4・1枚）の年表データを組み立てる純粋関数。
// グラフを「紙の上で読める年表」に翻訳する: 5年刻みのグリッド＋節目の年（退職・年金・
// 教育費ピーク・ライフイベント・目標達成・資産が尽きる年）。§1: 尽きる年も正直に、でも責めない。

import { findEducationPeak } from './advice.js';
import { fmtMoney } from './format.js';

const MAX_ROWS = 24; // A4縦に無理なく収まる行数

// 印刷用の資産見通しグラフ。Chart.jsを読み込まず、紙でくっきり出る軽量SVGを自前で組む。
// 色はメインのグラフと同じ（緑=資産線・オレンジ点線=目標・オレンジ点=退職・金=目標到達・赤=尽きる年）
export function buildLifeplanChartSvg(series, params, kpis, { width = 660, height = 160 } = {}) {
  const M = { top: 10, right: 14, bottom: 22, left: 60 };
  const plotW = width - M.left - M.right;
  const plotH = height - M.top - M.bottom;
  const minAge = series[0].age;
  const maxAge = series[series.length - 1].age;
  const maxY = Math.max(...series.map((p) => p.assets), params.targetAmount || 0, 1) * 1.06;

  const X = (age) => M.left + ((age - minAge) / Math.max(1, maxAge - minAge)) * plotW;
  const Y = (v) => M.top + (1 - v / maxY) * plotH;
  const r1 = (n) => Math.round(n * 10) / 10;
  const fmtAxis = (yen) => {
    if (yen >= 1_0000_0000) return `${(yen / 1_0000_0000).toFixed(1)}億`;
    return `${Math.round(yen / 1_0000).toLocaleString()}万`;
  };

  const linePts = series.map((p) => `${r1(X(p.age))},${r1(Y(p.assets))}`);
  const line = `M${linePts.join(' L')}`;
  const area = `${line} L${r1(X(maxAge))},${r1(Y(0))} L${r1(X(minAge))},${r1(Y(0))} Z`;

  const parts = [];
  parts.push(
    `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="資産の見通しグラフ" font-family="'Zen Maru Gothic','Hiragino Maru Gothic ProN',sans-serif">`
  );

  // 横グリッドとY軸ラベル（0・半分・最大）
  for (const f of [0, 0.5, 1]) {
    const y = r1(Y(maxY * f));
    parts.push(`<line x1="${M.left}" y1="${y}" x2="${width - M.right}" y2="${y}" stroke="#eadbca" stroke-width="1"/>`);
    parts.push(`<text x="${M.left - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="#a08d82">${f === 0 ? '0' : fmtAxis(maxY * f)}</text>`);
  }
  // X軸ラベル（10歳刻み）
  for (let age = Math.ceil(minAge / 10) * 10; age <= maxAge; age += 10) {
    parts.push(`<text x="${r1(X(age))}" y="${height - 8}" text-anchor="middle" font-size="9" fill="#a08d82">${age}歳</text>`);
  }

  // 目標ライン（点線）
  if (params.targetAmount > 0) {
    const ty = r1(Y(params.targetAmount));
    parts.push(`<line x1="${M.left}" y1="${ty}" x2="${width - M.right}" y2="${ty}" stroke="#e9a66f" stroke-width="1.4" stroke-dasharray="5 4"/>`);
    parts.push(`<text x="${width - M.right}" y="${ty - 4}" text-anchor="end" font-size="9" fill="#c07f43">目標 ${fmtAxis(params.targetAmount)}</text>`);
  }

  // 資産の山（塗り）と線
  parts.push(`<path d="${area}" fill="rgba(32,167,124,0.13)"/>`);
  parts.push(`<path d="${line}" fill="none" stroke="#20a77c" stroke-width="2.4" stroke-linejoin="round"/>`);

  // 節目の点: 退職（オレンジ）・目標到達（金）・尽きる年（赤）
  const dot = (age, v, color) =>
    parts.push(`<circle cx="${r1(X(age))}" cy="${r1(Y(v))}" r="4" fill="${color}" stroke="#fff" stroke-width="1.4"/>`);
  const assetAt = (age) => series.find((p) => p.age === age)?.assets;
  if (params.retireAge > minAge && params.retireAge <= maxAge && assetAt(params.retireAge) != null) {
    dot(params.retireAge, assetAt(params.retireAge), '#e9a66f');
  }
  if (kpis.targetAge !== null && assetAt(kpis.targetAge) != null) {
    dot(kpis.targetAge, assetAt(kpis.targetAge), '#f3cf7a');
  }
  if (!kpis.survivesToEnd && kpis.lifetimeAge !== null) {
    dot(Math.min(kpis.lifetimeAge + 1, maxAge), 0, '#d97975');
  }

  parts.push('</svg>');
  return parts.join('');
}

export function buildLifeplanRows(params, series, kpis, { baseYear = null } = {}) {
  const notesByAge = new Map();
  const note = (age, text) => {
    if (age == null || age < params.currentAge || age > params.endAge) return;
    if (!notesByAge.has(age)) notesByAge.set(age, []);
    notesByAge.get(age).push(text);
  };

  // 節目を集める（時系列に並んだとき読みやすい言い方で）
  if (params.retireAge > params.currentAge) note(params.retireAge, '退職の予定（収入が変わる）');
  if (params.pensionStartAge > params.currentAge) note(params.pensionStartAge, '年金の受け取り開始');
  for (const e of params.events ?? []) {
    note(e.age, `${e.label || 'ライフイベント'}（約${fmtMoney(e.amount)}）`);
  }
  const eduPeak = findEducationPeak(params);
  if (eduPeak) note(eduPeak.age, `教育費のピーク（今より年約+${fmtMoney(eduPeak.amount)}）`);
  if (kpis.targetAge !== null && kpis.targetAge > params.currentAge) {
    note(kpis.targetAge, `🎉 目標の${fmtMoney(params.targetAmount)}に到達する見込み`);
  }
  if (!kpis.survivesToEnd && kpis.lifetimeAge !== null) {
    note(kpis.lifetimeAge, 'ここで資産が尽きる計算（前提を変えると動きます）');
  }

  // 行にする年齢: 現在・終了・5年刻み・節目。多すぎる場合はグリッドを10年刻みに間引く
  const buildAges = (step) => {
    const ages = new Set([params.currentAge, params.endAge, ...notesByAge.keys()]);
    for (let age = Math.ceil(params.currentAge / step) * step; age < params.endAge; age += step) {
      if (age > params.currentAge) ages.add(age);
    }
    return [...ages].sort((a, b) => a - b);
  };
  let ages = buildAges(5);
  if (ages.length > MAX_ROWS) ages = buildAges(10);

  const assetsByAge = new Map(series.map((p) => [p.age, p.assets]));
  return ages.map((age) => ({
    age,
    year: baseYear === null ? null : baseYear + (age - params.currentAge),
    assets: assetsByAge.get(age) ?? null,
    notes: notesByAge.get(age) ?? [],
  }));
}
