package io.github.xtemplus.pluginframework.core.registry;

import java.time.Instant;
import java.util.Objects;

/**
 * 插件注册表条目：描述当前激活的插件版本及其 Jar 文件名、校验和、状态与更新时间。
 */
public final class PluginRegistryEntry {

    private final String pluginId;
    private final String pluginName;
    private final String version;
    private final String jarFileName;
    private final String checksumSha256;
    private final String status;
    private final Instant lastUpdateTime;
    private final String remarks;

    /**
     * 创建注册表条目。
     *
     * @param pluginId 插件 ID
     * @param pluginName 插件名称
     * @param version 版本
     * @param jarFileName jar 文件名
     * @param checksumSha256 SHA-256 校验和，可为 null
     * @param status 状态（如 ACTIVE）
     * @param lastUpdateTime 最后更新时间
     * @param remarks 备注，可为 null
     */
    public PluginRegistryEntry(
            String pluginId,
            String pluginName,
            String version,
            String jarFileName,
            String checksumSha256,
            String status,
            Instant lastUpdateTime,
            String remarks) {
        this.pluginId = Objects.requireNonNull(pluginId, "pluginId");
        this.pluginName = Objects.requireNonNull(pluginName, "pluginName");
        this.version = Objects.requireNonNull(version, "version");
        this.jarFileName = Objects.requireNonNull(jarFileName, "jarFileName");
        this.checksumSha256 = checksumSha256;
        this.status = Objects.requireNonNull(status, "status");
        this.lastUpdateTime = Objects.requireNonNull(lastUpdateTime, "lastUpdateTime");
        this.remarks = remarks;
    }

    /** @return 插件 ID */
    public String getPluginId() {
        return pluginId;
    }

    /** @return 插件名称 */
    public String getPluginName() {
        return pluginName;
    }

    /** @return 版本 */
    public String getVersion() {
        return version;
    }

    /** @return jar 文件名 */
    public String getJarFileName() {
        return jarFileName;
    }

    /** @return SHA-256 校验和 */
    public String getChecksumSha256() {
        return checksumSha256;
    }

    /** @return 状态 */
    public String getStatus() {
        return status;
    }

    /** @return 最后更新时间 */
    public Instant getLastUpdateTime() {
        return lastUpdateTime;
    }

    /** @return 备注 */
    public String getRemarks() {
        return remarks;
    }
}

