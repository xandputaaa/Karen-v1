# KAREN FINAL V1 — consolidated product and acceptance contract
Status: authoritative implementation plan, NOT a claim that features are deployed.
Date: 2026-11-12
Product: private friends-and-family AI market and sports intelligence dashboard.
Repository: xandputaaa/Karen-v1; production: Railway karen-v1-web.

## Non-negotiable design
- Apple × Yeezy restraint; black/chrome liquid-metal UI; ambient shifting light, animated ferrofluid assistant with IDLE/LISTENING/ANALYZING/PREDICTING/ALERT states.
- Mobile bottom navigation Home/BTC/Markets/Sports/More; desktop sidebar; all other pages reachable.
- Black charts with orange live price, green UP, red DOWN, orange WAIT. A distinct dashed KAREN projected path must never be confused with an observed price.
- Respect reduced-motion and mobile safe areas. Keep the page uncluttered and accessible.
- Simple Mode (user's “preschooler button”) changes complex labels into everyday language.

## BTC / prediction markets
- Kalshi BTC 15-minute priority; Polymarket BTC 5-minute secondary. Source adapters with verified market ID, venue, target, settlement reference, window start/end, bid/ask, liquidity, fee model, and feed timestamps.
- Show venue-specific prices and actual market odds only when verified. Coinbase spot reference is not the Kalshi settlement index and must be labeled accordingly.
- Real streaming/historical chart with time-range controls, contract countdown, target line, odds, and fresh/stale/disconnected state.
- Forecast pipeline: early 30–45 second capture, directional forecast UP/DOWN/WAIT, confidence with calibration, EV after fees and slippage, invalidation, timestamp and model version. No claims of 100% accuracy or guaranteed wins.
- Color-coded KAREN forecast path, timestamped predictions, out-of-sample validation and settled outcome scoring. GEX only with sourced, licensed, fresh data.
- Manual Kalshi/Polymarket position tracking and external trade links. No automatic execution.

## Sports
- NBA/NFL/NHL/NCAAF/MLB/UFC/Soccer game discovery; priority team/game selection; live scores and verified play-by-play where licensed feed supports it.
- Game detail HUD, estimated outcomes, probability distributions, matchup context and simulated scenarios explicitly distinguished from live observations.
- Match verified sports event to real Kalshi/Polymarket contracts where supported; odds and fees must be actual and fresh.
- Parlay builder uses verified market prices; otherwise show practice-only estimates and no fabricated odds.
- Public sharing only with explicit user action and a safe, opt-in account-backed community.

## KAREN assistant
- Concise FRIDAY-like feminine voice style, natural text chat, opt-in mic/voice mode, speaking/listening visual states.
- AI model API configured securely server-side, errors/rate limits handled gracefully; never assume ChatGPT Plus supplies API credits.
- Background feed checks, alert deduplication, push/voice notification opt-in, feed disconnect warnings, market changes and high-priority alerts.
- User-controlled preferences, data deletion, privacy disclosures; no hidden owner access, covert monitoring, or owner surveillance features.

## Quality gates (required before claiming LIVE)
1. All frontend pages render and navigation works on mobile and desktop.
2. Syntax, unit, API contract, accessibility and smoke tests pass in CI.
3. Railway production commit matches tested GitHub commit; inspect build/deploy and HTTP logs.
4. Spot/market/sports feeds expose timestamp, source, stale/disconnected states; no synthetic data on live screens.
5. Forecasts are logged BEFORE their outcome, settled independently and calibrated out of sample.
6. Voice, notifications, accounts, sharing and background tasks are exercised end-to-end.
7. Security review: rate limits, secrets, auth, CSRF where applicable, safe external URLs, and no owner surveillance.
8. Release labels: DEMO (synthetic), BETA (partially live), LIVE (all claimed functionality verified).

## Current implementation audit (2026-11-12)
- Present: Node web service on Railway, GitHub deployment, CSS HUD, ferrofluid CSS animation, multi-page navigation, Coinbase BTC spot reference endpoint, simulated BTC chart, venue visual switch, trend-only projection, simulated sports page, browser-local posts/alerts, manual position form, simple-mode preference.
- Missing or not verified: real Kalshi/Polymarket contract adapters, live odds/targets, settlement, background 30–45 second captures, validated forecast engine, real GEX, sports feeds, real parlays, voice/chat model, notifications, authenticated community, end-to-end tests.
- Important: the current app is DEMO, not final LIVE. Do not replace real data with plausible fabricated numbers.

## Release sequence
A. Reliability and integrity: tests, remove misleading sample calls, actual production smoke checks.
B. Venue market adapters, historical prices, contract-aware chart, freshness and recording.
C. Forecast engine, evaluation and alerts.
D. Sports integrations, game detail and verified parlay pricing.
E. Voice, accounts/community, privacy, performance and polished release QA.
