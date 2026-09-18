# Developer Experience Report evidence worksheet

The official form says perfunctory or AI-generated reports are not accepted. This file is an evidence map, not text to paste unchanged. The project owner should verify every observation and write the final responses in their own words.

## Owner input still required

- Public repository URL: `[publish after explicit approval]`
- Web3 experience: `[less than 6 months / 6–12 months / 1–3 years / more than 3 years]`
- Time from docs to first successful call: `[owner estimate]`
- Time to create a working API key: `[owner estimate]`
- Onboarding rating, 1–5: `[owner rating]`
- Documentation rating, 1–5: `[owner rating]`
- API reliability rating, 1–5: `[owner rating]`
- Intention to continue after the hackathon: `[owner choice and reason]`

## 1. Submission details

- Project: Closing Bell Agent
- Contact: `airebamenosomurie@gmail.com`
- Modules actually called: RWA Data API, Trading API, Transaction API
- Team size: Solo
- Prior Binance Web3 API use: No, first use for this project
- AI stack: none of Agentic Wallet, Wallet Skills, Wallet Skills CLI, or BNB Agent Studio

## 2. Onboarding evidence

- Exact base URL: `https://web3.binance.com/build`
- Signed paths had to include `/build`, for example `/build/api/v1/dex/market/rwa/tokens`.
- The client had to construct the encoded query once and reuse the exact byte sequence for signing and transmission. Reordering or re-encoding it would invalidate the signature.
- First significant delay: `GET /api/v1/dex/market/rwa/price` permits up to 100 addresses, but a 100-address signed GET produced HTTP `414`. Filtering to BSC and reducing batches to 20 succeeded.
- `llms.txt` / `llms-full.txt`: not used; the project used the reference pages directly.
- No unsupported endpoint names or parameter names are attributed to the coding agent. The implementation was checked against live signed responses.

## 3. Specific documentation issues

1. `https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data`, **Get RWA Token Price**: the documented maximum is 100 comma-separated addresses, but 100 BSC addresses produced HTTP `414`. State a safe URI-length bound, recommend a smaller batch, or provide a POST batch endpoint.
2. `https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/trading-api`, **executionMode**: the page says equity/RWA tokens always return `RFQ`. The live `USDT → SNXXB` LiquidMesh route returned `executionMode=SWAP`, a populated EVM `tx`, and no RFQ typed data.
3. `https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/transaction-api`, **Simulate Transactions example response**: the example shows `status: SUCCESS` together with `failReason: execution reverted: ERC20InsufficientBalance`. Either the status should be `FAILED` or the success example should use `failReason: null`.
4. `https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data`, **referencePrice**: the field is described as derived from the onchain token price and not an official traditional-market quote. Put this provenance warning beside the endpoint summary and response example because it changes how a premium or discount may be interpreted.
5. `https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/trading-api`, **tradeFee**: the field name suggests a trading charge, while the current description says estimated network fee in USD. Rename the field or show both concepts separately.

Examples tried: the request/response schemas were adapted into a small dependency-free Node.js client. They were not copied and run verbatim, so select the form option that accurately reflects that limitation rather than claiming all examples were tested.

Most useful page: `https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/trading-api`

## 4. API behavior and measured observations

- `GET /api/v1/dex/market/rwa/tokens` plus target price: 1,525 ms in the first integrated probe.
- `GET /api/v1/dex/aggregator/quote`: 343 ms for the first SNXXB observation.
- `GET /api/v1/dex/aggregator/swap`: 328 ms.
- `POST /api/v1/dex/pre-transaction/simulate`: 481 ms.
- These are single measurements, not medians or reliability claims.
- Exact live simulation failure: `execution reverted: BEP20: transfer amount exceeds balance`. This was correct because the configured read-only wallet had no BSC USDT.
- The HTTP `414` response had no Binance business `msg`, so the client could only surface `Binance Web3 API 414: request failed`; it did not identify that the request target was too long.
- No rate limit was observed during these runs.
- Authentication worked after enforcing the exact `/build` path, timestamp, raw query, and request body in the HMAC pre-hash. A regression test covers the signed path and encoding.
- The live RWA `SWAP` response contradicted the documented “always RFQ” statement. The project treats the response shape as authoritative and supports calldata when `tx` is present.

## 5. AI stack

- Used: None of the above
- Rating: N/A, did not use it
- BNB Agent Studio: N/A
- Do not claim an Agentic Wallet special-prize integration unless that integration is actually added and demonstrated.

## 6. Tokenized-stock observations

- Platforms exercised: bStocks and Ondo. xStock was not exercised.
- The authenticated scan returned 488 BSC tokenized-stock candidates; 364 reported the underlying market open at that observation time.
- A `$5` `USDT → SNXXB` LiquidMesh route returned calldata, zero reported price impact in the sanitized observation, and a correct insufficient-balance simulation failure.
- A later fresh-price scan found two same-ticker cross-issuer signals above 25 bps: QCOM at 37.68 bps gross and CBRS at 29.53 bps gross after normalizing issuer share ratios.
- Latest committed `$500` two-leg probes:
  - QCOM: buy `QCOMB`, sell equivalent-share `QCOMon`; both calldata legs built; `$499.68` USDT out before gas; blocked.
  - CBRS: buy `CBRSB`, sell equivalent-share `CBRSon`; both calldata legs built; `$499.04` USDT out before gas; blocked.
- Both quotes reported `0%` price impact, yet complete two-leg proceeds were below the starting notional. Price impact alone did not establish executable profitability.
- The project did not probe larger notionals, so it has no evidence for the size where liquidity gives out.
- Outside-hours evidence is limited to API status flags and a closed SEDG fixture. The gate blocks `openState=false`; no claim is made about a multi-day pattern.
- QCOM demonstrated why issuer ratios must be normalized: `QCOMB` used `1.00380432322353` shares per token and `QCOMon` used `1.0185368020889827`. Equal token counts would not represent equal economic exposure.
- The gross QCOM and CBRS signals were not actionable in the observed quotes. They are useful negative examples, not profit claims.

## 7. Redesign ideas grounded in the build

- Put a runnable signed JavaScript request on the first API page. It should include `/build`, reuse the exact encoded query for signing and transmission, and print a structured error.
- Add `POST /api/v1/dex/market/rwa/price/batch` so documented maximum batches cannot exceed a proxy URI limit.
- Add a multi-leg quote endpoint that accepts a sequence of token addresses and one normalized notional, then returns total proceeds, gas, fees, expiry, and per-leg failure reasons. This would support inventory rotation and arbitrage safety gates without stitching together expiring quote IDs.
- Add explicit `referencePriceSource`, `referencePriceTimestamp`, and `isIndependentReference` fields. A product should not infer price independence from the word “reference.”
- Make `executionMode` behavior match the RWA documentation, or document the exact conditions under which LiquidMesh returns `SWAP` for an RWA token.
- Replace ambiguous `tradeFee` with separate `networkFeeUsd`, `vendorFeeUsd`, and `protocolFeeUsd` fields.
- Include the maximum safe encoded URI length and recommended RWA price batch size beside the 100-address logical limit.
- One change with the largest time saving: a tested end-to-end BSC RWA example covering token discovery, quote, calldata build, funded simulation, and both possible execution modes (`SWAP` and `RFQ`).

## Evidence files

- `DX-LOG.md`
- `fixtures/credentialed-observation.json`
- `reports/cross-representation-spreads.json`
- `reports/cross-route-probe-qcom.json`
- `reports/cross-route-probe-cbrs.json`
- `test/signature.test.js`
- `test/decision-engine.test.js`
