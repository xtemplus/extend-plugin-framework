package com.plugin.framework.core.runtime;

import com.plugin.framework.core.spi.Plugin;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * 插件加载结果，包含新加载的插件以及被替换掉的插件 ID 列表。
 */
public final class PluginLoadResult {

    private static final PluginLoadResult EMPTY =
            new PluginLoadResult(Collections.emptyList(), Collections.emptyList());

    private final List<Plugin> loadedPlugins;

    private final List<String> replacedPluginIds;

    public PluginLoadResult(List<Plugin> loadedPlugins, List<String> replacedPluginIds) {
        this.loadedPlugins = Objects.requireNonNull(loadedPlugins, "loadedPlugins");
        this.replacedPluginIds =
                Objects.requireNonNull(replacedPluginIds, "replacedPluginIds");
    }

    public static PluginLoadResult empty() {
        return EMPTY;
    }

    public List<Plugin> getLoadedPlugins() {
        return Collections.unmodifiableList(loadedPlugins);
    }

    public List<String> getReplacedPluginIds() {
        return Collections.unmodifiableList(replacedPluginIds);
    }
}

