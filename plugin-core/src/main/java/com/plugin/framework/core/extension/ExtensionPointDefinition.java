package com.plugin.framework.core.extension;

import java.util.Objects;

/**
 * 扩展点定义：扩展点 ID + 契约（request/response JSON Schema）+ 说明。
 *
 * <p>由宿主注册，用于校验与文档；不包含实现。
 */
public final class ExtensionPointDefinition {

    private final String pointId;
    private final String requestSchema;
    private final String responseSchema;
    private final String description;

    public ExtensionPointDefinition(
            String pointId,
            String requestSchema,
            String responseSchema,
            String description) {
        this.pointId = Objects.requireNonNull(pointId, "pointId");
        this.requestSchema = requestSchema;
        this.responseSchema = responseSchema;
        this.description = description;
    }

    public String getPointId() {
        return pointId;
    }

    public String getRequestSchema() {
        return requestSchema;
    }

    public String getResponseSchema() {
        return responseSchema;
    }

    public String getDescription() {
        return description;
    }

    public boolean hasRequestSchema() {
        return requestSchema != null && !requestSchema.isEmpty();
    }

    public boolean hasResponseSchema() {
        return responseSchema != null && !responseSchema.isEmpty();
    }
}
