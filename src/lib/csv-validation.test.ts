import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCellValue,
  normalizeHeader,
  normalizeRow,
  validateAnalyticsCSV,
  validatePostCSV,
} from './csv-validation.ts';

test('validatePostCSV accepts common X post export headers', () => {
  const headers = ['Tweet Text', 'Post Date', 'Impressions', 'Likes', 'Replies', 'Reposts'];
  assert.equal(validatePostCSV(headers), true);
});

test('validatePostCSV rejects files without post text column', () => {
  const headers = ['Date', 'Impressions', 'Engagements'];
  assert.equal(validatePostCSV(headers), false);
});

test('validateAnalyticsCSV accepts common X dashboard aliases', () => {
  const headers = ['Day', 'Follower Count', 'Impression', 'Total Engagements', 'Tweets'];
  assert.equal(validateAnalyticsCSV(headers), true);
});

test('validateAnalyticsCSV rejects files without date/day column', () => {
  const headers = ['Followers', 'Impressions', 'Engagement Rate'];
  assert.equal(validateAnalyticsCSV(headers), false);
});

test('normalization supports spaces and symbols in headers', () => {
  assert.equal(normalizeHeader(' Engagement Rate (%) '), 'engagement_rate');
  assert.equal(normalizeHeader('Tweet Text'), 'tweet_text');
});

test('row alias lookup resolves repost and engagement aliases', () => {
  const row = normalizeRow({
    'Tweet Text': 'Hello X',
    Reposts: '12',
    'Engagement Rate (%)': '4.3',
    Bookmark: '9',
  });

  assert.equal(getCellValue(row, 'content'), 'Hello X');
  assert.equal(getCellValue(row, 'retweets'), '12');
  assert.equal(getCellValue(row, 'engagement_rate'), '4.3');
  assert.equal(getCellValue(row, 'bookmarks'), '9');
});
