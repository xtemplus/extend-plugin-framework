package io.github.xtemplus.webplugin.service;

import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import io.github.xtemplus.webplugin.config.WebPluginProperties;
import io.github.xtemplus.webplugin.config.WebPluginsPathResolver;
import io.github.xtemplus.webplugin.dto.ContributionsDto;
import io.github.xtemplus.webplugin.dto.EnginesDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.stereotype.Component;

/**
 * Scans the web plugins root at startup (and on {@link #refresh()}) and caches parsed manifests. HTTP
 * handlers only apply {@code publicBase} and filtering, without re-reading the directory per request.
 */
@Component
public class WebPluginManifestScanCache implements InitializingBean {

    private static final Logger LOG = LoggerFactory.getLogger(WebPluginManifestScanCache.class);

    private final ObjectMapper objectMapper;
    private final WebPluginsPathResolver webPluginsPathResolver;
    private final WebPluginProperties webPluginProperties;

    private volatile List<ScannedPluginEntry> entries = Collections.emptyList();

    public WebPluginManifestScanCache(
            ObjectMapper objectMapper,
            WebPluginsPathResolver webPluginsPathResolver,
            WebPluginProperties webPluginProperties) {
        this.objectMapper = objectMapper;
        this.webPluginsPathResolver = webPluginsPathResolver;
        this.webPluginProperties = webPluginProperties;
    }

    @Override
    public void afterPropertiesSet() {
        refresh();
    }

    /** Reload manifests from disk (same rules as initial startup scan). */
    public synchronized void refresh() {
        Path root = webPluginsPathResolver.getResolvedDirectory().toAbsolutePath().normalize();
        if (!Files.isDirectory(root)) {
            LOG.warn("[web-plugin] manifest_scan skipped: not a directory: {}", root);
            entries = Collections.emptyList();
            return;
        }

        List<ScannedPluginEntry> list = new ArrayList<>();
        int skipInvalid = 0;
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(root)) {
            for (Path child : stream) {
                if (!Files.isDirectory(child)) {
                    continue;
                }
                Path manifestPath = child.resolve(webPluginProperties.getManifestFileName());
                if (!Files.isRegularFile(manifestPath)) {
                    continue;
                }
                try {
                    ScannedPluginEntry e = parseManifest(child, manifestPath);
                    if (e != null) {
                        list.add(e);
                    } else {
                        skipInvalid++;
                    }
                } catch (Exception ex) {
                    skipInvalid++;
                    LOG.warn("skip invalid manifest at {}: {}", manifestPath, ex.toString());
                }
            }
        } catch (IOException ex) {
            LOG.warn("failed to scan plugins web directory: {}", ex.toString());
            entries = Collections.emptyList();
            return;
        }

        entries = Collections.unmodifiableList(list);
        LOG.info(
                "[web-plugin] manifest_scan cached_plugins={} root={} skipped_invalid={}",
                list.size(),
                root,
                skipInvalid);
    }

    public List<ScannedPluginEntry> getEntries() {
        return entries;
    }

    private ScannedPluginEntry parseManifest(Path pluginDir, Path manifestPath) throws IOException {
        JsonNode root = objectMapper.readTree(manifestPath.toFile());
        String id = text(root, "id");
        if (id == null || id.isEmpty()) {
            LOG.warn("manifest missing id: {}", manifestPath);
            return null;
        }
        String entry = text(root, "entry");
        if (entry == null || entry.isEmpty()) {
            LOG.warn("manifest missing entry: {}", manifestPath);
            return null;
        }
        String entryNorm = entry.replace('\\', '/');
        if (!PluginRelativePaths.isSafeRelativeResourcePath(entryNorm)) {
            LOG.warn("manifest entry path not allowed (must be relative, no '..'): {} in {}", entry, manifestPath);
            return null;
        }

        String dirName = pluginDir.getFileName().toString();
        Integer priority = null;
        if (root.hasNonNull("priority") && root.get("priority").canConvertToInt()) {
            priority = root.get("priority").asInt();
        }

        EnginesDto engines = null;
        JsonNode enginesNode = root.get("engines");
        if (enginesNode != null && enginesNode.hasNonNull("host")) {
            engines = new EnginesDto();
            engines.setHost(enginesNode.get("host").asText());
        }

        List<String> styleRelatives = new ArrayList<>();
        JsonNode styles = root.get("styles");
        if (styles != null && styles.isArray()) {
            for (JsonNode n : styles) {
                if (n.isTextual()) {
                    String rel = n.asText().replace('\\', '/');
                    if (PluginRelativePaths.isSafeRelativeResourcePath(rel)) {
                        styleRelatives.add(rel);
                    } else {
                        LOG.warn(
                                "skip unsafe stylesheet path in {} for plugin {}: {}",
                                manifestPath,
                                id,
                                rel);
                    }
                }
            }
        }

        ContributionsDto contributions = null;
        JsonNode contrib = root.get("contributions");
        if (contrib != null && contrib.isObject()) {
            contributions = new ContributionsDto();
            contributions.setMenu(bool(contrib, "menu"));
            contributions.setRoutes(bool(contrib, "routes"));
            contributions.setSlots(bool(contrib, "slots"));
            contributions.setButtons(bool(contrib, "buttons"));
            contributions.setAssetInjection(bool(contrib, "assetInjection"));
        }

        return new ScannedPluginEntry(
                dirName,
                id,
                text(root, "version"),
                text(root, "name"),
                priority,
                text(root, "backendPluginId"),
                entryNorm,
                styleRelatives,
                engines,
                contributions);
    }

    private static Boolean bool(JsonNode o, String field) {
        JsonNode n = o.get(field);
        if (n == null || n.isNull()) {
            return null;
        }
        return n.asBoolean();
    }

    private static String text(JsonNode root, String field) {
        JsonNode n = root.get(field);
        if (n == null || n.isNull()) {
            return null;
        }
        return n.asText(null);
    }
}
