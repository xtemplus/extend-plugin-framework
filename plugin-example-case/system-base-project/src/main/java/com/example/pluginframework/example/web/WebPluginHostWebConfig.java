package com.example.pluginframework.example.web;

import io.github.xtemplus.webplugin.api.WebPluginWebRegistration;
import io.github.xtemplus.webplugin.config.WebPluginProperties;
import io.github.xtemplus.webplugin.config.WebPluginsPathResolver;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 注册 Web 插件静态资源与清单接口 CORS；路径由 {@link WebPluginProperties} 驱动。
 */
@Configuration
public class WebPluginHostWebConfig implements WebMvcConfigurer {

    private final WebPluginsPathResolver pathResolver;
    private final WebPluginProperties webPluginProperties;

    public WebPluginHostWebConfig(WebPluginsPathResolver pathResolver, WebPluginProperties webPluginProperties) {
        this.pathResolver = pathResolver;
        this.webPluginProperties = webPluginProperties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        WebPluginWebRegistration.registerStaticPlugins(registry, pathResolver, webPluginProperties);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        WebPluginWebRegistration.registerListApiCors(registry, webPluginProperties);
    }
}
