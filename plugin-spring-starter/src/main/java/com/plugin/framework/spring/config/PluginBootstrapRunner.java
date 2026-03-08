package com.plugin.framework.spring.config;

import com.plugin.framework.core.registry.PluginRegistryManager;
import com.plugin.framework.core.runtime.PluginContext;
import com.plugin.framework.core.runtime.PluginManager;
import com.plugin.framework.spring.mvc.PluginSpringRegistrar;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * 插件启动引导器：负责在应用启动时创建插件目录、配置安全校验、加载插件并注册到 Spring MVC。
 *
 * <p>将“启动时加载并注册”的逻辑从 {@link PluginFrameworkAutoConfiguration} 中抽离，便于单测与
 * 替换策略；AutoConfiguration 仅负责装配本 Bean 与 CommandLineRunner。
 */
public final class PluginBootstrapRunner {

    private static final Logger LOGGER =
            Logger.getLogger(PluginBootstrapRunner.class.getName());

    private static final String REGISTRY_FILE_NAME = "plugin-registry.json";
    private static final String BANNER_LINE = "========================================";

    private final PluginManager pluginManager;
    private final PluginContext pluginContext;
    private final PluginSpringRegistrar pluginSpringRegistrar;
    private final PluginFrameworkProperties properties;

    /**
     * 构造启动引导器。
     *
     * @param pluginManager 插件管理器
     * @param pluginContext 插件上下文
     * @param pluginSpringRegistrar MVC 注册器
     * @param properties 配置属性
     */
    public PluginBootstrapRunner(
            PluginManager pluginManager,
            PluginContext pluginContext,
            PluginSpringRegistrar pluginSpringRegistrar,
            PluginFrameworkProperties properties) {
        this.pluginManager = Objects.requireNonNull(pluginManager, "pluginManager");
        this.pluginContext = Objects.requireNonNull(pluginContext, "pluginContext");
        this.pluginSpringRegistrar =
                Objects.requireNonNull(pluginSpringRegistrar, "pluginSpringRegistrar");
        this.properties = Objects.requireNonNull(properties, "properties");
    }

    /**
     * 执行启动引导：创建目录、配置安全、加载插件、注册 MVC、可选打印 Banner。
     * 由 CommandLineRunner 在应用启动后调用。
     */
    public void run() {
        Path pluginsDir = properties.resolvePluginsDir();
        try {
            Files.createDirectories(pluginsDir);
        } catch (Exception e) {
            LOGGER.log(
                    Level.WARNING,
                    "failed to create plugins directory: " + pluginsDir + ", " + e.getMessage());
            return;
        }
        Path registryFile = pluginsDir.resolve(REGISTRY_FILE_NAME);
        PluginRegistryManager registryManager = new PluginRegistryManager(registryFile);
        String secret = properties.resolveSecret();
        pluginManager.configureSecurity(
                registryManager,
                secret,
                properties.getSecurityTokenMinLength(),
                properties.getSecurityTokenMaxLength());
        pluginManager.loadPlugins(pluginsDir, pluginContext);
        pluginManager.getPlugins().forEach(pluginSpringRegistrar::register);
        int pluginCount = pluginManager.getPlugins().size();
        if (properties.isBannerEnabled()) {
            printBanner(properties.getHostId(), pluginsDir.toString(), pluginCount);
        }
        LOGGER.info(
                "Plugin Framework started. hostId="
                        + properties.getHostId()
                        + ", pluginsDir="
                        + pluginsDir
                        + ", loadedPlugins="
                        + pluginCount);
    }

    private static void printBanner(String hostId, String pluginsDir, int loadedCount) {
        System.out.println();
        System.out.println(BANNER_LINE);
        System.out.println("  Plugin Framework Ready");
        System.out.println("  Host    : " + hostId);
        System.out.println("  Plugins : " + pluginsDir + " (" + loadedCount + " loaded)");
        System.out.println(BANNER_LINE);
        System.out.println();
    }
}
