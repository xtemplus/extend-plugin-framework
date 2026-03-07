package com.plugin.framework.core.runtime;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Properties;

/**
 * 插件元数据，来自插件包中的 META-INF/plugin.properties。
 *
 * <p>包含 plugin.id、plugin.name、plugin.version、plugin.scan.packages 等，用于加载与安全校验。
 */
public final class PluginMetadata {

    private final String id;
    private final String name;
    private final String version;
    private final String description;
    private final String author;

    /** 用于 @PluginService 与 Spring Controller 扫描的包列表，来自 plugin.scan.packages（逗号分隔）。 */
    private final String[] scanPackages;

    /**
     * 创建元数据。
     *
     * @param id 插件 ID
     * @param name 插件名称
     * @param version 版本
     * @param description 描述
     * @param author 作者
     * @param scanPackages 扫描包数组，可为 null（视为空数组）
     */
    public PluginMetadata(
            String id,
            String name,
            String version,
            String description,
            String author,
            String[] scanPackages) {
        this.id = id;
        this.name = name;
        this.version = version;
        this.description = description;
        this.author = author;
        this.scanPackages = scanPackages == null ? new String[0] : scanPackages.clone();
    }

    /**
     * 从 Properties 解析元数据，键为 plugin.id、plugin.name 等。
     *
     * @param properties 属性，不能为 null
     * @return 元数据实例
     */
    public static PluginMetadata fromProperties(Properties properties) {
        Objects.requireNonNull(properties, "properties");
        String id = properties.getProperty("plugin.id");
        String name = properties.getProperty("plugin.name");
        String version = properties.getProperty("plugin.version");
        String description = properties.getProperty("plugin.description");
        String author = properties.getProperty("plugin.author");
        String scanPackagesStr = properties.getProperty("plugin.scan.packages");
        String[] scanPackages = parseScanPackages(scanPackagesStr);
        return new PluginMetadata(id, name, version, description, author, scanPackages);
    }

    private static String[] parseScanPackages(String value) {
        if (value == null || value.isEmpty()) {
            return new String[0];
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return new String[0];
        }
        List<String> list = new ArrayList<>();
        for (String part : trimmed.split(",")) {
            String p = part.trim();
            if (!p.isEmpty()) {
                list.add(p);
            }
        }
        return list.toArray(new String[0]);
    }

    /** @return 插件 ID */
    public String getId() {
        return id;
    }

    /** @return 插件名称 */
    public String getName() {
        return name;
    }

    /** @return 版本 */
    public String getVersion() {
        return version;
    }

    /** @return 描述 */
    public String getDescription() {
        return description;
    }

    /** @return 作者 */
    public String getAuthor() {
        return author;
    }

    /**
     * 插件扫描包（用于 @PluginService 与 Spring Controller 扫描），来自 plugin.scan.packages。
     *
     * @return 包名数组，可能为空
     */
    public String[] getScanPackages() {
        return scanPackages.length == 0 ? new String[0] : scanPackages.clone();
    }

    /** @return 是否包含非空 plugin.id */
    public boolean hasValidId() {
        return id != null && !id.isEmpty();
    }
}

