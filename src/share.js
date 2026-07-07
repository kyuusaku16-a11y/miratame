// 家計タイプ診断とシェアカード（1200×630）の生成。
// 方針: 金額は一切載せず「タイプ」をシェアする（資産額を晒さない＝安心して共有できる）。
// 全タイプ褒める設計（§1: 責めない）。受け取った人が「私は何型？」と試したくなる構造。

// 6つの家計タイプ（すべて前向きな2行コピー）
export const HOUSEHOLD_TYPES = {
  bird: {
    id: 'bird',
    name: 'はばたき小鳥型',
    img: 'assets/bird-blue.png',
    lines: ['育てた資産と身軽さで、自由に生きるタイプ。', '時間という一番の贅沢を手にしています。'],
  },
  rabbit: {
    id: 'rabbit',
    name: 'まっしぐらうさぎ型',
    img: 'assets/rabbit-joy.png',
    lines: ['目標までまっしぐらのスピード派。', 'この勢い、まわりにも元気をくれます。'],
  },
  family: {
    id: 'family',
    name: '家族でバンザイ型',
    img: 'assets/pair-banzai.png',
    lines: ['家族の未来まで見すえて計画するあったか派。', '教育費も見える化して、みんなで前へ。'],
  },
  grower: {
    id: 'grower',
    name: 'じっくり育てるくま型',
    img: 'assets/bear-watering.png',
    lines: ['コツコツ投資で未来を育てる堅実派。', '複利の力を信じて水をやり続けるタイプ。'],
  },
  steady: {
    id: 'steady',
    name: 'どっしりくま型',
    img: 'assets/bear-thumbs.png',
    lines: ['あわてず騒がず、長く持たせる安定派。', 'その落ち着き、老後まで頼りになります。'],
  },
  sprout: {
    id: 'sprout',
    name: 'これから芽ぐく型',
    img: 'assets/sprout.png',
    lines: ['スタート地点に立った、のびしろ満点タイプ。', '小さな一歩が、これから大きく育ちます。'],
  },
};

// 入力とKPIから家計タイプを診断する純粋関数
export function diagnoseType(kpis, params) {
  if (params.annualIncome === 0) return HOUSEHOLD_TYPES.bird;
  if (kpis.targetAge !== null && kpis.targetAge - params.currentAge <= 15) return HOUSEHOLD_TYPES.rabbit;
  if ((params.children ?? []).length > 0) return HOUSEHOLD_TYPES.family;

  const surplus = params.annualIncome - params.annualExpense;
  const savingsRate = params.annualIncome > 0 ? surplus / params.annualIncome : 0;
  const investShare = surplus > 0 ? (params.monthlyInvest * 12) / surplus : 0;
  if (savingsRate >= 0.25 && investShare >= 0.5) return HOUSEHOLD_TYPES.grower;

  if (kpis.survivesToEnd) return HOUSEHOLD_TYPES.steady;
  return HOUSEHOLD_TYPES.sprout;
}

// シェア文（金額なし・タイプ名入り）
export function buildShareText(kpis, params) {
  const type = diagnoseType(kpis, params);
  return `私の家計タイプは【${type.name}】でした🌱 あなたはどのタイプ？ #マネービジョン #家計タイプ診断`;
}

const loadImg = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const FONT = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif';

// 家計タイプの診断カード（1200×630）を描いた canvas を返す
export async function renderShareCard(kpis, params) {
  const type = diagnoseType(kpis, params);
  const W = 1200;
  const H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  await document.fonts.ready;

  // 背景
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#fbe6e4');
  bg.addColorStop(1, '#fdf3f1');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 白パネル
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(56, 56, W - 112, H - 168, 32);
  ctx.fill();
  ctx.strokeStyle = '#f5c7d2';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 左カラム: テキスト（キャラの場所を右に確保）
  const textCenterX = 430;
  ctx.textAlign = 'center';

  ctx.fillStyle = '#c96079';
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText('わたしの家計タイプ', textCenterX, 160);

  ctx.fillStyle = '#5c4a44';
  ctx.font = `700 72px ${FONT}`;
  ctx.fillText(`【${type.name}】`, textCenterX, 268);

  ctx.fillStyle = '#8a6f66';
  ctx.font = `500 30px ${FONT}`;
  ctx.fillText(type.lines[0], textCenterX, 340);
  ctx.fillText(type.lines[1], textCenterX, 388);

  ctx.fillStyle = '#c96079';
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText('あなたはどのタイプ？', textCenterX, 470);

  // 右カラム: タイプのキャラを大きく
  try {
    const img = await loadImg(type.img);
    const box = { x: 800, y: 130, w: 330, h: 330 };
    const scale = Math.min(box.w / img.width, box.h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
  } catch {
    /* 画像なしでもテキストで成立 */
  }

  // 小花の飾り
  try {
    const flowers = await loadImg('assets/flowers.png');
    ctx.drawImage(flowers, 80, H - 220, 190, 94);
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
