package com.plugin.framework.core.spi;

/**
 * 简化版 HTTP 方法枚举，用于描述插件端点的请求方法。
 */
public enum HttpMethod {
    GET,
    POST,
    PUT,
    DELETE;

    /**
     * 从字符串解析 HTTP 方法，忽略大小写；null 或非法值时返回 GET。
     *
     * @param method 方法字符串
     * @return 对应的枚举值
     */
    public static HttpMethod from(String method) {
        if (method == null) {
            return GET;
        }
        return HttpMethod.valueOf(method.toUpperCase());
    }
}

