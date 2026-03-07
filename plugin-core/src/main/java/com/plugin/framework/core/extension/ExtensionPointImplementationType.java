package com.plugin.framework.core.extension;

import java.util.Objects;

/**
 * 扩展点实现方式。
 */
public enum ExtensionPointImplementationType {
    /** 进程内：通过反射调用插件 jar 中的 handler 类。 */
    BUILTIN,
    /** HTTP：宿主向插件暴露的 URL 发起请求。 */
    HTTP
}
