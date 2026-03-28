package io.github.extend.plugin.core.spi;

import io.github.extend.plugin.core.runtime.PluginContext;

/**
 * 插件 SPI 接口，所有插件必须实现。
 */
public interface Plugin {

    /**
     * 插件唯一标识。
     *
     * @return 插件 ID
     */
    String getId();

    /**
     * 插件名称。
     *
     * @return 插件名称
     */
    String getName();

    /**
     * 插件启用回调。
     *
     * @param context 插件上下文
     */
    void onEnable(PluginContext context);

    /**
     * 插件禁用回调。
     */
    void onDisable();
}

