# Tyou Cocos Creator 3.8.7 接入

## 项目路径

- 美术源文件和 UI 图集工作区：Client/assets/asset-art/
- PSD/UI 图集：Client/assets/asset-art/atlas/{psdName}/
- 运行时角色资源：Client/assets/asset-raw/actor/
- 运行时特效：Client/assets/asset-raw/effect/
- UI Prefab 与相关资源：Client/assets/asset-raw/ui/
- UI atlas/raw：Client/assets/asset-raw/ui-raw/atlas/、Client/assets/asset-raw/ui-raw/raw/

不要照搬其他项目的 template_cc/assets 或 character/bullet/icon bundle 路径。

## 接入规则

1. 检查现有目录、同名资源和 bundle meta，按用途选择目标。
2. 让 Creator 导入并生成 meta，不手写 uuid。
3. 固定 Prefab 外观静态绑定 SpriteFrame。
4. 只有按逻辑名动态加载的独立图片才使用 l_ 前缀。
5. 动态资源进入 Tyou UI/Widget/Scene owner 生命周期。
6. 使用 assetool 重新生成资源索引，不手改 asset-index.json。
7. Sprite sheet 优先制作 SpriteAtlas；动态访问帧时加载 Atlas。

UI 图片使用 Sprite、Button、ProgressBar、Mask 等正规组件，不用运行时 Graphics 重画。Creator 导入后检查 importer、uuid、资源索引和同名冲突；Prefab/Scene/meta 变更使用 cocos-asset-json 校验。
