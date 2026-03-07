package com.plugin.framework.core.registry;

import com.plugin.framework.core.spi.ExtensionPoint;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 默认扩展点注册表实现：线程安全，按扩展注册顺序返回实现列表；查找时过滤 {@link ExtensionPoint#supports} 不支持的上下文。
 */
public final class DefaultExtensionRegistry implements ExtensionRegistry {

    /** pointId -> 该扩展点下的实现列表（注册顺序）。 */
    private final Map<String, List<ExtensionPoint<?, ?>>> extensions = new ConcurrentHashMap<>();

    @Override
    public void register(ExtensionPoint<?, ?> extension) {
        Objects.requireNonNull(extension, "extension");
        List<ExtensionPoint<?, ?>> list =
                extensions.computeIfAbsent(
                        extension.getPointId(), key -> new CopyOnWriteArrayList<>());
        list.add(extension);
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

