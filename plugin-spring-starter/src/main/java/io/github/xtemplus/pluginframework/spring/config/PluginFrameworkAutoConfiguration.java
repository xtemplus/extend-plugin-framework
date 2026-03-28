package io.github.xtemplus.pluginframework.spring.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.xtemplus.pluginframework.core.extension.ExtensionPointRegistry;
import io.github.xtemplus.pluginframework.core.registry.DefaultExtensionRegistry;
import io.github.xtemplus.pluginframework.core.registry.DefaultServiceRegistry;
import io.github.xtemplus.pluginframework.core.runtime.PluginContext;
import io.github.xtemplus.pluginframework.core.runtime.PluginManager;
import io.github.xtemplus.pluginframework.spring.manager.SpringPluginManager;
import io.github.xtemplus.pluginframework.spring.mvc.PluginSpringRegistrar;
import java.util.Locale;
import java.util.logging.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

/**
 * 插件框架的 Spring Boot 自动配置。
 *
 * <p>宿主应用引入本 starter 后即可获得：
 *
 * <ul>
 *   <li>{@link PluginContext}：插件运行时上下文
 *   <li>{@link PluginManager}：插件加载/卸载/停用
 *   <li>{@link PluginSpringRegistrar}：将插件 Controller 注册到 Spring MVC
 *   <li>应用启动后自动扫描 {@code plugins/} 目录并加载插件的 CommandLineRunner（可通过配置关闭）
 * </ul>
 */
@Configuration
@EnableConfigurationProperties(PluginFrameworkProperties.class)
public class PluginFrameworkAutoConfiguration {

    /**
     * 默认的插件上下文 Bean；使用 {@link PluginFrameworkProperties#getHostId()} 与默认 Locale。
     * 若容器中存在 {@link ExtensionPointRegistry}，则使用其构建上下文（方案 A：声明式扩展点 + 契约）。
     *
     * @param properties 配置属性
     * @param extensionPointRegistry 扩展点契约注册表，可选
     * @return 插件上下文
     */
    @Bean
    @ConditionalOnMissingBean
    public PluginContext pluginContext(
            PluginFrameworkProperties properties,
            @Autowired(required = false) ExtensionPointRegistry extensionPointRegistry) {
        Logger logger = Logger.getLogger("PluginHost");
        if (extensionPointRegistry == null) {
            return new PluginContext(properties.getHostId(), logger, Locale.getDefault());
        }
        // 提供扩展点契约注册表时，同时注入默认的 ExtensionRegistry 与 ServiceRegistry
        return new PluginContext(
                properties.getHostId(),
                logger,
                Locale.getDefault(),
                new DefaultExtensionRegistry(),
                new DefaultServiceRegistry(),
                extensionPointRegistry);
    }

    /**
     * 默认的插件管理器 Bean。
     *
     * @return 插件管理器
     */
    @Bean
    @ConditionalOnMissingBean
    public PluginManager pluginManager() {
        return new PluginManager();
    }

    /**
     * 默认的 Spring MVC 注册器 Bean，用于将插件的 Controller 注册到 {@link RequestMappingHandlerMapping}。
     *
     * @param applicationContext 宿主应用上下文
     * @param handlerMapping Spring MVC 的 HandlerMapping
     * @return 注册器实例
     */
    @Bean
    @ConditionalOnMissingBean
    public PluginSpringRegistrar pluginSpringRegistrar(
            ConfigurableApplicationContext applicationContext,
            RequestMappingHandlerMapping handlerMapping) {
        return new PluginSpringRegistrar(applicationContext, handlerMapping);
    }

    /**
     * Spring 环境的插件管理器 Bean：封装上传并注册、卸载、停用及停用状态持久化。
     *
     * @param pluginManager 插件管理器
     * @param pluginContext 插件上下文
     * @param pluginSpringRegistrar Spring MVC 注册器
     * @param properties 配置属性
     * @param objectMapper 可选，用于停用状态 JSON 持久化
     * @return Spring 环境的插件管理器
     */
    @Bean
    @ConditionalOnMissingBean
    public SpringPluginManager springPluginManager(
            PluginManager pluginManager,
            PluginContext pluginContext,
            PluginSpringRegistrar pluginSpringRegistrar,
            PluginFrameworkProperties properties,
            @Autowired(required = false) ObjectMapper objectMapper) {
        return new SpringPluginManager(
                pluginManager,
                pluginContext,
                pluginSpringRegistrar,
                properties,
                objectMapper);
    }

    /**
     * 插件启动引导器 Bean，供 CommandLineRunner 与单测使用。
     *
     * @param pluginManager 插件管理器
     * @param pluginContext 插件上下文
     * @param pluginSpringRegistrar MVC 注册器
     * @param properties 配置属性
     * @return 启动引导器
     */
    @Bean
    @ConditionalOnMissingBean
    public PluginBootstrapRunner pluginBootstrapRunner(
            PluginManager pluginManager,
            PluginContext pluginContext,
            PluginSpringRegistrar pluginSpringRegistrar,
            PluginFrameworkProperties properties) {
        return new PluginBootstrapRunner(
                pluginManager,
                pluginContext,
                pluginSpringRegistrar,
                properties);
    }

    /**
     * 应用启动后自动扫描插件目录、加载插件并注册到 Spring MVC；当 {@code plugin.framework.auto-load-on-startup}
     * 为 true（默认）时注册。逻辑委托给 {@link PluginBootstrapRunner}，便于单测与替换。
     *
     * @param bootstrapRunner 启动引导器
     * @return 启动时执行的 CommandLineRunner
     */
    @Bean
    @ConditionalOnProperty(
            prefix = "plugin.framework",
            name = "auto-load-on-startup",
            havingValue = "true",
            matchIfMissing = true)
    public CommandLineRunner loadPluginsAtStartup(PluginBootstrapRunner bootstrapRunner) {
        return args -> bootstrapRunner.run();
    }
}
