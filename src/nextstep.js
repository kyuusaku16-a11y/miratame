// 「あなたの次の一歩」: 入力値に応じた一時比較を作る純粋関数。
// patch は params にだけ適用し、フォーム値・保存 state は変更しない。

import { projectAssets, deriveKpis } from './calc.js';
import { lifeOf } from './advice.js';

const MIN_ANNUAL_EXPENSE = 600000;
const MAX_EXPECTED_RETURN = 8;

function applyPatch(params, patch) {
  return {
    ...params,
    ...patch,
    events: (patch.events ?? params.events ?? []).map((event) => ({ ...event })),
    children: (params.children ?? []).map((child) => ({ ...child })),
  };
}

export function buildTrialComparison(params, kpis, step) {
  if (!step) return null;
  const trialParams = applyPatch(params, step.patch);
  const baseSeries = projectAssets(params, params.expectedReturn / 100);
  const trialSeries = projectAssets(trialParams, trialParams.expectedReturn / 100);
  const trialKpis = deriveKpis(trialSeries, trialParams);
  const lifetimeDelta = lifeOf(trialKpis, trialParams.endAge) - lifeOf(kpis, params.endAge);
  const finalAssetsDelta = trialKpis.finalAssets - kpis.finalAssets;
  const changed = trialSeries.some((point, index) => point.assets !== baseSeries[index]?.assets);
  const useful = step.kind === 'comfort'
    ? trialKpis.survivesToEnd && changed
    : (lifetimeDelta > 0 || finalAssetsDelta > 0) && changed;

  return {
    step,
    trialParams,
    trialSeries,
    trialKpis,
    lifetimeDelta,
    finalAssetsDelta,
    valid: useful,
  };
}

function improvementCandidates(params) {
  const surplus = params.annualIncome - params.annualExpense;
  const candidates = [];

  if (params.annualExpense - 120000 >= MIN_ANNUAL_EXPENSE) {
    candidates.push({
      id: 'expense',
      category: 'expense',
      kind: 'improvement',
      label: '生活費を月1万円見直したら？',
      selectedLabel: '生活費を月1万円見直した場合を試しています',
      short: '生活費−1万円',
      reason: '毎年の支出が変わるため、将来まで反映される条件です。',
      actionText: '生活費を月1万円見直せるか確認する',
      patch: { annualExpense: params.annualExpense - 120000 },
    });
  }
  if ((params.monthlyInvest + 10000) * 12 <= Math.max(0, surplus)) {
    candidates.push({
      id: 'investment',
      category: 'investment',
      kind: 'improvement',
      label: '積立を月1万円増やしたら？',
      selectedLabel: '積立を月1万円増やした場合を試しています',
      short: '積立＋1万円',
      reason: '退職までの期間が長いほど、積立額の変更が将来に反映されやすい条件です。',
      actionText: '毎月の積立を1万円増やせるか確認する',
      patch: { monthlyInvest: params.monthlyInvest + 10000 },
    });
  }
  if (params.retireAge >= params.currentAge && params.retireAge + 1 <= params.endAge) {
    candidates.push({
      id: 'retirement',
      category: 'retirement',
      kind: 'improvement',
      label: '退職を1年遅らせたら？',
      selectedLabel: '退職を1年遅らせた場合を試しています',
      short: '退職＋1年',
      reason: '働く期間と積立期間を1年変えた場合の見通しを比較できます。',
      actionText: '退職時期を1年変えた場合を家族と考える',
      patch: { retireAge: params.retireAge + 1 },
    });
  }

  const events = (params.events ?? []).map((event) => ({ ...event }));
  let eventIndex = -1;
  let eventAmount = 0;
  events.forEach((event, index) => {
    if (event.amount > eventAmount && event.age > params.currentAge && event.age <= params.endAge) {
      eventIndex = index;
      eventAmount = event.amount;
    }
  });
  if (eventIndex >= 0 && eventAmount > 0) {
    events[eventIndex].amount = Math.max(0, eventAmount - Math.min(100000, eventAmount));
    candidates.push({
      id: 'leisure',
      category: 'leisure',
      kind: 'improvement',
      label: '臨時支出を少し見直したら？',
      selectedLabel: '臨時支出を少し見直した場合を試しています',
      short: '臨時支出を調整',
      reason: '登録している臨時支出を少し変えた場合の見通しを比較できます。',
      actionText: '臨時支出の内容をもう一度確認する',
      patch: { events },
    });
  }

  if (params.expectedReturn + 1 <= MAX_EXPECTED_RETURN) {
    candidates.push({
      id: 'return-rate',
      category: 'return-rate',
      kind: 'improvement',
      label: '想定利回りを変更したら？',
      selectedLabel: '想定利回りを変更した場合を試しています',
      short: '利回り＋1%',
      reason: '運用成果は保証されないため、最後の比較候補として表示しています。',
      actionText: '想定利回りを変えた場合の見通しも確認する',
      patch: { expectedReturn: params.expectedReturn + 1 },
    });
  }
  return candidates;
}

