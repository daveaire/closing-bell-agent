import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildSignature, encodeQuery } from '../src/binance-client.js';

test('signature includes the exact /build path and raw encoded query', () => {
  const timestamp = '2026-05-11T10:08:57.715Z';
  const pathWithQuery = '/build/api/v1/dex/market/price?chainId=1&symbol=ETH%20USDT';
  const expected = crypto.createHmac('sha256', 'secret')
    .update(`${timestamp}GET${pathWithQuery}`, 'utf8').digest('base64');
  assert.equal(buildSignature({ timestamp, method: 'GET', pathWithQuery, secretKey: 'secret' }), expected);
  assert.throws(() => buildSignature({ timestamp, method: 'GET', pathWithQuery: '/api/v1/x', secretKey: 'secret' }), /build/);
});

test('query encoding uses percent-encoded spaces, not plus', () => {
  assert.equal(encodeQuery({ symbol: 'ETH USDT', chain: 56 }), 'symbol=ETH%20USDT&chain=56');
});
