package com.plugin.framework.spring;

import com.plugin.framework.core.runtime.PluginContext;
import com.plugin.framework.core.runtime.PluginMetadata;
import com.plugin.framework.core.spi.Plugin;
import com.plugin.framework.core.support.AnnotatedServiceRegistrar;
import java.util.Objects;

/**
 * 约定式插件默认实现：无显式 {@link Plugin} 入口类时，由框架创建本实例并完成加载。
 *
 * <p>id/name 来自 {@link PluginMetadata}，扫描包来自 plugin.scan.packages；{@link #onEnable}
 * 会扫描该包下带 {@link com.plugin.framework.core.spi.PluginService} 的类并自动注册到
 * ServiceRegistry。宿主通过 {@link SpringPlugin#getBasePackages()} 注册同包下的 @RestController。
 *
 * <p>插件开发者只需在 jar 内提供 META-INF/plugin.properties（含 plugin.id、plugin.name、
 * plugin.scan.packages）以及带 @PluginService 的实现类，无需再写任何 Plugin 入口类。
 */
public final class DefaultConventionPlugin implements Plugin, SpringPlugin {

    private final PluginMetadata metadata;
    private final ClassLoader pluginClassLoader;

    /**
     * 由框架通过反射构造（PluginManager 在未发现 SPI 时使用）。
     *
     * @param metadata 插件元数据（含 scanPackages）
     * @param pluginClassLoader 插件 jar 的 ClassLoader
     */
    public DefaultConventionPlugin(PluginMetadata metadata, ClassLoader pluginClassLoader) {
        this.metadata = Objects.requireNonNull(metadata, "metadata");
        this.pluginClassLoader = Objects.requireNonNull(pluginClassLoader, "pluginClassLoader");
    }

    /**
     * 供宿主注册 Controller 时使用：约定式插件实例由宿主创建，getClass().getClassLoader() 为宿主
     * ClassLoader，需通过本方法获取插件 jar 的 ClassLoader。
     *
     * @return 插件 jar 的 ClassLoader
     */
    public ClassLoader getPluginClassLoader() {
        return pluginClassLoader;
    }

    @Override
    public String getId() {
        return metadata.getId();
    }

    @Override
    public String getName() {
        return metadata.getName();
    }

    @Override
    public void onEnable(PluginContext context) {
        String[] packages = metadata.getScanPackages();
        if (packages.length == 0) {
            return;
        }
        if (context.getServiceRegistry() != null) {
            AnnotatedServiceRegistrar.registerAll(
                    pluginClassLoader, context.getServiceRegistry(), packages);
        }
    }

    @Override
    public void onDisable() {
        // 约定式插件无额外资源需释放
    }

    @Override
    public String[] getBasePackages() {
        return metadata.getScanPackages();
    }
}
