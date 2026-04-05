package io.github.xtemplus.pluginframework.springweb.config;

import io.github.xtemplus.pluginframework.spring.config.PluginFrameworkAutoConfiguration;
import io.github.xtemplus.webplugin.api.WebPluginFacade;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

/**
 * 引入 {@code plugin-spring-web-starter} 时自动注册 Web 扩展清单相关 Bean（{@code io.github.xtemplus.webplugin}）。
 *
 * <p>Java 后端插件由 {@code plugin-spring-starter} 提供；本配置仅补齐 {@code plugin-web-starter} 所需的组件扫描，
 * 避免宿主再写 {@code @ComponentScan("io.github.xtemplus.webplugin")}。
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnClass(WebPluginFacade.class)
@ComponentScan(basePackageClasses = WebPluginFacade.class)
@AutoConfigureAfter(PluginFrameworkAutoConfiguration.class)
public class PluginSpringWebAutoConfiguration {}
