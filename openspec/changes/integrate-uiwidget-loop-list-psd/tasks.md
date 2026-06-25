## 1. Baseline And Guardrails

- [x] 1.1 Create `run-report.md` for this L4 change and record the user-approved `ty-framework`, `m_list`, loop-list, and `UIWidget` impact.
- [x] 1.2 Reconfirm the current `ListView`/`ListItem`, `UIBase`, `ViewUtil`, `uitscreate`, and `ui-component-config.json` behavior before editing.
- [x] 1.3 Identify the available validation commands for this Cocos project and record unavailable checks in `run-report.md`.

## 2. Runtime UIWidget Lifecycle

- [x] 2.1 Refactor `UIBase` dynamic-resource ownership so reusable UI owners can clear current dynamic assets on recycle without marking the owner permanently released.
- [x] 2.2 Add owner-epoch validation to UI resource helpers so async loads can detect recycle/release after the request started.
- [x] 2.3 Implement a general `UIWidget` class under `Client/assets/ty-framework/module/ui/` with create, refresh, recycle, release, visibility, parent, and child-widget ownership lifecycle.
- [x] 2.4 Add parent helper APIs for creating/registering/releasing child `UIWidget` instances while preserving existing `UIWindow` behavior.
- [x] 2.5 Update `ViewUtil.collectBindNodes()` to support widget-boundary scanning so parent UI binding skips `m_item` and supported generic widget subtrees.

## 3. Resource Safety

- [x] 3.1 Extend `SetSpriteAsyncParams` and `SpriteAssignService` with an optional owner-validity guard while preserving existing callers.
- [x] 3.2 Update `UIBase.setSpriteAsync()` and `UIBase.setRemoteSpriteAsync()` to pass owner-epoch guards and release late stale assets through `tyou.res.decRef`.
- [x] 3.3 Ensure `UIWidget` recycle releases item-owned SpriteFrames, atlas SpriteFrames, remote SpriteFrames, and other dynamic assets before the node is reused.
- [x] 3.4 Add focused tests or instrumented verification for stale async sprite requests finishing after widget recycle.

## 4. ListView Integration

- [x] 4.1 Add an optional item-widget factory/type API to `ListView` so generated parent UI code can bind a `UIWidget` class to the list.
- [x] 4.2 Create or retrieve the item widget when `ListView` creates or rents an item node, then refresh it with the current list index.
- [x] 4.3 Call item widget recycle before changing an existing item node from one index to another.
- [x] 4.4 Call item widget recycle before virtual item nodes enter `NodePool`.
- [x] 4.5 Call item widget release before non-virtual item deletion, active item destruction, pooled node clearing, and `ListView.onDestroy()`.
- [x] 4.6 Preserve legacy `renderEvent`, `create-item`, `update-item`, selection, cyclic scrolling, and `frameByFrameRenderNum` behavior.

## 5. Editor Structure Conversion

- [x] 5.1 Update `uitscreate` prefix checking so `m_list` requires `pkg:ListView` plus `cc.ScrollView` and no longer stops at plain `cc.ScrollView`.
- [x] 5.2 Implement fixed `m_list/content/m_item` normalization with `content` creation, top-aligned `cc.Layout`, `ScrollView.content`, `ListView.tmpNode`, and `pkg:ListItem` assignment.
- [x] 5.3 Show an actionable editor error when an `m_list` has no serving `m_item`.
- [x] 5.4 Show an actionable editor error when an `m_list` has multiple serving `m_item` templates.
- [x] 5.5 Convert non-standard but unambiguous `m_item` placement into the fixed instance structure while preserving the item subtree, transform, and size.

## 6. Script Generation

- [x] 6.1 Update node collection so parent UI script generation records `m_list` but skips `m_item` internal children.
- [x] 6.2 Generate deterministic item widget class names and files under `Client/assets/scripts/logic/ui/widget/`, creating the `widget` directory when absent.
- [x] 6.3 Generate item widget scripts that extend `UIWidget` and bind their own child nodes and events.
- [x] 6.4 Generate parent UI imports and registration code that binds each `m_list` to its item widget class.
- [x] 6.5 Support general `UIWidget` child ownership for non-list UI widgets, without forcing it into `ListView`.
- [x] 6.6 Preserve the existing safe behavior for already-existing UI or item script files and avoid silent overwrite.

