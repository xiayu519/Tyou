## 1. Release Scheduler Semantics

- [x] 1.1 Rework `ReleaseScheduler` so `decRef` lowers refs without immediate Cocos release and pending release waits for stable zero-ref delay.
- [x] 1.2 Add a scheduler hook that removes managed cache entries and triggers normal Cocos release only after delayed stable zero.

## 2. Managed Loader Ownership

- [x] 2.1 Rework `ManagedAssetLoader` cache entries so caches do not add long-lived owner refs.
- [x] 2.2 Ensure cache hits and pending-load fan-out create caller owner refs for each successful consumer.
- [x] 2.3 Update `releaseAll` and pending cancellation so cache eviction does not force-release active owners.
- [x] 2.4 Add lifecycle tracking for remote SpriteFrame runtime texture/image resources.

## 3. Resource Facade And Holders

- [x] 3.1 Update atlas SpriteFrame helpers so successful results have clear caller ownership and failed lookups release loaded owners.
- [x] 3.2 Harden Prefab, Spine, and Sprite assignment failure paths to release loaded owner refs.
- [x] 3.3 Update UI dynamic resource helpers to register the correct caller-owned asset under the new contract.

## 4. Specs, Reporting, And Validation

- [x] 4.1 Synchronize main OpenSpec specs with the implemented resource lifecycle contract.
- [x] 4.2 Maintain `run-report.md` with design decisions, verification, and remaining risk.
- [x] 4.3 Run OpenSpec validation, whitespace checks, and targeted static searches for resource lifecycle regressions.
