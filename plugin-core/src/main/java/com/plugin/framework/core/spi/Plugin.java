package com.plugin.framework.core.spi;

import com.plugin.framework.core.runtime.PluginContext;
import java.util.List;

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

    /**
     * 插件暴露的 HTTP 端点列表。
     *
     * @return 端点列表
     */
    List<PluginEndpoint> getEndpoints();
}

