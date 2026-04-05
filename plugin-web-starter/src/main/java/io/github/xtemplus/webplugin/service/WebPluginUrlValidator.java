package io.github.xtemplus.webplugin.service;

import java.net.URI;
import java.util.List;
import java.util.Locale;

import io.github.xtemplus.webplugin.config.WebPluginProperties;

import org.springframework.stereotype.Component;

/**
 * Validates absolute {@code http}/{@code https} URLs built for plugin entry scripts and stylesheets:
 * scheme must be http(s), host must match {@link WebPluginProperties#getEntryUrlHostAllowlist()}
 * (exact
 * match, case-insensitive). Protocol-relative URLs ({@code //host}) are rejected.
 */
@Component
public class WebPluginUrlValidator {

    private final WebPluginProperties properties;

    public WebPluginUrlValidator(WebPluginProperties properties) {
        this.properties = properties;
    }

    /**
     * Whether {@code absoluteUrl} is an allowed http(s) URL whose host appears in {@code
     * entry-url-host-allowlist}. Used for both {@code entryUrl} and stylesheet URLs.
     */
    public boolean isHttpPluginAssetUrlAllowed(String absoluteUrl) {
        if (absoluteUrl == null || absoluteUrl.isEmpty()) {
            return false;
        }
        if (absoluteUrl.startsWith("//")) {
            return false;
        }
        URI uri;
        try {
            uri = URI.create(absoluteUrl);
        } catch (IllegalArgumentException e) {
            return false;
        }
        if (uri.getScheme() == null
                || !("http".equalsIgnoreCase(uri.getScheme())
                        || "https".equalsIgnoreCase(uri.getScheme()))) {
            return false;
        }
        String host = uri.getHost();
        if (host == null || host.isEmpty()) {
            return false;
        }
        List<String> allow = properties.getEntryUrlHostAllowlist();
        if (allow == null || allow.isEmpty()) {
            return false;
        }
        String hostLower = host.toLowerCase(Locale.ROOT);
        for (String allowed : allow) {
            if (allowed != null && hostLower.equals(allowed.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }
}
