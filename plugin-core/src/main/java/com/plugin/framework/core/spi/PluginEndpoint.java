package com.plugin.framework.core.spi;

/**
 * 描述插件提供的一个 HTTP 端点，包含路径、方法与处理函数。
 */
public final class PluginEndpoint {

    private final String path;
    private final HttpMethod method;
    private final PluginHandler handler;

    /**
     * 创建端点描述。
     *
     * @param path URL 路径
     * @param method HTTP 方法
     * @param handler 请求处理函数
     */
    public PluginEndpoint(String path, HttpMethod method, PluginHandler handler) {
        this.path = path;
        this.method = method;
        this.handler = handler;
    }

    /** @return 端点路径 */
    public String getPath() {
        return path;
    }

    /** @return HTTP 方法 */
    public HttpMethod getMethod() {
        return method;
    }

    /** @return 请求处理函数 */
    public PluginHandler getHandler() {
        return handler;
    }
}

