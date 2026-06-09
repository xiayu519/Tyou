## ADDED Requirements

### Requirement: Popup windows can opt out of blur background
The Tyou UI runtime MUST allow non-fullscreen windows to remain normal popup windows while opting out of the shared blur background.

#### Scenario: Popup uses default blur behavior
- **WHEN** a non-fullscreen UI window is opened without an explicit blur-background override
- **THEN** it remains eligible to show the shared blur background behind it

#### Scenario: Popup disables blur background
- **WHEN** a non-fullscreen UI window is configured with `blurBackground: false`
- **THEN** the shared blur background is not shown for that window
- **AND** the runtime can continue looking below it for another eligible non-fullscreen window

#### Scenario: Fullscreen window config includes blur flag
- **WHEN** a fullscreen UI window is configured with `blurBackground`
- **THEN** the flag does not make the fullscreen window eligible for popup blur background
