package io.github.xtemplus.pluginframework.springweb.config;

import io.github.xtemplus.pluginframework.spring.config.PluginFrameworkAutoConfiguration;
import io.github.xtemplus.webplugin.api.WebPluginFacade;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

/**
 * 引入 {@code plugin-spring-web-starter} 时自动注册 Web 扩展清单相关 Bean。
 *
 * <p>默认扫描包为 {@code io.github.xtemplus.webplugin}，可通过 {@code plugin.spring.web.scan-base-packages} 覆盖。
 *
 * <p>Java 后端插件由 {@code plugin-spring-starter} 提供。
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnClass(WebPluginFacade.class)
@EnableConfigurationProperties(PluginSpringWebProperties.class)
@Import(PluginWebComponentScanRegistrar.class)
@AutoConfigureAfter(PluginFrameworkAutoConfiguration.class)
public class PluginSpringWebAutoConfiguration {}
