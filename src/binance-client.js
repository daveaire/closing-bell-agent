import crypto from 'node:crypto';

const HOST = 'https://web3.binance.com';
const BUILD_PREFIX = '/build';

export function encodeQuery(params = {}) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

export function buildSignature({ timestamp, method, pathWithQuery, body = '', secretKey }) {
  if (!pathWithQuery.startsWith('/build/')) {
    throw new Error('Signed request path must include the /build prefix');
  }
  const preHash = `${timestamp}${method.toUpperCase()}${pathWithQuery}${body}`;
  return crypto.createHmac('sha256', secretKey).update(preHash, 'utf8').digest('base64');
}

export class BinanceWeb3Client {
  constructor({ apiKey, secretKey, fetchImpl = fetch }) {
    if (!apiKey || !secretKey) throw new Error('OC_API_KEY and OC_SECRET_KEY are required');
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.fetchImpl = fetchImpl;
  }

  async request(method, path, { query, body } = {}) {
    if (!path.startsWith('/api/')) throw new Error('Pass Binance paths without /build');
    const queryString = encodeQuery(query);
    const relative = queryString ? `${path}?${queryString}` : path;
    const pathWithQuery = BUILD_PREFIX + relative;
    const payload = body === undefined ? '' : JSON.stringify(body);
    const timestamp = new Date().toISOString();
    const signature = buildSignature({
      timestamp, method, pathWithQuery, body: payload, secretKey: this.secretKey,
    });
    const response = await this.fetchImpl(HOST + pathWithQuery, {
      method,
      headers: {
        'X-OC-APIKEY': this.apiKey,
        'X-OC-TIMESTAMP': timestamp,
        'X-OC-SIGN': signature,
        'Content-Type': 'application/json',
      },
      body: payload || undefined,
      signal: AbortSignal.timeout(20_000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.code !== 0 || data.success === false) {
      throw new Error(`Binance Web3 API ${response.status}: ${data.msg || 'request failed'}`);
    }
    return data;
  }

  listRwaTokens(platformId, binanceChainId = '56') {
    return this.request('GET', '/api/v1/dex/market/rwa/tokens', {
      query: { binanceChainId, platformId },
    });
  }

  getRwaPrices(addresses) {
    return this.request('GET', '/api/v1/dex/market/rwa/price', {
      query: { binanceChainId: '56', tokenContractAddresses: addresses.join(',') },
    });
  }

  quote({ amount, fromTokenAddress, toTokenAddress, userWalletAddress }) {
    return this.request('GET', '/api/v1/dex/aggregator/quote', {
      query: {
        binanceChainId: '56', amount, fromTokenAddress, toTokenAddress, userWalletAddress,
      },
    });
  }

  buildSwap({ amount, fromTokenAddress, toTokenAddress, quoteId, userWalletAddress,
    slippagePercent = '0.5' }) {
    return this.request('GET', '/api/v1/dex/aggregator/swap', {
      query: {
        binanceChainId: '56', amount, fromTokenAddress, toTokenAddress,
        quoteId, userWalletAddress, slippagePercent,
      },
    });
  }

  simulate(evmTx) {
    return this.request('POST', '/api/v1/dex/pre-transaction/simulate', {
      body: { binanceChainId: '56', evmTx },
    });
  }
}
