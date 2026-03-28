package io.github.extend.plugin.core.registry;

import io.github.extend.plugin.core.spi.ExtensionPoint;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 默认扩展点注册表实现：线程安全，按扩展注册顺序返回实现列表；查找时过滤 {@link ExtensionPoint#supports} 不支持的上下文。
 * 支持按 pluginId 注册，插件卸载时通过 {@link #unregisterByPluginId} 移除。
 */
public final class DefaultExtensionRegistry implements ExtensionRegistry {

    /** pointId -> 该扩展点下的实现列表（注册顺序）。 */
    private final Map<String, List<ExtensionPoint<?, ?>>> extensions = new ConcurrentHashMap<>();

    /** pluginId -> 该插件注册的扩展列表，用于卸载时批量移除。 */
    private final Map<String, List<ExtensionPoint<?, ?>>> byPluginId = new ConcurrentHashMap<>();

    @Override
    public void register(ExtensionPoint<?, ?> extension) {
        Objects.requireNonNull(extension, "extension");
        List<ExtensionPoint<?, ?>> list =
                extensions.computeIfAbsent(
                        extension.getPointId(), key -> new CopyOnWriteArrayList<>());
        list.add(extension);
        // 未传 pluginId 的注册不纳入 byPluginId，卸载时无法按插件批量移除
    }

    @Override
    public void register(String pluginId, ExtensionPoint<?, ?> extension) {
        Objects.requireNonNull(pluginId, "pluginId");
        Objects.requireNonNull(extension, "extension");
        List<ExtensionPoint<?, ?>> list =
                extensions.computeIfAbsent(
                        extension.getPointId(), key -> new CopyOnWriteArrayList<>());
        list.add(extension);
        byPluginId
                .computeIfAbsent(pluginId, k -> new CopyOnWriteArrayList<>())
                .add(extension);
    }

    @Override
    public void unregisterByPluginId(String pluginId) {
        Objects.requireNonNull(pluginId, "pluginId");
        List<ExtensionPoint<?, ?>> list = byPluginId.remove(pluginId);
        if (list == null || list.isEmpty()) {
            return;
        }
        for (ExtensionPoint<?, ?> ext : list) {
            List<ExtensionPoint<?, ?>> pointList = extensions.get(ext.getPointId());
            if (pointList != null) {
                pointList.remove(ext);
                if (pointList.isEmpty()) {
                    extensions.remove(ext.getPointId());
                }
            }
        }
    }

    @Override
    public List<ExtensionPoint<?, ?>> getExtensions(String pointId, Object context) {
        Objects.requireNonNull(pointId, "pointId");
        List<ExtensionPoint<?, ?>> list = extensions.get(pointId);
        if (list == null || list.isEmpty()) {
            return Collections.emptyList();
        }
        List<ExtensionPoint<?, ?>> result = new ArrayList<>();
        for (ExtensionPoint<?, ?> extension : list) {
            // 仅返回 supports(context) 为 true 的实现
            if (supportsContext(extension, context)) {
                result.add(extension);
            }
        }
        return Collections.unmodifiableList(result);
    }

    /** 类型擦除下调用 extension.supports(context)。 */
    @SuppressWarnings("unchecked")
    private boolean supportsContext(ExtensionPoint<?, ?> extension, Object context) {
        ExtensionPoint<Object, ?> typed = (ExtensionPoint<Object, ?>) extension;
        return typed.supports(context);
    }
}

