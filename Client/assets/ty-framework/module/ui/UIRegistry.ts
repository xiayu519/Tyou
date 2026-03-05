/**
 * UI类注册表
 *
 * 设计原则：此文件是"叶子模块"，不import任何框架代码（UIWindow等），
 * 仅维护一个 name→constructor 的映射表。
 *
 * 每个UI类在自身文件底部调用 UIRegistry.register() 完成自注册，
 * 从而避免：
 *  1) UI类之间互相import导致的循环依赖
 *  2) 一个中央import文件间接引入框架依赖链导致的循环依赖
 *
 * 使用方式：
 *  - 注册：  UIRegistry.register("TestUI", TestUI);        // 写在 TestUI.ts 底部
 *  - 打开：  tyou.ui.showUIAsync("TestUI");                 // 通过名字打开，无需import TestUI类
 *  - 关闭：  tyou.ui.closeWindow("TestUI");                 // 同理
 */

const _registry: Map<string, new () => any> = new Map();

export const UIRegistry = {

    /**
     * 注册一个UI类
     * @param name   唯一标识，通常使用 UIName 枚举值
     * @param ctor   UI类的构造函数
     */
    register(name: string, ctor: new () => any): void {
        if (_registry.has(name)) {
            console.warn(`[UIRegistry] UI "${name}" already registered, will be overwritten.`);
        }
        _registry.set(name, ctor);
    },

    /**
     * 通过名字获取UI类构造函数
     */
    get(name: string): (new () => any) | undefined {
        return _registry.get(name);
    },

    /**
     * 是否已注册
     */
    has(name: string): boolean {
        return _registry.has(name);
    },

    /**
     * 获取所有已注册的UI名字（调试用）
     */
    getAll(): string[] {
        return Array.from(_registry.keys());
    }
};
