package com.plugin.framework.core.runtime;

import java.util.Objects;

/**
 * 声明式扩展点：来自 plugin.properties 的 extension.point.N.* 配置。
 *
 * <p>包含扩展点 ID、实现方式（builtin/http）、BUILTIN 时的 handler 类/方法、HTTP 时的 baseUrl。
 */
public final class DeclaredExtensionPoint {

    private final String pointId;
    /** 实现方式：builtin 或 http。 */
    private final String implementationType;
    private final String handlerClass;
    private final String handlerMethod;
    private final String baseUrl;

    public DeclaredExtensionPoint(
            String pointId,
            String implementationType,
            String handlerClass,
            String handlerMethod,
            String baseUrl) {
        this.pointId = pointId;
        this.implementationType = implementationType;
        this.handlerClass = handlerClass;
        this.handlerMethod = handlerMethod;
        this.baseUrl = baseUrl;
    }

    public String getPointId() {
        return pointId;
    }

    /** 实现方式：builtin 或 http。 */
    public String getImplementationType() {
        return implementationType;
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

    public boolean isBuiltin() {
        return "builtin".equalsIgnoreCase(implementationType);
    }

    public boolean isHttp() {
        return "http".equalsIgnoreCase(implementationType);
    }

    /** 是否有足够的 BUILTIN 信息（handlerClass 必填）。 */
    public boolean hasBuiltinHandler() {
        return isBuiltin() && handlerClass != null && !handlerClass.isEmpty();
    }
}
