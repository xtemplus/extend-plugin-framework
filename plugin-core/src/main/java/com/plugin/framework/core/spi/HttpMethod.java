package com.plugin.framework.core.spi;

/**
 * 简化版 HTTP 方法枚举。
 */
public enum HttpMethod {
    GET,
    POST,
    PUT,
    DELETE;

    public static HttpMethod from(String method) {
        if (method == null) {
            return GET;
        }
        return HttpMethod.valueOf(method.toUpperCase());
    }
}

