package com.plugin.framework.core.registry;

import com.plugin.framework.core.spi.ExtensionPoint;
import java.util.List;
import java.util.Objects;

/**
 * 按插件绑定的扩展点注册表包装：将 {@link #register(ExtensionPoint)} 委托为带 pluginId 的注册，
 * 便于插件卸载时通过 {@link ExtensionRegistry#unregisterByPluginId} 统一移除。
 */
public final class PluginScopedExtensionRegistry implements ExtensionRegistry {

    private final String pluginId;
    private final ExtensionRegistry delegate;

    public PluginScopedExtensionRegistry(String pluginId, ExtensionRegistry delegate) {
        this.pluginId = Objects.requireNonNull(pluginId, "pluginId");
        this.delegate = Objects.requireNonNull(delegate, "delegate");
    }

    @Override
    public void register(ExtensionPoint<?, ?> extension) {
        delegate.register(pluginId, extension);
    }

    @Override
    public void register(String pluginId, ExtensionPoint<?, ?> extension) {
        delegate.register(pluginId, extension);
    }

    @Override
    public void unregisterByPluginId(String pluginId) {
        delegate.unregisterByPluginId(pluginId);
    }

    @Override
    public List<ExtensionPoint<?, ?>> getExtensions(String pointId, Object context) {
        return delegate.getExtensions(pointId, context);
    }
}
