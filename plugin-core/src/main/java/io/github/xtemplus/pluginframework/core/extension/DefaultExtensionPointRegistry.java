package io.github.xtemplus.pluginframework.core.extension;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 默认扩展点注册表实现：线程安全，实现按 priority 排序返回。
 */
public final class DefaultExtensionPointRegistry implements ExtensionPointRegistry {

    private final Map<String, ExtensionPointDefinition> definitions = new ConcurrentHashMap<>();
    private final Map<String, List<ExtensionPointImplementation>> implementationsByPointId =
            new ConcurrentHashMap<>();
    /** pluginId -> 该插件注册的 (pointId, impl) 列表，用于卸载时批量移除。 */
    private final Map<String, List<PointAndImpl>> byPluginId = new ConcurrentHashMap<>();

    @Override
    public void registerDefinition(ExtensionPointDefinition definition) {
        Objects.requireNonNull(definition, "definition");
        definitions.put(definition.getPointId(), definition);
    }

    @Override
    public void registerImplementation(String pointId, ExtensionPointImplementation impl) {
        Objects.requireNonNull(pointId, "pointId");
        Objects.requireNonNull(impl, "impl");
        implementationsByPointId
                .computeIfAbsent(pointId, k -> new ArrayList<>())
                .add(impl);
        byPluginId
                .computeIfAbsent(impl.getPluginId(), k -> new ArrayList<>())
                .add(new PointAndImpl(pointId, impl));
    }

    @Override
    public Optional<ExtensionPointDefinition> getDefinition(String pointId) {
        return Optional.ofNullable(definitions.get(pointId));
    }

    @Override
    public List<ExtensionPointImplementation> getImplementations(String pointId) {
        List<ExtensionPointImplementation> list = implementationsByPointId.get(pointId);
        if (list == null || list.isEmpty()) {
            return Collections.emptyList();
        }
        List<ExtensionPointImplementation> copy = new ArrayList<>(list);
        copy.sort(Comparator.comparingInt(ExtensionPointImplementation::getPriority));
        return copy;
    }

    @Override
    public void removeImplementationsByPluginId(String pluginId) {
        List<PointAndImpl> list = byPluginId.remove(pluginId);
        if (list == null) {
            return;
        }
        for (PointAndImpl p : list) {
            List<ExtensionPointImplementation> impls =
                    implementationsByPointId.get(p.pointId);
            if (impls != null) {
                impls.remove(p.impl);
                if (impls.isEmpty()) {
                    implementationsByPointId.remove(p.pointId);
                }
            }
        }
    }

    /** 内部：按 pointId + impl 记录，用于 removeImplementationsByPluginId 时反向清理。 */
    private static final class PointAndImpl {
        final String pointId;
        final ExtensionPointImplementation impl;

        PointAndImpl(String pointId, ExtensionPointImplementation impl) {
            this.pointId = pointId;
            this.impl = impl;
        }
    }
}
