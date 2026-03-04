package com.plugin.framework.spring;


import com.plugin.framework.core.registry.PluginRegistryManager;
import com.plugin.framework.core.runtime.PluginContext;
import com.plugin.framework.core.runtime.PluginManager;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.logging.Logger;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

/**
 * 插件框架的 Spring Boot 自动配置。
 *
 * <p>宿主应用只需引入依赖即可获得：
 *
 * <ul>
 *   <li>{@link PluginContext}
 *   <li>{@link PluginManager}
 *   <li>{@link PluginSpringRegistrar}
 *   <li>应用启动后自动扫描 {@code plugins/} 目录并加载插件的逻辑
 * </ul>
 */
@AutoConfiguration
@EnableConfigurationProperties(PluginFrameworkProperties.class)
public class PluginFrameworkAutoConfiguration {

    private static final Logger log = Logger.getLogger("com.plugin.framework.spring");

    /**
     * 默认的插件上下文。
     *
     * @param properties 属性配置
     * @return 插件上下文
     */
    @Bean
    @ConditionalOnMissingBean
    public PluginContext pluginContext(PluginFrameworkProperties properties) {
        Logger logger = Logger.getLogger("PluginHost");
        return new PluginContext(properties.getHostId(), logger, Locale.getDefault());
    }

    /**
     * 默认的插件管理器。
     *
     * @return 插件管理器
     */
    @Bean
    @ConditionalOnMissingBean
    public PluginManager pluginManager() {
        return new PluginManager();
    }

    /**
     * 默认的 Spring MVC 注册器。
     *
     * @param applicationContext 宿主应用上下文
     * @param handlerMapping RequestMappingHandlerMapping
     * @return registrar 实例
     */
    @Bean
    @ConditionalOnMissingBean
    public PluginSpringRegistrar pluginSpringRegistrar(
            ConfigurableApplicationContext applicationContext,
            RequestMappingHandlerMapping handlerMapping) {
        return new PluginSpringRegistrar(applicationContext, handlerMapping);
    }

    /**
     * 应用启动后自动扫描插件目录并加载插件。
     *
     * @param pluginManager 插件管理器
     * @param pluginContext 插件上下文
     * @param pluginSpringRegistrar Spring MVC 注册器
     * @param properties 属性配置
     * @return 启动回调
     */
    @Bean
    @ConditionalOnProperty(
            prefix = "plugin.framework",
            name = "auto-load-on-startup",
            havingValue = "true",
            matchIfMissing = true)
    public CommandLineRunner loadPluginsAtStartup(
            PluginManager pluginManager,
            PluginContext pluginContext,
            PluginSpringRegistrar pluginSpringRegistrar,
            PluginFrameworkProperties properties) {
        return args -> {
            Path userDir = Paths.get(System.getProperty("user.dir"));
            Path pluginsDir = userDir.resolve(properties.getPluginsDir());
            Files.createDirectories(pluginsDir);
            Path registryFile = pluginsDir.resolve("plugin-registry.json");
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
                printStartupBanner(properties.getHostId(), properties.getPluginsDir(), pluginCount);
            }
            log.info(
                    "Plugin Framework started. hostId="
                            + properties.getHostId()
                            + ", pluginsDir="
                            + properties.getPluginsDir()
                            + ", loadedPlugins="
                            + pluginCount);
        };
    }

    /**
     * 在控制台打印插件框架启动 Banner。
     *
     * @param hostId 宿主 ID
     * @param pluginsDir 插件目录
     * @param loadedCount 已加载插件数量
     */
    private static void printStartupBanner(String hostId, String pluginsDir, int loadedCount) {
        String line = "========================================";
        System.out.println();
        System.out.println(line);
        System.out.println("  Plugin Framework Ready");
        System.out.println("  Host    : " + hostId);
        System.out.println("  Plugins : " + pluginsDir + " (" + loadedCount + " loaded)");
        System.out.println(line);
        System.out.println();
    }
}

