package io.github.xtemplus.webplugin.config;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Logs resolved {@code plugins/web} root and warns on misconfiguration at startup (after manifest scan
 * cache has been filled).
 */
@Component
@Order(100)
public class WebPluginStartupDiagnostics implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(WebPluginStartupDiagnostics.class);

    private final WebPluginProperties properties;
    private final WebPluginsPathResolver webPluginsPathResolver;

    public WebPluginStartupDiagnostics(
            WebPluginProperties properties, WebPluginsPathResolver webPluginsPathResolver) {
        this.properties = properties;
        this.webPluginsPathResolver = webPluginsPathResolver;
    }

    @Override
    public void run(ApplicationArguments args) {
        Path dir = webPluginsPathResolver.getResolvedDirectory();
        Path abs = dir.toAbsolutePath().normalize();
        if (!Files.isDirectory(abs)) {
            LOG.warn(
                    "[web-plugin] web-plugins-dir does not exist or is not a directory: {} - manifest "
                            + "list will be empty until it exists; check web-plugin.web-plugins-dir "
                            + "and JVM user.dir.",
                    abs);
        } else {
            LOG.info("[web-plugin] plugins web scan root: {}", abs);
        }

        List<String> allow = properties.getEntryUrlHostAllowlist();
        if (allow == null || allow.isEmpty()) {
            LOG.error(
                    "[web-plugin] entry-url-host-allowlist is empty - ALL plugin entryUrl and "
                            + "stylesheet URLs will be rejected. Set web-plugin.entry-url-host-allowlist "
                            + "in application.yml.");
        }
    }
}
