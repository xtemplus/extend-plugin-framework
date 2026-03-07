package com.plugin.framework.core.runtime;

import com.plugin.framework.core.registry.DefaultExtensionRegistry;
import com.plugin.framework.core.registry.DefaultServiceRegistry;
import com.plugin.framework.core.registry.ExtensionRegistry;
import com.plugin.framework.core.registry.ServiceRegistry;
import com.plugin.framework.core.spi.Plugin;
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

    /** 扩展点注册表，用于注册与查询 {@link com.plugin.framework.core.spi.ExtensionPoint}。 */
    private final ExtensionRegistry extensionRegistry;

    /** 类型化服务注册表，用于注册与查找基于接口的服务实现。 */
    private final ServiceRegistry serviceRegistry;

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
     * 使用自定义扩展点注册表与服务注册表创建上下文。
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
        this.hostName = Objects.requireNonNull(hostName, "hostName");
        this.logger = Objects.requireNonNull(logger, "logger");
        this.locale = Objects.requireNonNull(locale, "locale");
        this.extensionRegistry = Objects.requireNonNull(extensionRegistry, "extensionRegistry");
        this.serviceRegistry = Objects.requireNonNull(serviceRegistry, "serviceRegistry");
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

    /** @return 服务注册表 */
    public ServiceRegistry getServiceRegistry() {
        return serviceRegistry;
    }
}