package com.plugin.framework.core.runtime;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Properties;

/**
 * 插件元数据信息，来自插件包中的配置文件（例如 META-INF/plugin.properties）。
 */
public final class PluginMetadata {

    private final String id;

    private final String name;

    private final String version;

    private final String description;

    private final String author;

    /** 用于 @PluginService 扫描与 Spring Controller 扫描的包列表，来自 plugin.scan.packages（逗号分隔）。 */
    private final String[] scanPackages;

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

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getVersion() {
        return version;
    }

    public String getDescription() {
        return description;
    }

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

    public boolean hasValidId() {
        return id != null && !id.isEmpty();
    }
}