function comfortCandidates(params) {
  const candidates = [];
  if (params.retireAge - 1 > params.currentAge) {
    candidates.push({
      id: 'retirement-early',
      category: 'retirement',
      kind: 'comfort',
      label: '退職を1年早めた場合',
      selectedLabel: '退職を1年早めた場合を試しています',
      short: '退職−1年',
      reason: '働き方を変えた場合も、今のプランと並べて確認できます。',
      actionText: '退職時期を1年変えた場合を家族と考える',
      patch: { retireAge: params.retireAge - 1 },
    });
  }
  if (params.monthlyInvest >= 10000) {
    candidates.push({
      id: 'investment-less',
      category: 'investment',
      kind: 'comfort',
      label: '積立を月1万円減らした場合',
      selectedLabel: '積立を月1万円減らした場合を試しています',
      short: '積立−1万円',
      reason: '積立額を変えた場合の見通しを、選択肢として比較できます。',
      actionText: '毎月の積立を1万円減らす案を考える',
      patch: { monthlyInvest: params.monthlyInvest - 10000 },
    });
  }
  candidates.push({
    id: 'expense-more',
    category: 'expense',
    kind: 'comfort',
    label: '生活費を月1万円増やした場合',
    selectedLabel: '生活費を月1万円増やした場合を試しています',
    short: '生活費＋1万円',
    reason: '今の余裕を生活に使った場合の見通しを比較できます。',
    actionText: '今の余裕を使って、生活費を月1万円増やす案を考える',
    patch: { annualExpense: params.annualExpense + 120000 },
  });
  candidates.push({
    id: 'leisure-more',
    category: 'leisure',
    kind: 'comfort',
    label: '旅行や趣味の予算を増やした場合',
    selectedLabel: '旅行や趣味の予算を増やした場合を試しています',
    short: '楽しみ＋12万円',
    reason: '来年の楽しみ予算を増やした場合を、選択肢として比較できます。',
    actionText: '旅行や趣味に使う予算を増やす案を考える',
    patch: {
      events: [
        ...(params.events ?? []).map((event) => ({ ...event })),
        { age: params.currentAge + 1, amount: 120000, label: '旅行・趣味' },
      ],
    },
  });
  return candidates;
}

function withComparison(params, kpis, candidates) {
  return candidates
    .map((step) => ({ ...step, comparison: buildTrialComparison(params, kpis, step) }))
    .filter((step) => step.comparison?.valid)
    .map((step) => ({
      ...step,
      lifetimeDelta: step.comparison.lifetimeDelta,
      finalAssetsDelta: step.comparison.finalAssetsDelta,
    }));
}

export function buildNextSteps(params, kpis) {
  const comfort = kpis.survivesToEnd;
  const steps = withComparison(params, kpis, comfort ? comfortCandidates(params) : improvementCandidates(params));
  steps.sort((a, b) => {
    if (!comfort && a.category === 'return-rate' && b.category !== 'return-rate') return 1;
    if (!comfort && b.category === 'return-rate' && a.category !== 'return-rate') return -1;
    if (!comfort && b.lifetimeDelta !== a.lifetimeDelta) return b.lifetimeDelta - a.lifetimeDelta;
    return Math.abs(b.finalAssetsDelta) - Math.abs(a.finalAssetsDelta);
  });
  const selected = steps.slice(0, 3);
  if (!comfort && selected[0]) {
    selected[0] = { ...selected[0], reason: '今回の入力では、見通しへの変化が最も大きい条件です。' };
  }
  return selected;
}
