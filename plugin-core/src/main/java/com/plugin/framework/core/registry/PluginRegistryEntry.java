package com.plugin.framework.core.registry;

import java.time.Instant;
import java.util.Objects;

/**
 * 插件注册表条目，描述当前激活的插件版本及其 Jar 文件信息。
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

    public String getPluginId() {
        return pluginId;
    }

    public String getPluginName() {
        return pluginName;
    }

    public String getVersion() {
        return version;
    }

    public String getJarFileName() {
        return jarFileName;
    }

    public String getChecksumSha256() {
        return checksumSha256;
    }

    public String getStatus() {
        return status;
    }

    public Instant getLastUpdateTime() {
        return lastUpdateTime;
    }

    public String getRemarks() {
        return remarks;
    }
}

