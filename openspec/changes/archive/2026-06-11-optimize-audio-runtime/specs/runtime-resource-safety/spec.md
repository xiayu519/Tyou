## ADDED Requirements

### Requirement: AudioClip resources follow audio playback lifecycle
The runtime resource safety contract MUST treat AudioClip cache and playback ownership as lifecycle-owned resources released by the audio module.

#### Scenario: AudioClip is cached for playback
- **WHEN** the audio runtime loads an AudioClip through `tyou.res.loadAssetAsync`
- **THEN** the clip is tracked in the audio cache
- **AND** successful playback ownership increments audio playback reference state

#### Scenario: Audio playback ends
- **WHEN** an AudioSource playback stops, is preempted, completes, or the audio module is destroyed
- **THEN** the AudioClip playback ownership is released exactly once
- **AND** unused cached AudioClips are released through `tyou.res.decRef`
