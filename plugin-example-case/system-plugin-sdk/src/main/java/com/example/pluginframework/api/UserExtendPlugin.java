package com.example.pluginframework.api;

/**
 * 示例用户扩展接口，由宿主定义，插件实现。
 */
public interface UserExtendPlugin {

    /**
     * 吃东西的扩展逻辑。
     *
     * @param food 食物名称
     * @return 结果描述
     */
    String doEat(String food);

    /**
     * 睡觉的扩展逻辑。
     *
     * @param minutes 睡眠时长（分钟）
     * @return 结果描述
     */
    String doSleep(int minutes);
}

