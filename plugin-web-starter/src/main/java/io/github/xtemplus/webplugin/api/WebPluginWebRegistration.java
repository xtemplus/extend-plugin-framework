package io.github.xtemplus.webplugin.api;

import java.nio.file.Path;

import io.github.xtemplus.webplugin.config.WebPluginProperties;
import io.github.xtemplus.webplugin.config.WebPluginsPathResolver;

import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;

/**
 * Helpers for host applications to register Spring MVC static resources and CORS in their own
 * {@link org.springframework.web.servlet.config.annotation.WebMvcConfigurer}. This SDK does not
 * register any HTTP mappings by itself.
 */
public final class WebPluginWebRegistration {

    private WebPluginWebRegistration() {}

    /**
     * Maps {@link WebPluginProperties#getPluginsWebResourceHandlerPattern()} to the resolved web
     * plugins directory on disk.
     */
    public static void registerStaticPlugins(
            ResourceHandlerRegistry registry,
            WebPluginsPathResolver pathResolver,
            WebPluginProperties properties) {
        Path dir = pathResolver.getResolvedDirectory();
        String location = dir.toUri().toASCIIString();
        if (!location.endsWith("/")) {
            location = location + "/";
        }
        registry
                .addResourceHandler(properties.getPluginsWebResourceHandlerPattern())
                .addResourceLocations(location);
    }

    /**
     * CORS for the configured list API path ({@link WebPluginProperties#getListPluginsApiPath()}).
     */
    public static void registerListApiCors(CorsRegistry registry, WebPluginProperties properties) {
        registry
                .addMapping(properties.getListPluginsApiPath())
                .allowedMethods("GET", "HEAD", "OPTIONS")
                .allowedOrigins(properties.getCorsAllowedOrigins().toArray(new String[0]));
    }
}
