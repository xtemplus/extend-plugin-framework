package com.plugin.framework.core.extension;

import java.util.Objects;

/**
 * 扩展点单条实现记录：插件 ID + 实现方式（BUILTIN 或 HTTP）+ 引用信息。
 *
 * <p>BUILTIN 时需提供 classLoader、handlerClass、handlerMethod 供运行时反射调用；
 * HTTP 时需提供 baseUrl。
 */
public final class ExtensionPointImplementation {

    private final String pluginId;
    private final ExtensionPointImplementationType type;
    private final int priority;

    /** BUILTIN：插件 ClassLoader。 */
    private final ClassLoader classLoader;

    /** BUILTIN：处理类全限定名。 */
    private final String handlerClass;

    /** BUILTIN：方法名。 */
    private final String handlerMethod;

    /** HTTP：base URL（可含 path）。 */
    private final String baseUrl;

    private ExtensionPointImplementation(
            String pluginId,
            ExtensionPointImplementationType type,
            int priority,
            ClassLoader classLoader,
            String handlerClass,
            String handlerMethod,
            String baseUrl) {
        this.pluginId = Objects.requireNonNull(pluginId, "pluginId");
        this.type = Objects.requireNonNull(type, "type");
        this.priority = priority;
        this.classLoader = classLoader;
        this.handlerClass = handlerClass;
        this.handlerMethod = handlerMethod;
        this.baseUrl = baseUrl;
    }

    /** 创建 BUILTIN 实现。 */
    public static ExtensionPointImplementation builtin(
            String pluginId,
            ClassLoader classLoader,
            String handlerClass,
            String handlerMethod,
            int priority) {
        return new ExtensionPointImplementation(
                pluginId,
                ExtensionPointImplementationType.BUILTIN,
                priority,
                classLoader,
                handlerClass,
                handlerMethod,
                null);
    }

    /** 创建 HTTP 实现。 */
    public static ExtensionPointImplementation http(
            String pluginId, String baseUrl, int priority) {
        return new ExtensionPointImplementation(
                pluginId,
                ExtensionPointImplementationType.HTTP,
                priority,
                null,
                null,
                null,
                baseUrl);
    }

    public String getPluginId() {
        return pluginId;
    }

    public ExtensionPointImplementationType getType() {
        return type;
    }

    public int getPriority() {
        return priority;
    }

    public ClassLoader getClassLoader() {
        return classLoader;
    }

    public String getHandlerClass() {
        return handlerClass;
    }

    public String getHandlerMethod() {
        return handlerMethod;
    }

    public String getBaseUrl() {
        return baseUrl;
    }
}
