package io.github.extend.plugin.core.runtime;

import io.github.extend.plugin.core.spi.Plugin;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * 插件加载结果，包含本次新加载的插件列表以及因同 ID 覆盖而被替换的插件 ID 列表。
 */
public final class PluginLoadResult {

    private static final PluginLoadResult EMPTY =
            new PluginLoadResult(Collections.emptyList(), Collections.emptyList());

    private final List<Plugin> loadedPlugins;
    private final List<String> replacedPluginIds;

    /**
     * 创建加载结果。
     *
     * @param loadedPlugins 新加载的插件列表
     * @param replacedPluginIds 被替换的插件 ID 列表
     */
    public PluginLoadResult(List<Plugin> loadedPlugins, List<String> replacedPluginIds) {
        this.loadedPlugins = Objects.requireNonNull(loadedPlugins, "loadedPlugins");
        this.replacedPluginIds =
                Objects.requireNonNull(replacedPluginIds, "replacedPluginIds");
    }

    /** @return 空加载结果（未加载任何插件时使用） */
    public static PluginLoadResult empty() {
        return EMPTY;
    }

    /** @return 本次新加载的插件列表（只读） */
    public List<Plugin> getLoadedPlugins() {
        return Collections.unmodifiableList(loadedPlugins);
    }

    /** @return 因同 ID 覆盖而被替换的插件 ID 列表（只读） */
    public List<String> getReplacedPluginIds() {
        return Collections.unmodifiableList(replacedPluginIds);
    }
}

