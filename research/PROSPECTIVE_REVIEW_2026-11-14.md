# KAREN prospective validation review — 2026-11-14

## Observed production evidence
- Railway production deployment e93dec9 was SUCCESS; service online, one running replica, zero crashed, no active warnings/criticals at inspection.
- Production audit 2026-11-14T21:25:14Z: LIVE_MARKET, targetVerified=true, lastError=null.
- Frozen model: btc15-v1-prospective-frozen-20261113.
- 83 prospectively settled contracts; reported directional accuracy 0.43373493975903615 (36/83).
- 2,463 prospective forecast snapshots; 63 hypothetical selections.
- prospectiveReviewReady=false; modelValidated=false; prospectiveFillabilityVerified=false; netEdgeDemonstrated=false.
- Three earlier failed deployments in 24h require separate build-log review; successful live deployment does not erase historical failures.

## Diagnosis and next engineering work
1. Do not change the frozen model or retroactively relabel its forecasts. Continue collecting independent contract-level outcomes to >=100, then analyze the frozen cohort. Hitting 100 is an audit checkpoint, not a trading authorization.
2. Validate outcome labeling: Kalshi market ticker, official resolution, target, close timestamp, and quote timestamp for each contract. Check for YES/NO inversion and settlement-source mismatch; retain a sample of independently checked contracts.
3. Stratify first-eligible-forecast-per-contract by forecast phase, distance-to-target, quote availability, volatility, and market status. Report confidence intervals and Brier score, not only win rate. Do not count multiple correlated snapshots as independent contracts.
4. Compare frozen predictions with always-YES, always-NO, market-implied probability and 50/50 baselines using exactly the same contract cohort. Any new model must get a new version and future holdout; no tuning on the frozen holdout.
5. Reconcile assumed taker fees with the applicable live fee schedule; verify quote freshness, order-book depth, slippage, latency and executable fills in paper simulation. Report after-fee net returns with uncertainty and abstention rates.
6. Audit intermittent NO_OPEN_MARKET and stale snapshots; distinguish legitimate rollover from feed faults. Investigate prior failed builds separately.
7. Preserve read-only mode and manual decision-making until prospective evidence supports a positive net edge, with robust lower confidence bound, reliable data, and verified execution assumptions.

## Decision
WAIT for evidence collection, but do not mistake waiting alone for improvement. At 43.37% directional accuracy, the current frozen model is not ready for real-money reliance. A new independently tested model is likely required if the result persists.
