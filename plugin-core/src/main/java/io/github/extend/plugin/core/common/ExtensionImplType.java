package io.github.extend.plugin.core.common;

/**
 * 扩展点实现方式：进程内（BUILTIN）或 HTTP。
 */
public enum ExtensionImplType {
    /** 进程内：通过反射调用插件 jar 中的 handler 类。 */
    BUILTIN,
    /** HTTP：宿主向插件暴露的 URL 发起请求。 */
    HTTP
}
