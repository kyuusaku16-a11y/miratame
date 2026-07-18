// app/src/chart.js
// Chart.js rendering wrapper.
// Uses the browser global `Chart` (loaded from vendor/chart.umd.min.js in index.html — no import needed).

/* global Chart */

import { educationCostAt, projectExpenses } from './calc.js';

const CHART_COLORS = {
  text: '#6b514a',
  grid: '#efdcd0',
  gain: '#20a77c',
  loss: '#d97975',
  target: 'rgba(107, 81, 74, 0.45)',
  retirement: '#e9a66f',
  goal: '#f3cf7a',
  event: '#9fc8b3',
  expense: '#ef8b22',
};

// 目標達成バッジの喜ぶ2人（読み込み完了後の再描画から表示される）
const JOY_IMG = new Image();
JOY_IMG.src = 'assets/piyo-jump.png';

// 資産が尽きる年のしょんぼりぴよ（目標達成のジャンプと対。正直だけど深刻にしすぎない）
const SAD_IMG = new Image();
SAD_IMG.src = 'assets/piyo-sad.png';

/**
 * Format a yen value as 万 / 億 label (no trailing "円").
 * @param {number} yen
 * @returns {string}
 */
function fmtYen(yen) {
  if (yen >= 1_0000_0000) return `${(yen / 1_0000_0000).toFixed(1)}億`;
  if (yen >= 1_0000)      return `${Math.round(yen / 1_0000)}万`;
  return String(yen);
}

/**
 * Render (or re-render) the asset projection chart onto `canvas`.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{ age: number, assets: number }[]} mainSeries  — user's projected series
 * @param {{ targetAmount: number, retireAge: number, expectedReturn: number, events?: Array<{age: number, label?: string, amount: number}> }} params
 * @param {Chart|null|undefined} existingChart — previous Chart instance to destroy first
 * @param {{ label: string, series: { age: number, assets: number }[] }|null} [compare] — 保存プラン比較線
 * @param {{ series: { age: number, assets: number }[] }|null} [weak] — 低めケース（想定幅の下端）
 * @returns {Chart}
 */
