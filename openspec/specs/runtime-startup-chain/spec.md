# runtime-startup-chain Specification

## Purpose
Define the Tyou runtime startup ordering and dependency direction for resource index, Luban tables, localization, scene switching, and initial UI.

## Requirements
### Requirement: Startup chain preserves resource-index first ordering
The Tyou startup chain MUST complete runtime resource-index loading before loading Luban table data through the startup table orchestration entry.

#### Scenario: Startup table loading begins
- **WHEN** business startup calls the Tyou table-loading orchestration API after `tyou.onCreate()`
- **THEN** the resource module has already completed its `onCreate()` resource-index initialization
- **AND** Luban table loading continues to use the `config` bundle table directory without changing resource-index generation

### Requirement: Table module remains UI and localization independent
The runtime table module MUST only own Luban table loading, table construction, load state, and cleanup; it MUST NOT import Loading UI classes or directly trigger localization lifecycle methods.

#### Scenario: Tables are loaded
- **WHEN** table data is loaded from the `config` bundle
- **THEN** the table module constructs the generated `Tables` object
- **AND** the table module does not update `LoadingUI`
- **AND** the table module does not call `tyou.i18n.onCreate()` or `tyou.i18n.reloadFromTable()`

### Requirement: Startup orchestration refreshes localization after tables
The Tyou runtime MUST provide a startup orchestration path that loads Luban tables and refreshes localization only after the table load succeeds.

#### Scenario: Table load succeeds
- **WHEN** the startup table orchestration API finishes loading tables successfully
- **THEN** `tyou.table.getConfig()` returns the generated table container
- **AND** `tyou.i18n.reloadFromTable()` has rebuilt the localization dictionary from those tables

#### Scenario: Table load fails
- **WHEN** the startup table orchestration API cannot load table data
- **THEN** localization is not refreshed from missing table data
- **AND** callers receive a failure result they can use to stop or retry startup

### Requirement: Startup modules avoid TypeScript circular dependencies
The startup chain modules MUST keep dependency direction explicit so that table, localization, scene, and UI startup do not require TypeScript circular imports.

#### Scenario: Startup chain is compiled
- **WHEN** TypeScript resolves imports for `TableModule`, `LocalizationModule`, `SceneModule`, and `Tyou`
- **THEN** `TableModule` does not import application UI or localization modules
- **AND** `LocalizationModule` does not import `TableModule`
- **AND** startup order is coordinated by `Tyou`

### Requirement: Scene switching preserves old scene on load failure
The runtime scene module MUST NOT leave the current scene until the target scene asset has loaded and the runtime is ready to switch.

#### Scenario: Target scene asset fails to load
- **WHEN** `tyou.scene.loadSceneAsync(path)` cannot load the target `SceneAsset`
- **THEN** the method returns `false`
- **AND** the previous current scene has not been asked to leave due to that failed load
- **AND** the scene module is no longer marked as switching

#### Scenario: Scene module is destroyed during async switch
- **WHEN** `tyou.scene.onDestroy()` runs while a scene switch is waiting for async work
- **THEN** stale switch completion work does not enter the target scene
- **AND** the scene module is not left in a switching state
