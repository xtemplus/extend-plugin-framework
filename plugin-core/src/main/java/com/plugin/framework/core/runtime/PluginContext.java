package com.plugin.framework.core.runtime;

import com.plugin.framework.core.registry.DefaultExtensionRegistry;
import com.plugin.framework.core.registry.DefaultServiceRegistry;
import com.plugin.framework.core.registry.ExtensionRegistry;
import com.plugin.framework.core.registry.ServiceRegistry;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.logging.Logger;

/**
 * 插件运行时上下文，由宿主应用提供。
 */
public final class PluginContext {

    private final String hostName;
    private final Logger logger;
    private final Locale locale;
    private final ExtensionRegistry extensionRegistry;
    private final ServiceRegistry serviceRegistry;

    public PluginContext(String hostName, Logger logger, Locale locale) {
        this(
                hostName,
                logger,
                locale,
                new DefaultExtensionRegistry(),
                new DefaultServiceRegistry());
    }

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

    public String getHostName() {
        return hostName;
    }

    public Logger getLogger() {
        return logger;
    }

    public Locale getLocale() {
        return locale;
    }

    public ExtensionRegistry getExtensionRegistry() {
        return extensionRegistry;
    }

    public ServiceRegistry getServiceRegistry() {
        return serviceRegistry;
    }

    public Optional<Object> getAttribute(String key) {
        return Optional.empty();
    }
}

