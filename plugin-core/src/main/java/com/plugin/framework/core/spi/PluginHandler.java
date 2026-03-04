package com.plugin.framework.core.spi;

/**
 * 插件端点处理函数。
 */
@FunctionalInterface
public interface PluginHandler {

    PluginResponse handle(PluginRequest request);
}

