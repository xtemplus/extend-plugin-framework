package io.github.xtemplus.webplugin.api;

import javax.servlet.http.HttpServletRequest;

import io.github.xtemplus.webplugin.config.WebPluginProperties;
import io.github.xtemplus.webplugin.dto.WebPluginsResponse;
import io.github.xtemplus.webplugin.service.WebPluginAggregationService;
import io.github.xtemplus.webplugin.service.WebPluginManifestScanCache;

import org.springframework.stereotype.Service;

/**
 * Primary entry point for host applications: build the plugin list payload and refresh the manifest
 * cache. This SDK does not expose HTTP; call from the host's own controllers.
 */
@Service
public class WebPluginFacade {

    private final WebPluginAggregationService aggregationService;
    private final WebPluginProperties properties;
    private final WebPluginManifestScanCache manifestScanCache;

    public WebPluginFacade(
            WebPluginAggregationService aggregationService,
            WebPluginProperties properties,
            WebPluginManifestScanCache manifestScanCache) {
        this.aggregationService = aggregationService;
        this.properties = properties;
        this.manifestScanCache = manifestScanCache;
    }

    /** Builds the response using an explicit public base URL (e.g. from gateway headers). */
    public WebPluginsResponse listPlugins(String publicBaseUrl) {
        return aggregationService.buildResponse(publicBaseUrl);
    }

    /** Builds the response using {@link #resolvePublicBase(HttpServletRequest)}. */
    public WebPluginsResponse listPluginsForRequest(HttpServletRequest request) {
        return listPlugins(resolvePublicBase(request));
    }

    /**
     * Resolves the URL prefix for plugin assets: {@code web-plugin.public-base-url} if set, else
     * from the current request (scheme, host, port, context path).
     */
    public String resolvePublicBase(HttpServletRequest request) {
        String configured = properties.getPublicBaseUrl();
        if (configured != null && !configured.trim().isEmpty()) {
            return stripTrailingSlashes(configured.trim());
        }
        String scheme = request.getScheme();
        String host = request.getServerName();
        int port = request.getServerPort();
        String context = request.getContextPath();
        if (context == null) {
            context = "";
        }
        StringBuilder sb = new StringBuilder();
        sb.append(scheme).append("://").append(host);
        if (needPort(scheme, port)) {
            sb.append(':').append(port);
        }
        sb.append(context);
        return sb.toString();
    }

    /** Reloads manifests from disk into {@link WebPluginManifestScanCache}. */
    public void refreshManifestCache() {
        manifestScanCache.refresh();
    }

    private static String stripTrailingSlashes(String s) {
        int end = s.length();
        while (end > 0 && s.charAt(end - 1) == '/') {
            end--;
        }
        return s.substring(0, end);
    }

    private static boolean needPort(String scheme, int port) {
        if ("http".equalsIgnoreCase(scheme)) {
            return port != 80;
        }
        if ("https".equalsIgnoreCase(scheme)) {
            return port != 443;
        }
        return true;
    }
}
