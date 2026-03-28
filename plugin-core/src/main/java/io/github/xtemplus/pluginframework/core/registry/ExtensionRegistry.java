package io.github.xtemplus.pluginframework.core.registry;

import io.github.xtemplus.pluginframework.core.spi.ExtensionPoint;
import java.util.List;

/**
 * 扩展点注册表：维护扩展点实现的注册与按 pointId + context 的查找。
 *
 * <p>宿主与插件通过约定扩展点 ID 与上下文类型，由插件注册 {@link ExtensionPoint} 实现，宿主按 ID 查询并执行。
 */
public interface ExtensionRegistry {

    /**
     * 注册扩展点实现。
     *
     * @param extension 扩展点实现
     */
    void register(ExtensionPoint<?, ?> extension);

    /**
     * 按插件 ID 注册扩展点实现（插件卸载时会自动移除）。
     *
     * @param pluginId 插件 ID，不能为空
     * @param extension 扩展点实现
     */
    void register(String pluginId, ExtensionPoint<?, ?> extension);

    /**
     * 移除指定插件注册的所有扩展点（插件卸载时由框架调用）。
     *
     * @param pluginId 插件 ID
     */
    void unregisterByPluginId(String pluginId);

    /**
     * 根据扩展点 ID 和上下文获取可用扩展实现。
     *
     * @param pointId 扩展点 ID
     * @param context 调用上下文
     * @return 支持该上下文的扩展实现列表，按注册顺序返回
     */
    List<ExtensionPoint<?, ?>> getExtensions(String pointId, Object context);
}

