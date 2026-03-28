package io.github.extend.plugin.core.runtime;

import io.github.extend.plugin.core.extension.ExtensionPointRegistry;
import io.github.extend.plugin.core.registry.DefaultExtensionRegistry;
import io.github.extend.plugin.core.registry.DefaultServiceRegistry;
import io.github.extend.plugin.core.registry.ExtensionRegistry;
import io.github.extend.plugin.core.registry.ServiceRegistry;
import io.github.extend.plugin.core.spi.ExtensionPoint;
import io.github.extend.plugin.core.spi.Plugin;
import java.util.Locale;
import java.util.Objects;
import java.util.logging.Logger;

/**
 * 插件运行时上下文，由宿主应用创建并注入到插件的 {@link Plugin#onEnable(PluginContext)}。
 *
 * <p>提供宿主名称、日志、地域、扩展点注册表与服务注册表，供插件在启用时注册扩展或获取宿主能力。
 */
public final class PluginContext {

    /** 宿主应用名称/标识。 */
    private final String hostName;

    /** 宿主提供的日志器。 */
    private final Logger logger;

    /** 地域信息。 */
    private final Locale locale;

    /** 扩展点注册表，用于注册与查询 {@link ExtensionPoint}。 */
    private final ExtensionRegistry extensionRegistry;

    /** 类型化服务注册表，用于注册与查找基于接口的服务实现。 */
    private final ServiceRegistry serviceRegistry;

    /** 扩展点契约注册表（方案 A），可选。 */
    private final ExtensionPointRegistry extensionPointRegistry;

    /**
     * 使用默认扩展点注册表与服务注册表创建上下文。
     *
     * @param hostName 宿主名称
     * @param logger 日志器
     * @param locale 地域
     */
    public PluginContext(String hostName, Logger logger, Locale locale) {
        this(hostName, logger, locale, new DefaultExtensionRegistry(), new DefaultServiceRegistry());
    }

    /**
     * 使用自定义扩展点注册表创建上下文，服务注册表使用默认实现。
     *
     * @param hostName 宿主名称
     * @param logger 日志器
     * @param locale 地域
     * @param extensionRegistry 扩展点注册表
     */
    public PluginContext(
            String hostName,
            Logger logger,
            Locale locale,
            ExtensionRegistry extensionRegistry) {
        this(
                hostName,
                logger,
                locale,
                extensionRegistry,
                new DefaultServiceRegistry());
    }

    /**
     * 使用自定义扩展点注册表与服务注册表创建上下文（无扩展点契约注册表）。
     *
     * @param hostName 宿主名称
     * @param logger 日志器
     * @param locale 地域
     * @param extensionRegistry 扩展点注册表
     * @param serviceRegistry 服务注册表
     */
    public PluginContext(
            String hostName,
            Logger logger,
            Locale locale,
            ExtensionRegistry extensionRegistry,
            ServiceRegistry serviceRegistry) {
        this(
                hostName,
                logger,
                locale,
                extensionRegistry,
                serviceRegistry,
                null);
    }

    /**
     * 使用自定义扩展点注册表、服务注册表与扩展点契约注册表创建上下文。
     *
     * @param hostName 宿主名称
     * @param logger 日志器
     * @param locale 地域
     * @param extensionRegistry 扩展点注册表
     * @param serviceRegistry 服务注册表
     * @param extensionPointRegistry 扩展点契约注册表，可为 null
     */
    public PluginContext(
            String hostName,
            Logger logger,
            Locale locale,
            ExtensionRegistry extensionRegistry,
            ServiceRegistry serviceRegistry,
            ExtensionPointRegistry extensionPointRegistry) {
        this.hostName = Objects.requireNonNull(hostName, "hostName");
        this.logger = Objects.requireNonNull(logger, "logger");
        this.locale = Objects.requireNonNull(locale, "locale");
        this.extensionRegistry = Objects.requireNonNull(extensionRegistry, "extensionRegistry");
        this.serviceRegistry = Objects.requireNonNull(serviceRegistry, "serviceRegistry");
        this.extensionPointRegistry = extensionPointRegistry;
    }

    /** @return 宿主名称 */
    public String getHostName() {
        return hostName;
    }

    /** @return 日志器 */
    public Logger getLogger() {
        return logger;
    }

    /** @return 地域 */
    public Locale getLocale() {
        return locale;
    }

    /** @return 扩展点注册表 */
    public ExtensionRegistry getExtensionRegistry() {
        return extensionRegistry;
    }

    /**
     * 返回一个使用指定扩展点注册表的新上下文（用于加载插件时注入按 pluginId 绑定的注册表）。
     *
     * @param extensionRegistry 扩展点注册表
     * @return 新上下文实例，其余字段与当前一致
     */
    public PluginContext withExtensionRegistry(ExtensionRegistry extensionRegistry) {
        return new PluginContext(
                hostName,
                logger,
                locale,
                Objects.requireNonNull(extensionRegistry, "extensionRegistry"),
                serviceRegistry,
                extensionPointRegistry);
    }

    /** @return 服务注册表 */
    public ServiceRegistry getServiceRegistry() {
        return serviceRegistry;
    }

    /**
     * 扩展点契约注册表（方案 A）；为 null 时不使用声明式扩展点注册。
     *
     * @return 扩展点契约注册表，可能为 null
     */
    public ExtensionPointRegistry getExtensionPointRegistry() {
        return extensionPointRegistry;
    }
}