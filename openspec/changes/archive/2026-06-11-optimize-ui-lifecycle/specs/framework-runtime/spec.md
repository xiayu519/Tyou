## ADDED Requirements

### Requirement: UI backdrop refresh follows current popup stack
The Tyou runtime MUST keep the shared popup backdrop synchronized with the current top eligible non-fullscreen window.

#### Scenario: Top popup changes quickly
- **WHEN** UI show, hide, close, or load-failure events request multiple backdrop refreshes in quick succession
- **THEN** stale refresh work does not override the latest stack state

#### Scenario: Hidden popup is not eligible
- **WHEN** a non-fullscreen popup is hidden or destroyed
- **THEN** the shared backdrop is not placed behind that hidden or destroyed popup
- **AND** the runtime can select the next lower eligible popup

#### Scenario: Backdrop is clicked
- **WHEN** the shared backdrop is clicked behind the top eligible popup
- **THEN** the runtime closes that popup only if `bgClose` is enabled
- **AND** otherwise emits the existing popup-background-click event for custom handling
