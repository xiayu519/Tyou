import {UIRegistry} from "./UIRegistry";
import {IWindowAttribute, UILayer} from "./WindowAttribute";

/** 装饰器默认窗口属性 */
const DEFAULT_WINDOW_ATTRIBUTE: Required<Omit<IWindowAttribute, 'path'>> = {
    layer: UILayer.UI,
    fullScreen: true,
    bgClose: false,
    hideTimeToClose: 3,
};

/**
 * UI装饰器配置选项
 *
 * 通过装饰器同时完成：
 *  1) UI类自动注册到 UIRegistry（防止循环依赖 + 防 Tree Shaking）
 *  2) 窗口属性配置（layer, fullScreen, bgClose 等）
 *
 * @example
 * ```typescript
 * // 最简用法：只需提供 name，其余属性使用默认值
 * @UIDecorator({ name: UIName.TestUI })
 * export class TestUI extends UIWindow { }
 *
 * // 需要覆盖默认属性时，添加对应参数即可
 * @UIDecorator({ name: UIName.MessageBoxUI, layer: UILayer.Tips, fullScreen: false, bgClose: false })
 * export class MessageBoxUI extends UIWindow { }
 * ```
 */
export interface IUIDecoratorOptions extends Partial<IWindowAttribute> {
    /** UI唯一标识名，推荐使用 UIName 枚举值 */
    name: string;
}

/**
 * UI窗口类装饰器
 *
 * 功能：
 *  - 自动调用 UIRegistry.register() 注册 UI 类
 *  - 在类上存储窗口属性配置，运行时由 UIWindow.customAttribute 自动读取
 *
 * 设计原则：
 *  - 本文件仅 import UIRegistry（叶子）和 WindowAttribute（叶子），无框架循环依赖
 *  - 每个 UI 类文件通过装饰器自注册，UIImportAll.ts 仅做 side-effect import 防止 Tree Shaking
 *
 * @param options UI装饰器配置，包含 name 和可选的窗口属性
 */
export function UIDecorator(options: IUIDecoratorOptions) {
    return function <T extends new (...args: any[]) => any>(target: T): T {
        // 合并默认值 + 用户配置，存储在类上
        const mergedAttributes = {...DEFAULT_WINDOW_ATTRIBUTE, ...options};
        (target as any).__uiName = options.name;
        (target as any).__uiAttributes = mergedAttributes;

        // 自动注册到 UIRegistry
        UIRegistry.register(options.name, target);

        return target;
    };
}
