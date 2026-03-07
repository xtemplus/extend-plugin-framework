package com.plugin.framework.core.spi;

/**
 * 插件端点处理函数，接收 {@link PluginRequest} 并返回 {@link PluginResponse}。
 */
@FunctionalInterface
public interface PluginHandler {

    /**
     * 处理请求。
     *
     * @param request 插件请求
     * @return 插件响应
     */
    PluginResponse handle(PluginRequest request);
}

