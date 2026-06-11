# runtime-audio-lifecycle Specification

## Purpose
Define the Tyou runtime audio lifecycle contract for public audio facade compatibility, AudioClip loading/cache behavior, playback ownership, AudioSource pool reuse, BGM switching, priority preemption, and module destruction.

## Requirements

### Requirement: Audio facade remains simple
The Tyou audio runtime MUST preserve the existing simple public audio API while improving lifecycle behavior internally.

#### Scenario: Business plays BGM and effects
- **WHEN** business code calls `tyou.audio.playBGM(path)` or `tyou.audio.playEffect(path)`
- **THEN** the audio runtime keeps the existing methods available
- **AND** business code does not need to manage audio handles or resource references

#### Scenario: Business controls volume and stops audio
- **WHEN** business code calls existing stop, pause, resume, or volume APIs
- **THEN** those APIs remain available with their documented behavior

### Requirement: AudioClip loading is coalesced and retryable
The Tyou audio runtime MUST coalesce same-path in-flight AudioClip loads and MUST allow retry after failed loading.

#### Scenario: Same clip is requested while loading
- **WHEN** the same audio path is requested multiple times before the first load completes
- **THEN** the runtime uses one in-flight AudioClip load
- **AND** each successful playback can still create its own AudioSource playback

#### Scenario: AudioClip loading fails
- **WHEN** an AudioClip load fails or returns null
- **THEN** the runtime removes the failed loading record
- **AND** a later request can retry loading the same path

### Requirement: Audio playback references release exactly once
The Tyou audio runtime MUST release AudioClip references exactly once for each successful playback ownership.

#### Scenario: AudioSource is returned to pool
- **WHEN** a playing AudioSource is stopped, preempted, naturally completed, or destroyed
- **THEN** the runtime removes the active playback record
- **AND** it releases the AudioClip reference once
- **AND** the AudioSource is reset before reuse

#### Scenario: Playback is dropped before acquiring source
- **WHEN** an AudioClip loads but no AudioSource is available due to priority or capacity
- **THEN** the runtime does not add an active playback reference
- **AND** no playback release is required

### Requirement: BGM switching is deterministic
The Tyou audio runtime MUST keep only the latest requested BGM as the current BGM after asynchronous loading.

#### Scenario: BGM is switched quickly
- **WHEN** `playBGM(a)` is followed by `playBGM(b)` before `a` finishes loading
- **THEN** the older request cannot become the current BGM after the newer request
- **AND** any AudioSource or AudioClip ownership from the older request is cleaned up

#### Scenario: Existing BGM is replaced
- **WHEN** a new BGM starts playing
- **THEN** the previous BGM is stopped through the normal return-to-pool path

### Requirement: AudioSource pool respects capacity and priority
The Tyou audio runtime MUST reuse AudioSources up to the configured capacity and only preempt lower-priority playback.

#### Scenario: Pool has idle source
- **WHEN** an idle AudioSource exists
- **THEN** the runtime reuses it for new playback

#### Scenario: Pool is full
- **WHEN** all AudioSources are active and a higher-priority audio request arrives
- **THEN** the runtime may preempt a lower-priority playback
- **AND** the preempted playback releases its AudioClip reference through the normal path

#### Scenario: Request priority is not high enough
- **WHEN** all AudioSources are active and no lower-priority playback exists
- **THEN** the runtime drops the new playback request without leaking an AudioClip reference

### Requirement: Audio destroy clears owned state
The Tyou audio runtime MUST clear all audio-owned playback, cache, pool, and node state when destroyed.

#### Scenario: Audio module is destroyed
- **WHEN** `tyou.audio.onDestroy()` runs
- **THEN** all active AudioSources are stopped and returned through the release path
- **AND** cached AudioClips are released through `tyou.res.decRef`
- **AND** the AudioModule node is destroyed
