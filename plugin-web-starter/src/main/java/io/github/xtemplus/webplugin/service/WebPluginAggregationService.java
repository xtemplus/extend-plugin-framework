package io.github.xtemplus.webplugin.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import io.github.xtemplus.webplugin.config.WebPluginProperties;
import io.github.xtemplus.webplugin.config.WebPluginsPathResolver;
import io.github.xtemplus.webplugin.dto.WebPluginDescriptor;
import io.github.xtemplus.webplugin.dto.WebPluginsResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class WebPluginAggregationService {

    private static final Logger LOG = LoggerFactory.getLogger(WebPluginAggregationService.class);

    private final WebPluginProperties properties;
    private final WebPluginDisabledIdsReader backendDisabledIdsReader;
    private final WebPluginUrlValidator urlValidator;
    private final WebPluginsPathResolver webPluginsPathResolver;
    private final WebPluginManifestScanCache manifestScanCache;

    public WebPluginAggregationService(
            WebPluginProperties properties,
            WebPluginDisabledIdsReader backendDisabledIdsReader,
            WebPluginUrlValidator urlValidator,
            WebPluginsPathResolver webPluginsPathResolver,
            WebPluginManifestScanCache manifestScanCache) {
        this.properties = properties;
        this.backendDisabledIdsReader = backendDisabledIdsReader;
        this.urlValidator = urlValidator;
        this.webPluginsPathResolver = webPluginsPathResolver;
        this.manifestScanCache = manifestScanCache;
    }

    public WebPluginsResponse buildResponse(String publicBase) {
        long t0 = System.nanoTime();
        WebPluginsResponse response = new WebPluginsResponse();
        response.setHostPluginApiVersion(properties.getHostPluginApiVersion());
        String base = normalizeBase(publicBase);
        Path webPluginsRootAbs = webPluginsPathResolver.getResolvedDirectory().toAbsolutePath().normalize();
        if (!Files.isDirectory(webPluginsRootAbs)) {
            LOG.warn("plugins web directory does not exist or is not a directory: {}", webPluginsRootAbs);
            logRequestSummary(0, 0, webPluginsRootAbs, t0, 0, 0, 0, 0, 0);
            return response;
        }

        int skipBackendDisabled = 0;
        int skipEntryUrlHostAllowlist = 0;
        int skipParseRejected = 0;
        int skipStylesheetAllowlist = 0;

        Set<String> disabledJarPluginIds = backendDisabledIdsReader.loadDisabledBackendPluginIds();
        List<WebPluginDescriptor> collected = new ArrayList<>();

        for (ScannedPluginEntry scan : manifestScanCache.getEntries()) {
            WebPluginDescriptor d = toDescriptor(scan, base);
            if (d == null) {
                skipParseRejected++;
                continue;
            }
            String backendId = d.getBackendPluginId();
            if (backendId != null
                    && !backendId.isEmpty()
                    && disabledJarPluginIds.contains(backendId)) {
                LOG.debug("skip frontend plugin {} (backend disabled: {})", d.getId(), backendId);
                skipBackendDisabled++;
                continue;
            }
            if (!urlValidator.isHttpPluginAssetUrlAllowed(d.getEntryUrl())) {
                LOG.warn("skip plugin {} entryUrl host not allowlisted: {}", d.getId(), d.getEntryUrl());
                skipEntryUrlHostAllowlist++;
                continue;
            }
            List<String> styleUrls = new ArrayList<>(d.getStylesheetUrls());
            d.getStylesheetUrls().clear();
            for (String sheet : styleUrls) {
                if (urlValidator.isHttpPluginAssetUrlAllowed(sheet)) {
                    d.getStylesheetUrls().add(sheet);
                } else {
                    skipStylesheetAllowlist++;
                    LOG.warn("skip stylesheet for {} (not allowlisted): {}", d.getId(), sheet);
                }
            }
            collected.add(d);
        }

        Map<String, WebPluginDescriptor> byId = new HashMap<>();
        for (WebPluginDescriptor d : collected) {
            String id = d.getId();
            if (id == null || id.isEmpty()) {
                continue;
            }
            WebPluginDescriptor existing = byId.get(id);
            if (existing == null || PluginVersionOrder.isNewer(d.getVersion(), existing.getVersion())) {
                byId.put(id, d);
            }
        }
        List<WebPluginDescriptor> merged =
                byId.values().stream()
                        .sorted(Comparator.comparingInt(WebPluginAggregationService::priority).reversed())
                        .collect(Collectors.toList());

        int max = Math.max(0, properties.getMaxPlugins());
        int truncated = 0;
        if (merged.size() > max) {
            truncated = merged.size() - max;
            LOG.warn("truncating frontend plugins from {} to max-plugins={}", merged.size(), max);
            merged = new ArrayList<>(merged.subList(0, max));
        }
        response.setPlugins(merged);
        logRequestSummary(
                merged.size(),
                collected.size(),
                webPluginsRootAbs,
                t0,
                skipBackendDisabled,
                skipEntryUrlHostAllowlist,
                skipParseRejected,
                skipStylesheetAllowlist,
                truncated);
        return response;
    }

    private static void logRequestSummary(
            int returned,
            int rawCollected,
            Path rootAbs,
            long t0Nanos,
            int skipBackendDisabled,
            int skipEntryUrlHostAllowlist,
            int skipParseRejected,
            int skipStylesheetAllowlist,
            int truncated) {
        long ms = (System.nanoTime() - t0Nanos) / 1_000_000L;
        LOG.info(
                "[web-plugin] request_summary returned={} raw_collected={} root={} duration_ms={} "
                        + "skipped_backendDisabled={} skipped_entryUrlHostAllowlist={} "
                        + "skipped_parseRejected={} skipped_stylesheetAllowlist={} truncated={}",
                returned,
                rawCollected,
                rootAbs,
                ms,
                skipBackendDisabled,
                skipEntryUrlHostAllowlist,
                skipParseRejected,
                skipStylesheetAllowlist,
                truncated);
    }

    private static int priority(WebPluginDescriptor p) {
        return p.getPriority() != null ? p.getPriority() : 0;
    }

    private WebPluginDescriptor toDescriptor(ScannedPluginEntry scan, String base) {
        if (scan.getId() == null || scan.getId().isEmpty()) {
            return null;
        }
        if (scan.getEntryRelative() == null || scan.getEntryRelative().isEmpty()) {
            return null;
        }
        String dirName = scan.getDirectoryName();
        String prefix = properties.getPluginsWebUrlPathPrefixWithSlashes();
        String entryUrl = joinUrl(base, prefix + dirName + "/" + scan.getEntryRelative());

        WebPluginDescriptor d = new WebPluginDescriptor();
        d.setId(scan.getId());
        d.setVersion(scan.getVersion());
        d.setName(scan.getName());
        d.setPriority(scan.getPriority());
        d.setBackendPluginId(scan.getBackendPluginId());
        d.setEntryUrl(entryUrl);
        d.setEngines(scan.getEngines());
        List<String> urls = new ArrayList<>();
        for (String rel : scan.getStyleRelatives()) {
            urls.add(joinUrl(base, prefix + dirName + "/" + rel));
        }
        d.setStylesheetUrls(urls);
        d.setContributions(scan.getContributions());
        return d;
    }

    private static String joinUrl(String base, String path) {
        String b = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        String p = path.startsWith("/") ? path : "/" + path;
        return b + p;
    }

    private static String normalizeBase(String publicBase) {
        if (publicBase == null || publicBase.isEmpty()) {
            return "";
        }
        return publicBase.endsWith("/")
                ? publicBase.substring(0, publicBase.length() - 1)
                : publicBase;
    }
}
