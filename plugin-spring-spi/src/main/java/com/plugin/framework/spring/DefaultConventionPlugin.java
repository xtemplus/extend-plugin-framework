package com.plugin.framework.spring;

import com.plugin.framework.core.runtime.PluginContext;
import com.plugin.framework.core.runtime.PluginMetadata;
import com.plugin.framework.core.spi.Plugin;
import com.plugin.framework.core.spi.PluginService;
import com.plugin.framework.core.support.AnnotatedServiceRegistrar;
import com.plugin.framework.core.support.PluginClassLoaderScanner;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import org.springframework.web.bind.annotation.RestController;

/**
 * 约定式插件默认实现：无显式 {@link Plugin} 入口类时，由框架创建本实例并完成加载。
 *
 * <p>id/name 来自 {@link PluginMetadata}，扫描包来自 plugin.scan.packages；若未配置，则
 * 自动从插件 jar 中扫描带 {@link RestController}、{@link PluginService}
 * 的类并推断包列表。{@link #onEnable} 会扫描该包下带 @PluginService 的类并自动注册到
 * ServiceRegistry。宿主通过 {@link SpringPlugin#getBasePackages()} 注册同包下的 @RestController。
 *
 * <p>插件开发者只需在 jar 内提供 META-INF/plugin.properties（含 plugin.id、plugin.name）；
 * plugin.scan.packages 可选，不配置时将自动推断，无需手写扫描包。
 */
public final class DefaultConventionPlugin implements Plugin, SpringPlugin {

    private final PluginMetadata metadata;
    private final ClassLoader pluginClassLoader;

    /** 未配置 plugin.scan.packages 时懒推断的扫描包，仅计算一次。 */
    private volatile String[] inferredScanPackages;

    /**
     * 由框架通过反射构造（PluginManager 在未发现 SPI 时使用）。
     *
     * @param metadata 插件元数据（含 scanPackages，可为空）
     * @param pluginClassLoader 插件 jar 的 ClassLoader
     */
    public DefaultConventionPlugin(PluginMetadata metadata, ClassLoader pluginClassLoader) {
        this.metadata = Objects.requireNonNull(metadata, "metadata");
        this.pluginClassLoader = Objects.requireNonNull(pluginClassLoader, "pluginClassLoader");
    }

    /**
     * 供宿主注册 Controller 时使用：约定式插件实例由宿主创建，getClass().getClassLoader() 为宿主
     * ClassLoader，因此重写为返回插件 jar 的 ClassLoader。
     *
     * @return 插件 jar 的 ClassLoader
     */
    @Override
    public ClassLoader getPluginClassLoader() {
        return pluginClassLoader;
    }

    /**
     * 返回实际用于扫描的包列表：若元数据中已配置 plugin.scan.packages 则直接返回；否则从插件 jar
     * 中扫描带 @RestController、@PluginService 的类并推断包名（仅计算一次）。
     */
    private String[] getEffectiveScanPackages() {
        String[] fromMetadata = metadata.getScanPackages();
        if (fromMetadata != null && fromMetadata.length > 0) {
            return fromMetadata;
        }
        if (inferredScanPackages != null) {
            return inferredScanPackages;
        }
        synchronized (this) {
            if (inferredScanPackages != null) {
                return inferredScanPackages;
            }
            inferredScanPackages = inferScanPackagesFromJar();
            return inferredScanPackages;
        }
    }

    /**
     * 从插件 ClassLoader 对应的 jar 中扫描带 @RestController、@PluginService 的类，收集包名。
     */
    private String[] inferScanPackagesFromJar() {
        Set<String> packages = new HashSet<>();
        Set<String> classNames = PluginClassLoaderScanner.listAllClassNamesFromJars(pluginClassLoader);
        for (String className : classNames) {
            try {
                Class<?> clazz = pluginClassLoader.loadClass(className);
                if (clazz.isAnnotationPresent(RestController.class)
                        || clazz.isAnnotationPresent(PluginService.class)) {
                    Package pkg = clazz.getPackage();
                    if (pkg != null) {
                        packages.add(pkg.getName());
                    }
                }
            } catch (Throwable ignored) {
                // 跳过无法加载或无关的类
            }
        }
        return packages.toArray(new String[0]);
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
        String[] packages = getEffectiveScanPackages();
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
        return getEffectiveScanPackages();
    }
}
