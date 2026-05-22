# Design

## 背景

当前 `Psd2CCC-Digest.jsx` 展开智能对象时，用智能对象内容文档的画布尺寸作为内部坐标映射基准：

```js
scaleX = layerBounds.width / smartDoc.width
scaleY = layerBounds.height / smartDoc.height
```

当智能对象内部画布带透明边距，或可见内容没有贴齐画布边缘时，外层智能对象图层的 bounds 实际对应的是内部可见像素范围，而不是整张内部画布。此时继续用 `smartDoc.width/height` 映射，会导致展开后的子图层压扁、偏移，视觉上和 PSD 不一致。

## 方案

1. 打开智能对象内容后，优先通过临时复制文档并合并可见图层，计算智能对象内部的真实可见像素 bounds。
2. 合并可见图层计算失败时，退回递归 union 可见图层 bounds。
3. 用内部可见 bounds 作为映射基准：

```js
scaleX = parentScaleX * layerBounds.width / contentBounds.width
scaleY = parentScaleY * layerBounds.height / contentBounds.height
offsetLeft = parentOffsetLeft + layerBounds.left * parentScaleX - contentBounds.left * scaleX
offsetTop = parentOffsetTop + layerBounds.top * parentScaleY - contentBounds.top * scaleY
```

4. `.img` 显式合图规则保持不变，不新增自动判断合图策略。
5. 在智能对象 group 的 `options` 中记录轻量诊断信息，便于对照导出的结构 JSON。

## 风险

- 剪贴蒙版、调整层、混合模式仍然可能在“拆成 Cocos 节点”后与 Photoshop 合成结果不完全一致；本变更只修展开坐标映射。
- Photoshop ExtendScript 只能在 Photoshop 中完整运行验证，本地只能做静态检查。

