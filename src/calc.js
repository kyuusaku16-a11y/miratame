// 子ども1人あたりの標準教育費（円/年）。高校まで公立・大学は私立文系・自宅通学の目安。
// 進路コースの切替は将来対応（指示だし.md 2026-07-05）。
const EDUCATION_BANDS = [
  [0, 2, 100000],
  [3, 5, 300000],
  [6, 11, 400000],
  [12, 14, 600000],
  [15, 17, 700000],
  [18, 18, 1800000],
  [19, 21, 1300000],
];

// childAge に応じた年間教育費。範囲外（負・22歳以上）は0。
export function educationCostAt(childAge) {
  for (const [lo, hi, cost] of EDUCATION_BANDS) {
    if (childAge >= lo && childAge <= hi) return cost;
  }
  return 0;
}

// 2バケツ（現金/投資）＋収入モデルで currentAge〜endAge を1年刻みで計算する純粋関数。
// params: { currentAge, totalAsset, investedAsset, monthlyInvest, annualIncome,
//           annualExpense, retireAge, pensionAnnual, pensionStartAge,
//           retirementBonus, retiredExpenseRatio, endAge, events?: [{age, amount, label}], children?: [{age}] }
// rate: 年利（小数）
// 返り値: [{ age, cash, invested, assets }]（各整数、assets = max(0, cash+invested)）
export function projectAssets(params, rate) {
  const {
    currentAge, totalAsset, investedAsset, monthlyInvest, annualIncome,
    annualExpense, retireAge, pensionAnnual, pensionStartAge,
    retirementBonus, retiredExpenseRatio, endAge, events = [], children = [],
  } = params;

  const annualInvest = monthlyInvest * 12;
  const retiredExpense = annualExpense * retiredExpenseRatio;

  let invested = investedAsset;
  let cash = totalAsset - investedAsset;
  const series = [];

  // 教育費の差分方式: 現在年齢分は年間支出に含まれている前提で、将来との差分だけ乗せる
  const currentEduCosts = children.map((c) => educationCostAt(c.age));

  // ライフイベント: 年齢→一時支出合計（現在年齢以前・終了年齢超は無視）
  const eventCost = new Map();
  for (const ev of events) {
    if (ev.age > currentAge && ev.age <= endAge) {
      eventCost.set(ev.age, (eventCost.get(ev.age) || 0) + ev.amount);
    }
  }

  for (let age = currentAge; age <= endAge; age++) {
    const assets = Math.max(0, cash + invested);
    series.push({
      age,
      cash: Math.round(cash),
      invested: Math.round(invested),
      assets: Math.round(assets),
    });

    if (age === endAge) break;

    let eduDelta = 0;
    for (let ci = 0; ci < children.length; ci++) {
      eduDelta += educationCostAt(children[ci].age + (age - currentAge)) - currentEduCosts[ci];
    }

    if (age < retireAge) {
      // 現役: 投資に利回り+積立、現金に収支余剰（教育費差分を控除）
      invested = invested * (1 + rate) + annualInvest;
      cash = cash + (annualIncome - annualExpense - annualInvest) - eduDelta;
    } else {
      // 退職後: 投資は利回りのみ、現金は年金-老後支出（教育費差分は70%換算の対象外）
      invested = invested * (1 + rate);
      const pension = age >= pensionStartAge ? pensionAnnual : 0;
      cash = cash + (pension - retiredExpense) - eduDelta;
    }

    // 退職年齢の年に退職金を現金へ一括加算
    if (age + 1 === retireAge) cash += retirementBonus;

    // ライフイベントの一時支出（該当年齢のスナップショットに反映）
    if (eventCost.has(age + 1)) cash -= eventCost.get(age + 1);

    // 現金不足は投資から現金優先で取り崩す（現役・退職後とも。
    // 使った分に利回りが付き続ける過大評価を防ぐ — 2026-07-04修正）
    if (cash < 0) {
      invested += cash; // cash は負
      cash = 0;
      if (invested < 0) invested = 0;
    }
  }

  return series;
}

// series: projectAssets の結果, params: 入力
export function deriveKpis(series, params) {
  const currentAssets = series[0].assets;
  const finalAssets = series[series.length - 1].assets;

  let targetAge = null;
  for (const p of series) {
    if (p.assets >= params.targetAmount) {
      targetAge = p.age;
      break;
    }
  }
  const yearsToTarget = targetAge === null ? null : targetAge - params.currentAge;

  const survivesToEnd = finalAssets > 0;
  let lifetimeAge = null;
  if (!survivesToEnd) {
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].assets > 0) {
        lifetimeAge = series[i].age;
        break;
      }
    }
  }

  return { currentAssets, finalAssets, targetAge, yearsToTarget, lifetimeAge, survivesToEnd };
}
