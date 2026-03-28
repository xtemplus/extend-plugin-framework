package io.github.extend.plugin.core.extension;

import java.util.List;
import java.util.Optional;

/**
 * 扩展点注册表：维护扩展点定义（契约）与实现列表。
 *
 * <p>宿主注册定义；插件加载时由框架注册实现（BUILTIN 或 HTTP）。
 */
public interface ExtensionPointRegistry {

    /**
     * 注册扩展点定义（契约）。
     *
     * @param definition 扩展点定义，不能为 null
     */
    void registerDefinition(ExtensionPointDefinition definition);

    /**
     * 注册扩展点实现。
     *
     * @param pointId 扩展点 ID
     * @param impl 实现，不能为 null
     */
    void registerImplementation(String pointId, ExtensionPointImplementation impl);

    /**
     * 按扩展点 ID 查询定义。
     *
     * @param pointId 扩展点 ID
     * @return 定义，未注册则 empty
     */
    Optional<ExtensionPointDefinition> getDefinition(String pointId);

    /**
     * 按扩展点 ID 查询实现列表（按 priority 排序，小的优先）。
     *
     * @param pointId 扩展点 ID
     * @return 实现列表，未注册则空列表
     */
    List<ExtensionPointImplementation> getImplementations(String pointId);

    /**
     * 移除指定插件的所有扩展点实现（插件卸载时调用）。
     *
     * @param pluginId 插件 ID
     */
    void removeImplementationsByPluginId(String pluginId);
}
