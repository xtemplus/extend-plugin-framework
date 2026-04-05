package io.github.xtemplus.webplugin.dto;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class WebPluginDescriptor {

    private String id;
    private String version;
    private String name;
    private Integer priority;
    private EnginesDto engines;
    private String entryUrl;
    private List<String> stylesheetUrls = new ArrayList<>();
    private String backendPluginId;
    private ContributionsDto contributions;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getPriority() {
        return priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public EnginesDto getEngines() {
        return engines;
    }

    public void setEngines(EnginesDto engines) {
        this.engines = engines;
    }

    public String getEntryUrl() {
        return entryUrl;
    }

    public void setEntryUrl(String entryUrl) {
        this.entryUrl = entryUrl;
    }

    public List<String> getStylesheetUrls() {
        return stylesheetUrls;
    }

    public void setStylesheetUrls(List<String> stylesheetUrls) {
        this.stylesheetUrls = stylesheetUrls;
    }

    public String getBackendPluginId() {
        return backendPluginId;
    }

    public void setBackendPluginId(String backendPluginId) {
        this.backendPluginId = backendPluginId;
    }

    public ContributionsDto getContributions() {
        return contributions;
    }

    public void setContributions(ContributionsDto contributions) {
        this.contributions = contributions;
    }
}
