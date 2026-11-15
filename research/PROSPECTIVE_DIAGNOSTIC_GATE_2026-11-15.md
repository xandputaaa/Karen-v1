# KAREN prospective forecasting diagnostic gate — 2026-11-15

## Observed production evidence
Railway production service `karen-v1-web`, deployed commit `e93dec9`. Logs at 2026-11-15 17:03 UTC reported `prospectiveSettledContracts=162`, `prospectiveAccuracy=0.5`, `prospectiveReviewReady=true`, `modelValidated=false`, `netEdgeDemonstrated=false`, `prospectiveFillabilityVerified=false`, and Kalshi `LIVE_MARKET` with verified target. GitHub main `18604b3` contains a subsequent documentation change not yet deployed. These observations are not evidence of a profitable strategy.

## Diagnostic implementation checklist
1. Export **one immutable forecast per contract per predefined decision horizon** (e.g. 30 seconds after open, 5 minutes remaining, 1 minute remaining). Prevent repeated intra-contract snapshots from inflating sample size. Retain original forecast timestamp, target, market, model version, horizon, confidence, observed market bid/ask, fees and reference feed age.
2. Independently resolve every contract using its official settlement rule. Keep missing, disputed, overdue, and not-yet-due contracts separate; never treat pending as losses or silently drop them.
3. Report per-horizon and per-direction confusion matrices, sample counts, Wilson confidence intervals, Brier score and calibration bins. Compare to naive baselines including always-UP, always-DOWN and contemporaneous market-implied probability. Avoid interpreting 50% directional accuracy without class balance.
4. Diagnose performance by time-to-expiry, distance to target, volatility, spread, liquidity, data age and regime. Slice only when counts are sufficient; mark exploratory findings and avoid selecting a winner on the same holdout.
5. Reproduce outcomes with deterministic chronological train/validation/test splits, embargo around overlapping 15-minute contracts, and frozen model versions. Never train or tune on the final test window. Evaluate on fresh prospective contracts after changes.
6. Report hypothetical P&L using actual quoted executable sides, modeled fees, slippage, size and liquidity; mark fills unverified unless supported by actual order/fill data. Show uncertainty and drawdown; a profitable backtest is not sufficient for deployment.
7. Require passing automated tests for duplicate forecasts, future leakage, stale target, mismatched settlement rule, out-of-order events, missing quotes, and pending-to-settled transition.
8. Keep the existing live collector running. Do not enable automatic orders, change production model or deploy this diagnostic branch without explicit approval.

## Release gate
A minimum of 100 independently settled prospective contracts is a sample collection threshold, **not** an accuracy or profitability guarantee. Require predeclared evaluation criteria, improvement versus appropriate baselines on untouched prospective data, and independently verified net edge after fees before recommending real-money use.

## Current task status
This file is an audit/implementation specification only. No forecasting algorithm, production deployment, test execution or trading behavior was changed by this document.
