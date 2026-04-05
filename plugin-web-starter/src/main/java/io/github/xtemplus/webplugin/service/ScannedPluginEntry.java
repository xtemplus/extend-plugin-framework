package io.github.xtemplus.webplugin.service;

import java.util.Collections;
import java.util.List;

import io.github.xtemplus.webplugin.dto.ContributionsDto;
import io.github.xtemplus.webplugin.dto.EnginesDto;

/** Immutable result of reading one plugin directory's {@code manifest.json} (no public URL base applied). */
public final class ScannedPluginEntry {

    private final String directoryName;
    private final String id;
    private final String version;
    private final String name;
    private final Integer priority;
    private final String backendPluginId;
    private final String entryRelative;
    private final List<String> styleRelatives;
    private final EnginesDto engines;
    private final ContributionsDto contributions;

    public ScannedPluginEntry(
            String directoryName,
            String id,
            String version,
            String name,
            Integer priority,
            String backendPluginId,
            String entryRelative,
            List<String> styleRelatives,
            EnginesDto engines,
            ContributionsDto contributions) {
        this.directoryName = directoryName;
        this.id = id;
        this.version = version;
        this.name = name;
        this.priority = priority;
        this.backendPluginId = backendPluginId;
        this.entryRelative = entryRelative;
        this.styleRelatives = Collections.unmodifiableList(styleRelatives);
        this.engines = engines;
        this.contributions = contributions;
    }

    public String getDirectoryName() {
        return directoryName;
    }

    public String getId() {
        return id;
    }

    public String getVersion() {
        return version;
    }

    public String getName() {
        return name;
    }

    public Integer getPriority() {
        return priority;
    }

    public String getBackendPluginId() {
        return backendPluginId;
    }

    public String getEntryRelative() {
        return entryRelative;
    }

    public List<String> getStyleRelatives() {
        return styleRelatives;
    }

    public EnginesDto getEngines() {
        return engines;
    }

    public ContributionsDto getContributions() {
        return contributions;
    }
}
