

/**
 * UI层级枚举
 */
/*
export enum UILayer {
    Bottom = 0,
    UI = 1,
    Top = 2,
    Tips = 3,
    System = 4,
}
*/

import { Enum } from "cc";

export const UILayer = Enum({
    /** 底层（背景等） */
    Bottom: 0,
    /** 普通UI层 */
    UI: 1,
    /** 顶层（弹窗等） */
    Top: 2,
    /** 提示层（Toast等） */
    Tips: 3,
    /** 系统层（加载、网络异常等） */
    System: 4,
});


/**
 * 窗口属性接口
 */
export interface IWindowAttribute {
    /** 窗口唯一标识（对应枚举名） */
    path?: string;
    /** 窗口层级 */
    layer?: number;
    /** 是否全屏窗口 */
    fullScreen?: boolean;
    /** 点击背景是否关闭（仅对非全屏窗口生效） */
    bgClose?: boolean;
    /** 是否显示弹窗模糊背景（仅对非全屏窗口生效） */
    blurBackground?: boolean;
    /** 隐藏后自动关闭时间（秒），0表示不自动关闭 */
    hideTimeToClose?: number;
}
