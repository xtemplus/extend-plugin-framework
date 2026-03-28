package io.github.xtemplus.pluginframework.core.extension;

/**
 * 扩展点运行时异常：契约校验失败、反射调用失败或 HTTP 调用失败时抛出。
 */
public class ExtensionPointRuntimeException extends RuntimeException {

    public ExtensionPointRuntimeException(String message) {
        super(message);
    }

    public ExtensionPointRuntimeException(String message, Throwable cause) {
        super(message, cause);
    }
}
