# Asset Dependency Viewer

Cocos Creator 3.8.7 项目资源直接引用查看器。

## 使用

1. 在扩展目录执行 `npm install` 和 `npm run build`。
2. 重载扩展或重启 Creator。
3. 选择 `Tools -> 资源引用查看器 -> 打开面板`，面板会优先停靠在 Assets 旁边。打开面板不会扫描资源。
4. 点击“开启功能”后才会建立索引，并在项目 `temp/asset-dependency-viewer/` 下保存优化缓存。
   开启状态保存在项目级 Profile；下次启动 Creator 会保持开启，即使缓存缺失也会在 AssetDB ready 后重建。
5. 红色数字表示当前资源直接引用的项目资源数，绿色数字表示直接引用当前资源的项目资源数。
6. 点击数字打开详情；点击资源路径会在 Assets 面板中选中该资源。
7. 点击“关闭功能”会释放索引并删除缓存；之后资源变化不会触发扫描。仅关闭面板不会关闭索引功能。

总览有两级切换：

- 大类：`资源引用` / `冗余资源`。
- 子类：`资源` / `脚本`。
- 冗余定义为归并后的 `被引用数 === 0`。
- 冗余列表点击资源或脚本会直接定位到 Assets，不弹引用详情。

Assets 右键菜单：

- 文件提供“查看引用关系”。
- 文件夹提供“检查此文件夹引用”，总览只列出该目录子树。
- 面板内可使用 Assets 当前选择、点击范围面包屑切换父目录或清除范围。

## 统计边界

- 统计 Creator AssetDB 可证明的项目资源与脚本直接关系。
- 功能开启时使用 TypeScript AST 补充 `globalThis.xxx` 与其他脚本直接使用 `xxx` 的静态关系；Global 提供者不进入冗余脚本列表。
- Texture、SpriteFrame、Atlas 帧等子资源会归并到源资源路径并去重。
- 不统计 `tyou.res.*` 变量、配置或字符串拼接产生的运行时动态逻辑名引用。
- 不修改 Creator 内置 Assets 面板 DOM，也不扫描或修改 Prefab、Scene、meta 和运行时资源；脚本 AST 读取采用异步限流和 mtime 缓存。
