package io.github.xtemplus.webplugin.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import io.github.xtemplus.webplugin.config.WebPluginProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Loads backend (JAR) plugin IDs that are marked disabled in {@code plugin-disabled.json} under the
 * configured main-app plugins directory. Format matches {@code SpringPluginManager} in {@code
 * plugin-spring-starter}: {@code entries} with {@code pluginId} and {@code targetFileName}; only
 * complete entries are accepted (same as framework restore logic). Does not start the main application.
 */
@Component
public class WebPluginDisabledIdsReader {

    private static final Logger LOG = LoggerFactory.getLogger(WebPluginDisabledIdsReader.class);

    private final WebPluginProperties properties;
    private final ObjectMapper objectMapper;

    public WebPluginDisabledIdsReader(WebPluginProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    /**
     * Returns disabled backend plugin IDs, or empty if workdir unset, file missing, or parse error.
     */
    public Set<String> loadDisabledBackendPluginIds() {
        String workdir = properties.getMainAppWorkdir();
        if (workdir == null || workdir.trim().isEmpty()) {
            return Collections.emptySet();
        }
        Path pluginsDir =
                Paths.get(workdir.trim())
                        .normalize()
                        .resolve(properties.getMainAppPluginsSubdir())
                        .normalize();
        Path file = pluginsDir.resolve(properties.getDisabledStateFileName());
        if (!Files.isRegularFile(file)) {
            return Collections.emptySet();
        }
        try (InputStream in = Files.newInputStream(file)) {
            Map<String, Object> root =
                    objectMapper.readValue(in, new TypeReference<Map<String, Object>>() {});
            @SuppressWarnings("unchecked")
            List<Map<String, String>> entries = (List<Map<String, String>>) root.get("entries");
            if (entries == null) {
                return Collections.emptySet();
            }
            Set<String> ids = new HashSet<>();
            for (Map<String, String> entry : entries) {
                String id = entry.get("pluginId");
                String targetFileName = entry.get("targetFileName");
                if (id != null
                        && !id.isEmpty()
                        && targetFileName != null
                        && !targetFileName.isEmpty()) {
                    ids.add(id);
                }
            }
            return ids;
        } catch (IOException e) {
            LOG.warn("failed to read disabled plugin ids from {}: {}", file, e.getMessage());
            return Collections.emptySet();
        }
    }
}
