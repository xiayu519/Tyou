## Why

`Psd2CCC-Digest.jsx` 当前要求水平和垂直两个方向同时满足裁切条件，并会在末端 inset 为 0 时创建 0 像素 crop。结果是 `_9s_T_B_0_0` 可能在水平阶段失败并连带阻止有效的垂直裁切，零 inset 没有被当作合法边界值。

## What Changes

- 将显式九宫格的水平、垂直裁切改为独立判断。
- 某一轴两端均为 0 时只跳过该轴，不中止另一轴。
- 任一轴只有单侧 inset 为 0 时继续裁切，并避免创建 0 像素末端副本。
- 增加单轴和零 inset 契约测试，更新 PSD 工作流说明。

## Capabilities

### New Capabilities

- `psd-scale9-export`: 定义 Digest 对显式九宫格零 inset、单轴裁切和单侧零值的导出行为。

### Modified Capabilities

无。

## Impact

- `Client/tools/psd/Psd2CCC-Digest.jsx`
- `Client/tools/psd/tests/verify-scale9-contract.mjs`
- `.agents/skills/tyou-dev/references/psd2ui-workflow.md`
- `README.md`
- 不修改 Cocos 运行时、Prefab、场景和框架资源生命周期。
