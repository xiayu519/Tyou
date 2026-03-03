/**
 * UI统一注册文件（自动生成，请勿手动修改）
 *
 * 将所有UI类的导入和注册集中于此文件，防止微信小游戏等平台
 * 构建时 Tree Shaking 移除UI类。
 * 右键生成UI脚本时会自动更新此文件。
 */
import {UIRegistry} from "../../../ty-framework/module/ui/UIRegistry";
import {UIName} from "./UIName";
import {TestUI} from "./TestUI";
import {MessageBoxUI} from "./MessageBoxUI";
import {TestUI1} from "./TestUI1";
import {TestUI2} from "./TestUI2";

export function registerAllUI(): void {
    UIRegistry.register(UIName.TestUI, TestUI);
    UIRegistry.register(UIName.MessageBoxUI, MessageBoxUI);
    UIRegistry.register(UIName.TestUI1, TestUI1);
    UIRegistry.register(UIName.TestUI2, TestUI2);
}
