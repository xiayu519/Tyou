## Context

`Psd2CCC-Digest.jsx` 当前用 `convertSegment()` 把 PSD 文件名和图层路径中的中文转成拼音首字母，再用 `buildExportName(psdPrefix, layerPath)` 生成 `PSD名_路径_短hash` 形式的 PNG 文件名。Cocos 导入侧通过结构 JSON 的 `relativePath` 去匹配同名 PNG 的 meta uuid；只要导出的 PNG 名变了，Cocos 就会把它当成新资源。

## Goals / Non-Goals

**Goals:**

- 普通 PSD 导出目录名使用 PSD 文件名本身。
- 普通 PNG 文件名使用图片图层名本身，去掉父路径、拼音转换和 hash。
- 重名导出时在后续同名文件末尾追加数字。
- 保留 `.img`、`_9s` / `_scale9` 标签剥离逻辑，让合图标签和九宫格参数调整不影响 PNG 文件名。
- 保持 `common` 公共图集命名和去重逻辑不变。

**Non-Goals:**

- 不迁移或重命名已经导出的旧 PNG/meta。
- 不改变 PSD 到 Cocos 节点树的布局、文本、九宫格 border、公共图集替换算法。
- 不处理 Windows 文件系统不允许保存的字符以外的美术命名规范。

## Decisions

### 1. 普通 PNG 基名只取图层名最后一段

`walk()` 已为普通九宫格图层构造了剥离 `_9s...` 后的 `exportRel`。新命名函数只取 `exportRel` 或 `.img` 路径的最后一段作为文件名来源，不再拼接父级组路径，并继续剥离 `.img` 合图标签。这样 PSD 里图片叫什么，导出 PNG 就叫什么，工具标签不进入资源文件名。

### 2. 保留最小文件名清洗

用户要求不要中文转英文，但 Windows 文件名仍不能包含 `\ / : * ? " < > |` 和控制字符。保留 `sanitizeFileName()` 的非法字符替换，但不替换中文、空格、括号等可保存字符。

### 3. 重名后缀使用紧贴数字

同一次 Digest 导出内维护已用文件名集合。第一次出现 `背景` 输出 `背景.png`，第二次输出 `背景1.png`，第三次输出 `背景2.png`。如果 `背景1` 已被美术显式使用，则继续寻找下一个可用数字，避免覆盖。

### 4. `common` 命名不改

`common` 由 Cocos 扩展按图片内容指纹生成 `common_<hash>`，服务去重和跨 PSD 复用。这个逻辑不依赖 Digest 的美术命名，保持不变。

## Risks / Trade-offs

- [Risk] 旧资源文件名会与新规则不一致，重新导出会产生新文件，需要人工清理旧 PNG/meta。Mitigation: 本次不做历史迁移；后续导出稳定后再清理旧资源。
- [Risk] 只按图层名命名会增加重名概率。Mitigation: 自动追加数字，且后续公共图集检查可继续去重。
- [Risk] 美术使用非法文件名字符时无法完全“原样”。Mitigation: 仅替换文件系统非法字符，这是保存文件的最低要求。
