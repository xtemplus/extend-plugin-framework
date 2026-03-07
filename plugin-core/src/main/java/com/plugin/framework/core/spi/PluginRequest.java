package com.plugin.framework.core.spi;

import java.util.Collections;
import java.util.Map;

/**
 * 从 HTTP 请求抽象出来的插件请求，供 {@link PluginHandler} 使用。
 */
public final class PluginRequest {

    private final String path;
    private final HttpMethod method;
    private final Map<String, String> queryParameters;
    private final String body;

    /**
     * 创建插件请求。
     *
     * @param path 请求路径
     * @param method HTTP 方法
     * @param queryParameters 查询参数，可为 null（视为空 Map）
     * @param body 请求体
     */
    public PluginRequest(
            String path, HttpMethod method, Map<String, String> queryParameters, String body) {
        this.path = path;
        this.method = method;
        this.queryParameters = queryParameters == null ? Collections.emptyMap() : queryParameters;
        this.body = body;
    }

    /** @return 请求路径 */
    public String getPath() {
        return path;
    }

    /** @return HTTP 方法 */
    public HttpMethod getMethod() {
        return method;
    }

    /** @return 查询参数（只读） */
    public Map<String, String> getQueryParameters() {
        return queryParameters;
    }

    /** @return 请求体 */
    public String getBody() {
        return body;
    }
}

