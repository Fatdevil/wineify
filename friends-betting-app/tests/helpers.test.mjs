import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatNumber,
  formatDateTime,
  formatNetUnits,
  formatOdds
} from '../src/helpers.js';

test('formatNumber formats integers with grouping', () => {
  assert.equal(formatNumber(1234567), '1,234,567');
});

test('formatNumber handles invalid input', () => {
  assert.equal(formatNumber(undefined), '0');
});

test('formatDateTime returns fallback for invalid date', () => {
  assert.equal(formatDateTime('invalid-date'), 'Unknown');
});

test('formatDateTime formats ISO strings', () => {
  const result = formatDateTime('2024-05-01T10:30:00Z');
  assert.match(result, /May/);
});

test('formatNetUnits prefixes positive values with plus sign', () => {
  assert.equal(formatNetUnits(1500), '+1,500 units');
});

test('formatNetUnits formats negative values', () => {
  assert.equal(formatNetUnits(-2500), '-2,500 units');
});

test('formatOdds formats decimal odds with suffix', () => {
  assert.equal(formatOdds(1.2345), '1.23x');
});
