package io.github.xtemplus.pluginframework.core.runtime;

import io.github.xtemplus.pluginframework.core.common.PluginConstants;
import java.util.ArrayList;
import java.util.Collections;
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

    /** 声明式扩展点列表，来自 extension.point.N.*。 */
    private final List<DeclaredExtensionPoint> declaredExtensionPoints;

    /**
     * 创建元数据。
     *
     * @param id 插件 ID
     * @param name 插件名称
     * @param version 版本
     * @param description 描述
     * @param author 作者
     * @param scanPackages 扫描包数组，可为 null（视为空数组）
     * @param declaredExtensionPoints 声明式扩展点列表，可为 null（视为空列表）
     */
    public PluginMetadata(
            String id,
            String name,
            String version,
            String description,
            String author,
            String[] scanPackages,
            List<DeclaredExtensionPoint> declaredExtensionPoints) {
        this.id = id;
        this.name = name;
        this.version = version;
        this.description = description;
        this.author = author;
        this.scanPackages = scanPackages == null ? new String[0] : scanPackages.clone();
        this.declaredExtensionPoints =
                declaredExtensionPoints == null
                        ? List.of()
                        : Collections.unmodifiableList(new ArrayList<>(declaredExtensionPoints));
    }

    /** 兼容旧构造：无声明式扩展点。 */
    public PluginMetadata(
            String id,
            String name,
            String version,
            String description,
            String author,
            String[] scanPackages) {
        this(id, name, version, description, author, scanPackages, null);
    }

    /**
     * 从 Properties 解析元数据，键为 plugin.id、plugin.name 等；并解析 extension.point.N.* 为声明式扩展点。
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
        List<DeclaredExtensionPoint> declaredExtensionPoints =
                parseDeclaredExtensionPoints(properties);
        return new PluginMetadata(
                id, name, version, description, author, scanPackages, declaredExtensionPoints);
    }

    /** 解析 extension.point.1、extension.point.2、... 为 DeclaredExtensionPoint 列表。 */
    private static List<DeclaredExtensionPoint> parseDeclaredExtensionPoints(Properties props) {
        List<DeclaredExtensionPoint> list = new ArrayList<>();
        for (int n = 1; ; n++) {
            String prefix = "extension.point." + n + ".";
            String pointId = props.getProperty(prefix + "point-id");
            if (pointId == null) {
                pointId = props.getProperty(prefix + "pointId");
            }
            if (pointId == null || pointId.isEmpty()) {
                break;
            }
            String implementationType = props.getProperty(prefix + "implementation-type");
            if (implementationType == null) {
                implementationType = props.getProperty(prefix + "implementationType", "builtin");
            }
            String handlerClass = props.getProperty(prefix + "handler-class");
            if (handlerClass == null) {
                handlerClass = props.getProperty(prefix + "handlerClass");
            }
            String handlerMethod = props.getProperty(prefix + "handler-method");
            if (handlerMethod == null) {
                handlerMethod = props.getProperty(prefix + "handlerMethod", "handle");
            }
            String baseUrl = props.getProperty(prefix + "base-url");
            if (baseUrl == null) {
                baseUrl = props.getProperty(prefix + "baseUrl");
            }
            list.add(
                    new DeclaredExtensionPoint(
                            pointId.trim(),
                            implementationType == null ? "builtin" : implementationType.trim(),
                            handlerClass == null ? null : handlerClass.trim(),
                            handlerMethod == null ? "handle" : handlerMethod.trim(),
                            baseUrl == null ? null : baseUrl.trim()));
        }
        return list;
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
        for (String part : trimmed.split(PluginConstants.DELIMITER_COMMA)) {
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

    /**
     * 声明式扩展点列表（来自 extension.point.N.*）。
     *
     * @return 只读列表，可能为空
     */
    public List<DeclaredExtensionPoint> getDeclaredExtensionPoints() {
        return declaredExtensionPoints;
    }
}

