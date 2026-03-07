package com.plugin.framework.core.spi;

/**
 * 插件 HTTP 处理结果，包含状态码与响应体。
 */
public final class PluginResponse {

    private final int status;
    private final Object body;

    /**
     * 创建响应。
     *
     * @param status HTTP 状态码
     * @param body 响应体（可被序列化）
     */
    public PluginResponse(int status, Object body) {
        this.status = status;
        this.body = body;
    }

    /** @return HTTP 状态码 */
    public int getStatus() {
        return status;
    }

    /** @return 响应体 */
    public Object getBody() {
        return body;
    }

    /**
     * 创建 200 OK 响应。
     *
     * @param body 响应体
     * @return 响应实例
     */
    public static PluginResponse ok(Object body) {
        return new PluginResponse(200, body);
    }
}