export function renderChart(canvas, mainSeries, params, existingChart, compare = null, weak = null) {
  if (existingChart) existingChart.destroy();

  const labels  = mainSeries.map((p) => p.age);
  const mainData = mainSeries.map((p) => p.assets);
  const expenseData = projectExpenses(params, labels).map((p) => p.expenses);

  // 比較線は年齢で対応付ける（保存時と年齢設定が違ってもズレないように）
  const compareByAge = compare ? new Map(compare.series.map((p) => [p.age, p.assets])) : null;
  const compareData = compareByAge ? labels.map((age) => compareByAge.get(age) ?? null) : null;

  // --- highlighted points: retirement (orange) + life events (green) ---
  const retirementIdx = mainSeries.findIndex((p) => p.age === params.retireAge);
  const eventAges = new Set(
    (params.events ?? [])
      .filter((e) => e.age > mainSeries[0].age && e.age <= mainSeries[mainSeries.length - 1].age)
      .map((e) => e.age),
  );
  // --- goal-reached point: first year assets touch the target ---
  const goalIdx = mainSeries.findIndex((p) => p.assets >= params.targetAmount);

  const pointRadius = mainSeries.map((p, i) =>
    i === retirementIdx ? 7 : i === goalIdx ? 6 : eventAges.has(p.age) ? 5 : 0);
  const pointBg = mainSeries.map((p, i) =>
    i === retirementIdx ? CHART_COLORS.retirement : i === goalIdx ? CHART_COLORS.goal : eventAges.has(p.age) ? CHART_COLORS.event : 'transparent');
  const pointBorder = mainSeries.map((p, i) =>
    i === retirementIdx || i === goalIdx || eventAges.has(p.age) ? '#fff' : 'transparent');

  // --- target horizontal line (constant across all labels) ---
  const targetData = mainSeries.map(() => params.targetAmount);

  // 目標に初めて届く年の上に、喜ぶ2人と「🎉 目標達成！」を描くインラインプラグイン
  const goalBadge = {
    id: 'goalBadge',
    afterDatasetsDraw(chart) {
      if (goalIdx < 0) return;
      const pt = chart.getDatasetMeta(0).data[goalIdx];
      if (!pt) return;
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.font = 'bold 13px "Zen Maru Gothic", "Hiragino Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = CHART_COLORS.text;
      const x = Math.min(Math.max(pt.x, chartArea.left + 60), chartArea.right - 60);
      // スマホの小さいグラフではペア画像は線の邪魔になるので描かない（🎉テキストのみ）
      const showPair = chart.width >= 520 && JOY_IMG.complete && JOY_IMG.naturalWidth > 0;
      // 達成点は定義上、目標線と同じ高さ。線の交差点から一段逃がして混雑を避ける
      const y = Math.max(pt.y - 34, chartArea.top + (showPair ? 54 : 18));
      if (showPair) {
        // ぴよため（正方形）は控えめに: グラフは信頼感が主役の場所
        ctx.drawImage(JOY_IMG, x - 20, y - 54, 40, 40);
      }
      ctx.fillText('🎉 目標達成！', x, y);
      ctx.restore();
    },
  };

  // 資産が最初にゼロへ落ちる年に、しょんぼりぴよを置く（スマホの小さいグラフでは省略）
  const zeroIdx = mainSeries.findIndex((p, i) => i > 0 && p.assets <= 0 && mainSeries[i - 1].assets > 0);
  const depletionBadge = {
    id: 'depletionBadge',
    afterDatasetsDraw(chart) {
      if (zeroIdx < 0) return;
      if (chart.width < 520 || !SAD_IMG.complete || SAD_IMG.naturalWidth === 0) return;
      const pt = chart.getDatasetMeta(0).data[zeroIdx];
      if (!pt) return;
      const { ctx, chartArea } = chart;
      const x = Math.min(Math.max(pt.x, chartArea.left + 20), chartArea.right - 20);
      const y = Math.max(pt.y - 36, chartArea.top + 2);
      ctx.save();
      ctx.drawImage(SAD_IMG, x - 16, y, 32, 32);
      ctx.restore();
    },
  };

  // 支出線の終端に金額を直接描く（右軸との往復なしで支出額が読めるように）
  const expenseLabel = {
    id: 'expenseLabel',
    afterDatasetsDraw(chart) {
      const meta = chart.getDatasetMeta(1);
      const pt = meta.data[meta.data.length - 1];
      if (!pt) return;
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.font = 'bold 12px "Zen Maru Gothic", "Hiragino Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = CHART_COLORS.expense;
      const label = `支出 ${fmtYen(expenseData[expenseData.length - 1])}円`;
      ctx.fillText(label, Math.min(pt.x, chartArea.right - 4), Math.max(pt.y - 10, chartArea.top + 12));
      ctx.restore();
    },
  };

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        // 1. Main line — thick, segment-colored green (gain) / red (loss)
        {
          label:                '資産残高',
          data:                 mainData,
          yAxisID:              'yAssets',
          order:                2,
          borderColor:          CHART_COLORS.gain,
          borderWidth:          3.5,
          // 線の下をふんわり塗って「資産の山」に見せる（ベリー色→透明）
          fill:                 'origin',
          backgroundColor: (ctx) => {
            const { chartArea, ctx: c } = ctx.chart;
            // テーマ（ベリー/フォレスト）に追従する塗り色
            const rgb =
              getComputedStyle(document.documentElement).getPropertyValue('--chart-fill-rgb').trim() ||
              '232, 160, 170';
            if (!chartArea) return `rgba(${rgb}, 0.12)`;
            const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, `rgba(${rgb}, 0.30)`);
            g.addColorStop(1, `rgba(${rgb}, 0.02)`);
            return g;
          },
          pointRadius,
          pointBackgroundColor: pointBg,
          pointBorderColor:     pointBorder,
          pointBorderWidth:     2,
          pointHoverRadius:     7,
          tension:              0.3,
          segment: {
            borderColor: (ctx) =>
              ctx.p1.parsed.y >= ctx.p0.parsed.y ? CHART_COLORS.gain : CHART_COLORS.loss,
          },
        },
        // 2. 年間支出 — 資産と桁が違うため右軸へ分ける
        {
          label:           '年間支出',
          data:            expenseData,
          yAxisID:         'yExpense',
          order:           0,
          borderColor:     CHART_COLORS.expense,
          backgroundColor: CHART_COLORS.expense,
          borderWidth:     3,
          borderDash:      [5, 4],
          pointRadius:     0,
          pointHoverRadius: 5,
          pointHitRadius:  12,
          fill:            false,
          tension:         0,
        },
        // 3. Target dashed line
        {
          label:       `目標 ${fmtYen(params.targetAmount)}円`,
          data:        targetData,
          yAxisID:     'yAssets',
          order:       1,
          borderColor: CHART_COLORS.target,
          borderWidth: 1.5,
          borderDash:  [8, 4],
          pointRadius: 0,
          fill:        false,
          tension:     0,
        },
        // 4. 低めケースとの間の「想定の幅」（あるときだけ）。
        //    境界線と凡例は出さず、未来を1本線で断定しないための薄い帯だけ残す。
        ...(weak
          ? [
              {
                label:           '想定の幅',
                data:            weak.series.map((p) => p.assets),
                yAxisID:         'yAssets',
                order:           3,
                borderColor:     'transparent',
                borderWidth:     0,
                pointRadius:     0,
                fill:            0,
                backgroundColor: 'rgba(150, 130, 120, 0.12)',
                tension:         0.3,
              },
            ]
          : []),
        // 5. 保存プランの比較線（あるときだけ）
        ...(compareData
          ? [
              {
                label:       compare.label,
                data:        compareData,
                yAxisID:     'yAssets',
                order:       0,
                borderColor: 'rgba(116, 91, 132, 0.72)',
                borderWidth: 2,
                borderDash:  [8, 5],
                pointRadius: 0,
                fill:        false,
                tension:     0.3,
              },
            ]
          : []),
      ],
    },
    plugins: [goalBadge, depletionBadge, expenseLabel],
    options: {
      animation: { duration: 200 },
      responsive:  true,
      maintainAspectRatio: false, // 高さは .chart-box のCSSで確保（スマホで潰れないように）
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            // 線種スワッチ: 点線（支出・目標）と実線（資産）の区別が凡例だけで付く
            usePointStyle: true,
            pointStyle: 'line',
            pointStyleWidth: 28,
            // usePointStyle の既定スワッチは「先頭ポイントの点スタイル」を拾うため、
            // 資産線（通常年は透明ポイント）が消える。線の色・太さ・点線を明示的に引き継ぐ。
            generateLabels: (chart) => {
              const items = Chart.defaults.plugins.legend.labels.generateLabels(chart);
              items.forEach((item) => {
                const dataset = chart.data.datasets[item.datasetIndex];
                item.strokeStyle = dataset.borderColor;
                item.lineWidth = dataset.borderWidth;
                item.lineDash = dataset.borderDash || [];
              });
              return items;
            },
            color: CHART_COLORS.text,
            font: { size: 12 },
            filter: (item) => item.text !== '想定の幅',
            sort: (a, b) => a.datasetIndex - b.datasetIndex,
          },
        },
        tooltip: {
          // 同じ年齢の資産残高と年間支出を、色付きで別々の数値として見せる。
          // 目標・弱気ケース・比較線はツールチップへ混ぜず、2つの主役を読みやすく保つ。
          displayColors: true,
          filter: (item) => item.datasetIndex === 0 || item.datasetIndex === 1,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 12 },
          callbacks: {
            title: (items) => items.length ? `${items[0].label}歳` : '',
            label: (ctx) => `${ctx.dataset.label}　${fmtYen(ctx.parsed.y)}円`,
            afterBody: (items) => {
              if (!items.length) return [];
              const age = Number(items[0].label);
              const startAge = mainSeries[0].age;
              const notes = (params.events ?? [])
                .filter((e) => e.age === age && e.age > startAge)
                .map((e) => `▼ ${e.label || 'イベント'} −${fmtYen(e.amount)}円`);
              if (age > startAge) {
                (params.children ?? []).forEach((c, i) => {
                  const childAge = c.age + (age - startAge);
                  const delta = educationCostAt(childAge, c.course) - educationCostAt(c.age, c.course);
                  if (delta !== 0) {
                    const name = c.name || `子ども${i + 1}`;
                    const who = childAge >= 22 ? `${name}: 独立後` : `${name}: ${childAge}歳`;
                    notes.push(`▼ 教育費 ${delta > 0 ? '+' : '−'}${fmtYen(Math.abs(delta))}円/年（${who}）`);
                  }
                });
              }
              return notes;
            },
          },
        },
      },
      scales: {
        x: {
          // スマホは軸タイトルを省いて描画領域を広げる
          title:  { display: !matchMedia('(max-width: 940px)').matches, text: '年齢', color: CHART_COLORS.text },
          ticks:  { maxTicksLimit: 12, color: CHART_COLORS.text },
          grid:   { color: CHART_COLORS.grid },
        },
        yAssets: {
          position: 'left',
          title: { display: !matchMedia('(max-width: 940px)').matches, text: '資産額', color: CHART_COLORS.text },
          grid:  { color: CHART_COLORS.grid },
          ticks: {
            color: CHART_COLORS.text,
            callback: (value) => fmtYen(value),
          },
        },
        yExpense: {
          position: 'right',
          beginAtZero: true,
          // 支出線はグラフ下1/3の帯に収め、上側の資産線と交差しないようにする
          // （右軸の上限を支出最大値の3倍に。教育費などの山も下部で読める）。
          suggestedMax: Math.max(...expenseData, 1) * 3,
          title: { display: !matchMedia('(max-width: 940px)').matches, text: '年間支出', color: CHART_COLORS.expense },
          grid: { drawOnChartArea: false },
          ticks: {
            maxTicksLimit: 6,
            color: CHART_COLORS.expense,
            callback: (value) => fmtYen(value),
          },
        },
      },
    },
  });
}
