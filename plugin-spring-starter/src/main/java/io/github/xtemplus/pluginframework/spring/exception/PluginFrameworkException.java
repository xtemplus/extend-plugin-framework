package io.github.xtemplus.pluginframework.spring.exception;

/**
 * 插件框架运行时异常基类，用于上传、卸载、停用等操作失败时抛出。
 *
 * <p>子类 {@link PluginArgumentException} 表示参数不合法（如空 pluginId、空文件）；本类表示业务失败（如未找到插件、加载失败）。
 * 调用方可通过 {@link #getMessage()} 获取错误原因，或通过 {@link #getCause()} 获取原始异常。
 * 统一捕获 {@code PluginFrameworkException} 即可处理所有插件框架异常。
 */
public class PluginFrameworkException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /**
     * 使用错误信息构造。
     *
     * @param message 错误原因
     */
    public PluginFrameworkException(String message) {
        super(message);
    }

    /**
     * 使用错误信息与原因构造。
     *
     * @param message 错误原因
     * @param cause 原始异常
     */
    public PluginFrameworkException(String message, Throwable cause) {
        super(message, cause);
    }
}
