package com.plugin.framework.core.spi;

/**
 * 描述插件提供的一个 HTTP 端点。
 */
public final class PluginEndpoint {

    private final String path;
    private final HttpMethod method;
    private final PluginHandler handler;

    public PluginEndpoint(String path, HttpMethod method, PluginHandler handler) {
        this.path = path;
        this.method = method;
        this.handler = handler;
    }

    public String getPath() {
        return path;
    }

    public HttpMethod getMethod() {
        return method;
    }

    public PluginHandler getHandler() {
        return handler;
    }
}

