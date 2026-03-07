package com.plugin.framework.core.runtime;

import java.util.Objects;

/**
 * 上传并加载插件的结果：成功时包含 {@link PluginLoadResult}，失败时包含错误原因。
 *
 * <p>用于 {@link PluginManager#uploadAndLoad} 的返回值，便于上层区分成功/失败并展示消息。
 */
public final class UploadAndLoadResult {

    private final boolean success;
    private final String errorMessage;
    private final PluginLoadResult loadResult;

    private UploadAndLoadResult(boolean success, String errorMessage, PluginLoadResult loadResult) {
        this.success = success;
        this.errorMessage = errorMessage;
        this.loadResult = loadResult;
    }

    /**
     * 创建成功结果。
     *
     * @param loadResult 本次加载结果（含新加载的插件与被替换的插件 ID）
     * @return 成功结果
     */
    public static UploadAndLoadResult success(PluginLoadResult loadResult) {
        return new UploadAndLoadResult(
                true, null, Objects.requireNonNull(loadResult, "loadResult"));
    }

    /**
     * 创建失败结果。
     *
     * @param errorMessage 错误原因（供展示）
     * @return 失败结果
     */
    public static UploadAndLoadResult failure(String errorMessage) {
        return new UploadAndLoadResult(
                false,
                Objects.requireNonNull(errorMessage, "errorMessage"),
                PluginLoadResult.empty());
    }

    /** @return 是否上传并加载成功 */
    public boolean isSuccess() {
        return success;
    }

    /** @return 失败时的错误原因，成功时为 null */
    public String getErrorMessage() {
        return errorMessage;
    }

    /** @return 成功时的加载结果，失败时为 empty 结果 */
    public PluginLoadResult getLoadResult() {
        return loadResult == null ? PluginLoadResult.empty() : loadResult;
    }
}
