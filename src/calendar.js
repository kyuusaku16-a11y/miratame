// 「毎月の記録日」をスマホのカレンダーに登録するための ICS を作る。
// プッシュ通知が使えない静的サイトの、リマインダー代わり。
// 時刻はローカル時間のまま（TZID なしの floating time で各端末の朝9時に鳴る）。

const pad = (n) => String(n).padStart(2, '0');

export function buildRecordIcs(now = new Date(), url = 'https://kyuusaku16-a11y.github.io/money-vision/') {
  // 初回は「次の1日」（今日が1日ならきょうから）
  const first =
    now.getDate() === 1 ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const dtstart = `${first.getFullYear()}${pad(first.getMonth() + 1)}${pad(first.getDate())}T090000`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//money-vision//record-day//JP',
    'BEGIN:VEVENT',
    'UID:monthly-record@money-vision',
    `DTSTART:${dtstart}`,
    'RRULE:FREQ=MONTHLY;BYMONTHDAY=1',
    'SUMMARY:🌰 マネービジョンで今月の資産を記録',
    `DESCRIPTION:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
