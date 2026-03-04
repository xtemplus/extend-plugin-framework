package com.plugin.framework.core.spi;

import java.util.Collections;
import java.util.Map;

/**
 * 从 HTTP 请求抽象出来的插件请求。
 */
public final class PluginRequest {

    private final String path;
    private final HttpMethod method;
    private final Map<String, String> queryParameters;
    private final String body;

    public PluginRequest(
            String path, HttpMethod method, Map<String, String> queryParameters, String body) {
        this.path = path;
        this.method = method;
        this.queryParameters = queryParameters == null ? Collections.emptyMap() : queryParameters;
        this.body = body;
    }

    public String getPath() {
        return path;
    }

    public HttpMethod getMethod() {
        return method;
    }

    public Map<String, String> getQueryParameters() {
        return queryParameters;
    }

    public String getBody() {
        return body;
    }
}

