package com.plugin.framework.core.spi;

/**
 * 插件处理结果。
 */
public final class PluginResponse {

    private final int status;
    private final Object body;

    public PluginResponse(int status, Object body) {
        this.status = status;
        this.body = body;
    }

    public int getStatus() {
        return status;
    }

    public Object getBody() {
        return body;
    }

    public static PluginResponse ok(Object body) {
        return new PluginResponse(200, body);
    }
}

