package com.plugin.framework.spring.exception;

import java.util.Objects;

/**
 * 插件框架参数异常：表示调用方传入参数不合法（如空 pluginId、空文件、文件名非 .jar 等）。
 *
 * <p>继承自 {@link PluginFrameworkException}，统一捕获基类即可处理；若需单独区分“参数错误”与“业务错误”，可捕获本类。
 */
public class PluginArgumentException extends PluginFrameworkException {

    private static final long serialVersionUID = 1L;

    /**
     * 使用错误信息构造。
     *
     * @param message 错误原因（如“插件 ID 不能为空”）
     */
    public PluginArgumentException(String message) {
        super(Objects.requireNonNull(message, "message"));
    }
}
