## ADDED Requirements

### Requirement: Managed release cancels matching in-flight requests
The runtime resource API MUST prevent in-flight managed loads from re-entering the managed cache after `releaseAll` has released their matching cache scope.

#### Scenario: releaseAll cancels pending managed asset load
- **WHEN** `tyou.res.releaseAll()` is called while a managed asset request is still in flight
- **THEN** the pending request does not add a managed cache entry after it completes
- **AND** it does not add a retained managed reference after it completes

#### Scenario: Bundle-scoped releaseAll cancels matching pending loads
- **WHEN** `tyou.res.releaseAll(bundle)` is called while managed asset or directory requests for that bundle are still in flight
- **THEN** pending requests for that bundle do not add managed cache entries after they complete
- **AND** pending requests for other bundles remain active
