import { fmtMoney } from './format.js';

export function hasOutlookGoal(params) {
  return params.targetAmount > 0;
}

export function buildLifetimeOutlook(kpis, params) {
  if (kpis.survivesToEnd) {
    return {
      value: `${params.endAge}歳以上`,
      description: '計算期間の最後まで資産が続く見通しです。',
    };
  }

  const lifetimeAge = kpis.lifetimeAge ?? params.currentAge;
  const years = Math.max(0, lifetimeAge - params.currentAge);
  return {
    value: years === 0 ? '1年未満' : `約${years}年`,
    description: `${lifetimeAge}歳まで資産を取り崩さずに生活できる見通しです。`,
  };
}

export function buildFinalAssetDescription(kpis, params) {
  if (!hasOutlookGoal(params)) return `${params.endAge}歳時点で見込まれる資産額です。`;
  const difference = params.targetAmount - kpis.finalAssets;
  if (difference > 0) {
    return `目標金額${fmtMoney(params.targetAmount)}に対してあと${fmtMoney(difference)}です。`;
  }
  if (difference === 0) return `目標金額${fmtMoney(params.targetAmount)}に到達する見通しです。`;
  // 目標額の再掲はしない（2行のline-clampに収め、超過額だけを主役にする）
  return `目標金額を${fmtMoney(Math.abs(difference))}上回る見通しです。`;
}
