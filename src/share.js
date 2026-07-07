// 結果シェアカード（1200×630）とシェア文の生成。
// 方針: 個人の入力額（資産・収入など）は一切載せず、資産寿命と目標達成年だけの
// 「シェアして嬉しい情報」に絞る（安心して共有できる＝広まりやすい）。

// シェア文（金額は含めない。不利な数字も晒さない）
export function buildShareText(kpis, params) {
  if (kpis.survivesToEnd) {
    return `私の資産、${params.endAge}歳まで持つ計算でした🌱 資産寿命を見える化できる無料シミュレーター #マネービジョン`;
  }
  return '未来の資産をグラフで見える化🌱 資産寿命と「のばし方」まで教えてくれる無料シミュレーター #マネービジョン';
}

const loadImg = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const FONT = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif';

// 1200×630 のシェアカードを描いた canvas を返す
export async function renderShareCard(kpis, params) {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  await document.fonts.ready;

  // 背景（ベリーテーマのグラデーション）
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#fbe6e4');
  bg.addColorStop(1, '#fdf3f1');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 白パネル
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(60, 70, W - 120, H - 190, 32);
  ctx.fill();
  ctx.strokeStyle = '#f5c7d2';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';

  // 見出し
  ctx.fillStyle = '#c96079';
  ctx.font = `700 42px ${FONT}`;
  ctx.fillText('わたしの資産寿命', W / 2, 175);

  // メイン数値
  ctx.fillStyle = '#5c4a44';
  ctx.font = `700 104px ${FONT}`;
  const main = kpis.survivesToEnd
    ? `${params.endAge}歳まで安心圏`
    : kpis.lifetimeAge !== null
      ? `約${kpis.lifetimeAge}歳`
      : 'これから育てる';
  ctx.fillText(main, W / 2, 315);

  // サブ（目標達成の見込み）
  if (kpis.targetAge !== null) {
    ctx.fillStyle = '#c96079';
    ctx.font = `700 38px ${FONT}`;
    ctx.fillText(`🎉 目標達成は ${kpis.targetAge}歳 の見込み`, W / 2, 395);
  }

  // キャラと花（読めなくてもテキストだけで成立させる）
  try {
    const [pair, flowers] = await Promise.all([
      loadImg('assets/pair-joy.png'),
      loadImg('assets/flowers.png'),
    ]);
    ctx.drawImage(pair, W - 350, H - 255, 280, 156);
    ctx.drawImage(flowers, 78, H - 230, 200, 99);
  } catch {
    /* no-op */
  }

  // フッター
  ctx.fillStyle = '#a2887f';
  ctx.font = `500 28px ${FONT}`;
  ctx.fillText('マネービジョン — 未来の資産を、見える化する。', W / 2, H - 62);
  ctx.font = `500 24px ${FONT}`;
  ctx.fillText('kyuusaku16-a11y.github.io/money-vision', W / 2, H - 26);

  return canvas;
}