## 7. Documentation And Specs

- [x] 7.1 Update `.agents/skills/tyou-dev/references/ui-patterns.md` with `UIWidget`, widget boundaries, and list item lifecycle guidance.
- [x] 7.2 Update `.agents/skills/tyou-dev/references/psd2ui-workflow.md` with `m_list/content/m_item` conversion and script-generation rules.
- [x] 7.3 Update `.agents/skills/tyou-dev/references/resource-api.md` with widget owner-epoch and recycle-time resource release rules.
- [x] 7.4 Update `.agents/skills/tyou-dev/references/naming-rules.md` with `m_item`, generated item class, `widget/`, and dynamic widget naming rules.

## 8. Validation

- [x] 8.1 Run TypeScript/build/static checks available in the project and record results in `run-report.md`.
- [x] 8.2 Run OpenSpec status and validation for `integrate-uiwidget-loop-list-psd`.
- [ ] 8.3 Validate with a UI test containing `m_list` and exactly one `m_item`: prefix check produces the fixed instance structure without manual operations.
- [x] 8.4 Validate generated parent and item scripts compile and the item script is created under `Client/assets/scripts/logic/ui/widget/`.
- [ ] 8.5 Validate fast list scrolling with async item sprite loading does not show stale images from previous indexes.
- [ ] 8.6 Validate item recycle, pool clear, and UI close release item/widget dynamic resources without leaked owner references.
- [x] 8.7 Run the Codex observability sensor for this L4 change and update `run-report.md` with the review-relevant result.

## 9. Widget And Module Scope Corrections

- [x] 9.1 Compare the reference `UIWidget` lifecycle with Tyou requirements and record the relevant conclusion.
- [x] 9.2 Move loop-list runtime files under `Client/assets/ty-framework/module/ui/loop-list/` and update all imports and verification scripts.
- [x] 9.3 Extend `UIBase`/`UIWidget` so parent UI can dynamically load prefab widgets, update child widgets, and release owned widget nodes safely.
- [x] 9.4 Update `uitscreate` so generated widget classes live under `Client/assets/scripts/logic/ui/widget/`, list items import from that folder, and a separate widget-script generation button exists.
- [x] 9.5 Update Tyou references/OpenSpec text from static widget-prefix wording to the dynamic widget model.
- [x] 9.6 Run focused syntax/transpile/OpenSpec checks for moved loop-list, widget runtime, generator, and test UI scripts.

## 10. Widget Generation Naming And Retention

- [x] 10.1 Require standalone widget script generation targets to contain a widget marker in the prefab/node name, while keeping `m_item` as the special list-item widget case.
- [x] 10.2 Change generated list item widget class names to `Item` + `m_item` suffix, detect duplicate generated item class names, and preserve safe existing-file behavior.
- [x] 10.3 Add widget side-effect import generation so standalone and item widget scripts are retained by mini-game builds without introducing UI/widget circular imports.
- [x] 10.4 Update current TestPsdUI item script binding and project references to the new item naming rule.
- [x] 10.5 Run focused generator syntax, TypeScript transpile, OpenSpec validation, and stale-reference scans for the new widget naming/import rules.

## 11. Prefix Check Item Widget Generation

- [x] 11.1 Restrict standalone widget generation markers to `Widget` only while keeping `m_item` as the special case.
- [x] 11.2 Generate `m_item` widget scripts during prefix checking after the list structure is normalized, while preserving right-click widget generation.
- [x] 11.3 Update specs, references, and run report for prefix-check item widget generation and the Widget-only marker rule.
- [x] 11.4 Run focused generator syntax, OpenSpec validation, and stale-reference scans for the updated rules.

## 12. Widget Spine Resource Lifecycle

- [x] 12.1 Add UI-owned Spine loading helpers so `UIWidget` recycle/release clears assigned SkeletonData and calls `decRef` through the UI dynamic resource owner.
- [x] 12.2 Guard async Spine assignment against stale owner epochs and newer requests for the same target.
- [x] 12.3 Stop generating empty `onRecycle()` overrides for standalone Widget prefab scripts while keeping the hook for list item scripts.
- [x] 12.4 Update specs/references/run-report for Spine ownership and list-item-only recycle guidance.
- [x] 12.5 Run focused TypeScript/generator/OpenSpec validation and stale-reference scans.
