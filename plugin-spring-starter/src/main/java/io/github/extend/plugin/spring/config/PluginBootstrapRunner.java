package io.github.extend.plugin.spring.config;

import io.github.extend.plugin.core.registry.PluginRegistryManager;
import io.github.extend.plugin.core.runtime.PluginContext;
import io.github.extend.plugin.core.runtime.PluginManager;
import io.github.extend.plugin.spring.mvc.PluginSpringRegistrar;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.io.IOException;
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

    private static final Logger logger =
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
        PluginFrameworkProperties.RuntimeMode mode = properties.getRuntimeMode();
        if (mode == PluginFrameworkProperties.RuntimeMode.DEV) {
            runInDevMode();
            return;
        }
        runInDeploymentMode();
    }

    private void runInDeploymentMode() {
        Path pluginsDir = properties.resolvePluginsDir();
        try {
            Files.createDirectories(pluginsDir);
        } catch (IOException e) {
            logger.log(
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
        logger.info(
                "Plugin Framework started. hostId="
                        + properties.getHostId()
                        + ", pluginsDir="
                        + pluginsDir
                        + ", loadedPlugins="
                        + pluginCount);
    }

    /**
     * DEV 模式下的引导：不从 plugins 目录加载 JAR，只在配置了 devClassesDirs 时尝试构造额外 ClassLoader
     * 并加载其中声明的 Plugin，实现“无需打 JAR”的本地调试体验。若未配置 devClassesDirs，则仅打印日志提示，
     * 插件应通过普通模块依赖参与宿主启动。
     */
    private void runInDevMode() {
        String[] devDirs = properties.getDevClassesDirs();
        if (devDirs == null || devDirs.length == 0) {
            logger.info(
                    "Plugin Framework running in DEV mode without devClassesDirs; "
                            + "plugins are expected to be loaded via normal module dependencies.");
            return;
        }
        URL[] urls = toUrls(devDirs);
        if (urls.length == 0) {
            logger.warning("Plugin Framework DEV mode: no valid devClassesDirs, skip loading.");
            return;
        }
        ClassLoader parent = PluginBootstrapRunner.class.getClassLoader();
        try (URLClassLoader devClassLoader = new URLClassLoader(urls, parent)) {
            Logger pluginLogger = Logger.getLogger("PluginDevLoader");
            PluginContext devContext =
                    new PluginContext(
                            properties.getHostId(),
                            pluginLogger,
                            pluginContext.getLocale(),
                            pluginContext.getExtensionRegistry(),
                            pluginContext.getServiceRegistry(),
                            pluginContext.getExtensionPointRegistry());
            pluginManager.loadPlugins(properties.resolvePluginsDir(), devContext);
            pluginManager.getPlugins().forEach(pluginSpringRegistrar::register);
            int pluginCount = pluginManager.getPlugins().size();
            logger.info(
                    "Plugin Framework DEV mode started. hostId="
                            + properties.getHostId()
                            + ", devClassesDirs="
                            + String.join(",", devDirs)
                            + ", loadedPlugins="
                            + pluginCount);
        } catch (IOException e) {
            logger.log(Level.WARNING, "failed to close dev ClassLoader", e);
        }
    }

    private static URL[] toUrls(String[] paths) {
        return java.util.Arrays.stream(paths)
                .filter(p -> p != null && !p.isEmpty())
                .map(java.nio.file.Paths::get)
                .filter(Files::exists)
                .map(
                        path -> {
                            try {
                                return path.toUri().toURL();
                            } catch (MalformedURLException e) {
                                Logger.getLogger(PluginBootstrapRunner.class.getName())
                                        .log(
                                                Level.WARNING,
                                                "invalid devClassesDirs entry, skip: "
                                                        + path,
                                                e);
                                return null;
                            }
                        })
                .filter(Objects::nonNull)
                .toArray(URL[]::new);
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
