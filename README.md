# KAREN V1 — deployment and verification guide

KAREN V1 is a Node.js read-only market and sports dashboard. It does **not** place trades or guarantee profitable predictions.

## Run and test

Requires Node.js 20+. Run `npm test` for the repository's Node test suite, then `npm start` (Railway injects `PORT`). The app exposes `/health` and `/api/status`.

## Live read-only endpoints

- `/api/kalshi/btc15m`: public Kalshi BTC 15-minute market snapshot. Quotes and target may be null; stale snapshots carry `status: STALE` and `verified: false`. A market snapshot is not proof of an executable fill.
- `/api/btc/spot`: Coinbase BTC-USD spot reference; **not** the Kalshi settlement source.
- `/api/btc/history`: Coinbase minute candle closes for context; not verified settlement observations.
- `/api/sports/games?league=NBA`: ESPN public scoreboard; other supported league codes are defined in `server.mjs`. Cached failures are explicitly marked stale.
- `/api/btc/validation`: recorded forecast validation summary.
- `/api/btc/storage`: forecast storage health probe.

## Release checklist

1. Run `npm test` and inspect failures before deploying.
2. Verify Railway's **new commit SHA** matches the intended release, deployment is `SUCCESS`, and one or more replicas are running.
3. Request `/health`, `/api/btc/storage`, `/api/kalshi/btc15m`, and `/api/sports/games?league=NBA`; check timestamps, explicit stale/disconnected statuses, and absence of fabricated data.
4. Inspect Railway build/runtime/HTTP logs for failures, upstream 429s, 5xxs, and restart loops.
5. Audit recorded settlement against the market's official outcome/rules. Never substitute Coinbase spot/candles for contract settlement.
6. Validate hypothetical execution after spread, fees, and slippage. Distinguish displayed quotes from actual fills.
7. Evaluate historical forecasts with time-ordered splits and immutable prediction timestamps; never use post-outcome data in features.
8. Check mobile safe areas, contrast, keyboard navigation, reduced-motion preferences, and feed-failure messaging.

## Operational limitations

A `SUCCESS` deployment verifies service startup, **not** upstream freshness, predictive accuracy, profitability, or settlement correctness. ESPN scores may lag live play. Kalshi and Coinbase feeds can disagree because they represent different observations. Do not use stale or unverified data for actionable calls.

No covert surveillance, trade execution, secrets in client code, or new paid services.
