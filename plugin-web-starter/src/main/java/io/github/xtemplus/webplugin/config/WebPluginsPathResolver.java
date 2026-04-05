package io.github.xtemplus.webplugin.config;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Resolves the on-disk web plugins root regardless of JVM working directory (IDE / mvn from parent dir /
 * repo root). Candidate locations are driven by {@link WebPluginProperties#getPathResolutionCandidateRelativePaths()}.
 */
@Component
public class WebPluginsPathResolver {

    private static final Logger LOG = LoggerFactory.getLogger(WebPluginsPathResolver.class);

    private final Path resolvedDirectory;

    public WebPluginsPathResolver(WebPluginProperties properties) {
        this.resolvedDirectory = resolveDirectory(properties.getWebPluginsDir().trim(), properties);
    }

    public Path getResolvedDirectory() {
        return resolvedDirectory;
    }

    private static Path pathFromRelativeConfig(String rel) {
        String norm = rel.replace('\\', '/').trim();
        String[] parts = norm.split("/");
        Path p = Paths.get(parts[0]);
        for (int i = 1; i < parts.length; i++) {
            if (!parts[i].isEmpty()) {
                p = p.resolve(parts[i]);
            }
        }
        return p;
    }

    private Path resolveDirectory(String configured, WebPluginProperties properties) {
        String cfg =
                (configured == null || configured.isEmpty())
                        ? properties.getWebPluginsDirResolutionFallback().trim()
                        : configured;
        Path cfgPath = Paths.get(cfg);
        if (cfgPath.isAbsolute()) {
            Path n = cfgPath.normalize();
            logChosen(n, Files.isDirectory(n));
            return n;
        }

        Path cwd = Paths.get(System.getProperty("user.dir", ".")).toAbsolutePath().normalize();
        Path parent = cwd.getParent();
        List<String> rels = properties.getPathResolutionCandidateRelativePaths();
        Set<Path> candidates = new LinkedHashSet<>();

        for (String rel : rels) {
            Path fragment = pathFromRelativeConfig(rel);
            candidates.add(cwd.resolve(fragment).normalize());
            if (parent != null) {
                candidates.add(parent.resolve(fragment).normalize());
            }
        }
        candidates.add(cwd.resolve(cfgPath).normalize());

        Path cwdParentViaDotDot = cwd.resolve("..").normalize();
        for (String rel : rels) {
            candidates.add(cwdParentViaDotDot.resolve(pathFromRelativeConfig(rel)).normalize());
        }

        Path walk = cwd;
        for (int i = 0; i < 6 && walk != null; i++) {
            for (String rel : rels) {
                candidates.add(walk.resolve(pathFromRelativeConfig(rel)).normalize());
            }
            walk = walk.getParent();
        }

        List<Path> existing = new ArrayList<>();
        for (Path c : candidates) {
            if (Files.isDirectory(c)) {
                existing.add(c);
            }
        }
        if (!existing.isEmpty()) {
            Path best = existing.get(0);
            LOG.info("Using plugins web directory: {} (user.dir={})", best, cwd);
            return best;
        }

        Path fallback = cwd.resolve(cfgPath).normalize();
        LOG.warn(
                "No plugins web directory found; tried {} candidates from user.dir={}; fallback={}",
                candidates.size(),
                cwd,
                fallback);
        return fallback;
    }

    private static void logChosen(Path n, boolean exists) {
        LOG.info("Using absolute plugins web directory: {} (exists={})", n, exists);
    }
}
