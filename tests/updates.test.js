import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UPDATES, NOTE_ARTICLES } from '../src/updates.js';

test('UPDATES: 日付形式が正しく・新しい順に並んでいる', () => {
  assert.ok(UPDATES.length >= 1);
  for (const u of UPDATES) {
    assert.match(u.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(u.text.length > 0);
  }
  const sorted = [...UPDATES].sort((a, b) => (a.date < b.date ? 1 : -1));
  assert.deepEqual(UPDATES.map((u) => u.date), sorted.map((u) => u.date));
});

test('NOTE_ARTICLES: 追加されたら title と url を持つ', () => {
  for (const a of NOTE_ARTICLES) {
    assert.ok(a.title);
    assert.ok(a.url.startsWith('https://'));
  }
});
