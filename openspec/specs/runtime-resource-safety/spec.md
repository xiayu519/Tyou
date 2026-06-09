# runtime-resource-safety Specification

## Purpose
Define the Tyou runtime resource-safety contract for asynchronous Sprite assignment and UI auto-release integration.
## Requirements
### Requirement: Sprite async assignment ignores stale requests
The runtime resource API MUST provide a Sprite assignment path that prevents stale asynchronous image loads from overwriting the latest request for the same Sprite.

#### Scenario: Older sprite request finishes last
- **WHEN** two async sprite assignments target the same Sprite and the older request completes after the newer request
- **THEN** the older request does not replace the SpriteFrame set by the newer request

#### Scenario: Sprite target is destroyed before completion
- **WHEN** an async sprite assignment completes after its Sprite target becomes invalid
- **THEN** the API reports failure and does not assign a SpriteFrame

### Requirement: UI sprite helper keeps auto release
The UI base class MUST expose a sprite assignment helper that preserves UI dynamic resource auto-release behavior.

#### Scenario: UI assigns sprite safely
- **WHEN** a UI uses the safe sprite assignment helper and the latest request succeeds
- **THEN** the assigned SpriteFrame is registered for UI auto-release
