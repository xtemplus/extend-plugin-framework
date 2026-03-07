package com.plugin.framework.core.registry;

import com.plugin.framework.core.runtime.PluginMetadata;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 基于 JSON 文本文件的插件注册表管理器。
 *
 * <p>负责维护当前激活的插件版本与其 Jar 文件名，并支持更新与持久化。当前实现仅用于单机场景。
 *
 * <p>JSON 解析实现为最小化定制，仅支持当前固定结构：
 *
 * <pre>
 * {
 *   "plugins": [ { ... }, { ... } ]
 * }
 * </pre>
 */
public final class PluginRegistryManager {

    private static final Logger LOGGER = Logger.getLogger(PluginRegistryManager.class.getName());

    private static final String STATUS_ACTIVE = "ACTIVE";

    private static final Pattern OBJECT_PATTERN =
            Pattern.compile("\\{([^{}]*)\\}", Pattern.DOTALL);

    private static final Pattern FIELD_PATTERN =
            Pattern.compile("\"(pluginId|pluginName|version|jarFileName|checksumSha256|status|"
                    + "lastUpdateTime|remarks)\"\\s*:\\s*\"(.*?)\"");

    private final Path registryFile;

    private final Map<String, PluginRegistryEntry> entriesByPluginId =
            new ConcurrentHashMap<>();

    public PluginRegistryManager(Path registryFile) {
        this.registryFile = Objects.requireNonNull(registryFile, "registryFile");
        loadFromFile();
    }

    /** @return 所有注册表条目（只读） */
    public List<PluginRegistryEntry> getAllEntries() {
        return Collections.unmodifiableList(new ArrayList<>(entriesByPluginId.values()));
    }

    /**
     * 按插件 ID 查找条目。
     *
     * @param pluginId 插件 ID
     * @return 条目，不存在则 empty
     */
    public Optional<PluginRegistryEntry> findByPluginId(String pluginId) {
        Objects.requireNonNull(pluginId, "pluginId");
        return Optional.ofNullable(entriesByPluginId.get(pluginId));
    }

    /**
     * 新增或更新一条激活状态条目（加载插件成功后调用）。
     *
     * @param metadata 插件元数据
     * @param jarFile 插件 jar 路径
     * @param remarks 备注，可为 null
     */
    public synchronized void upsertActiveEntry(
            PluginMetadata metadata, Path jarFile, String remarks) {
        Objects.requireNonNull(metadata, "metadata");
        Objects.requireNonNull(jarFile, "jarFile");
        String pluginId = metadata.getId();
        String pluginName = metadata.getName();
        String version = metadata.getVersion();
        String jarFileName = jarFile.getFileName().toString();
        String checksumSha256;
        try {
            byte[] bytes = Files.readAllBytes(jarFile);
            checksumSha256 = sha256Hex(bytes);
        } catch (IOException e) {
            LOGGER.log(
                    Level.WARNING,
                    "failed to calculate checksum for plugin jar: " + jarFile,
                    e);
            checksumSha256 = null;
        }
        PluginRegistryEntry entry =
                new PluginRegistryEntry(
                        pluginId,
                        pluginName,
                        version,
                        jarFileName,
                        checksumSha256,
                        STATUS_ACTIVE,
                        Instant.now(),
                        remarks);
        entriesByPluginId.put(pluginId, entry);
        persistToFile();
    }

    /**
     * 移除指定插件的注册表条目。
     *
     * @param pluginId 插件 ID
     */
    public synchronized void removeEntry(String pluginId) {
        Objects.requireNonNull(pluginId, "pluginId");
        entriesByPluginId.remove(pluginId);
        persistToFile();
    }

    private void loadFromFile() {
        if (!Files.exists(registryFile)) {
            return;
        }
        try {
            String content = Files.readString(registryFile, StandardCharsets.UTF_8);
            if (content.isEmpty()) {
                return;
            }
            // 仅匹配一层花括号，适用于当前扁平 JSON 结构（plugins 数组内对象无嵌套）
            Matcher objectMatcher = OBJECT_PATTERN.matcher(content);
            while (objectMatcher.find()) {
                String objectBody = objectMatcher.group(1);
                Matcher fieldMatcher = FIELD_PATTERN.matcher(objectBody);
                String pluginId = null;
                String pluginName = null;
                String version = null;
                String jarFileName = null;
                String checksumSha256 = null;
                String status = STATUS_ACTIVE;
                String timeStr = null;
                String remarks = null;
                while (fieldMatcher.find()) {
                    String field = fieldMatcher.group(1);
                    String value = unescapeJson(fieldMatcher.group(2));
                    switch (field) {
                        case "pluginId" -> pluginId = value;
                        case "pluginName" -> pluginName = value;
                        case "version" -> version = value;
                        case "jarFileName" -> jarFileName = value;
                        case "checksumSha256" -> checksumSha256 = value;
                        case "status" -> status = value;
                        case "lastUpdateTime" -> timeStr = value;
                        case "remarks" -> remarks = value;
                        default -> {
                            // 忽略未知字段
                        }
                    }
                }
                if (pluginId == null
                        || pluginName == null
                        || version == null
                        || jarFileName == null) {
                    continue;
                }
                Instant lastUpdateTime =
                        timeStr != null ? Instant.parse(timeStr) : Instant.now();
                PluginRegistryEntry entry =
                        new PluginRegistryEntry(
                                pluginId,
                                pluginName,
                                version,
                                jarFileName,
                                checksumSha256,
                                status,
                                lastUpdateTime,
                                remarks);
                entriesByPluginId.put(pluginId, entry);
            }
        } catch (Exception e) {
            LOGGER.log(
                    Level.WARNING,
                    "failed to load plugin registry from json: " + registryFile,
                    e);
        }
    }

    private void persistToFile() {
        try {
            List<PluginRegistryEntry> entries =
                    new ArrayList<>(entriesByPluginId.values());
            StringBuilder sb = new StringBuilder();
            sb.append("{\"plugins\":[");
            for (int i = 0; i < entries.size(); i++) {
                PluginRegistryEntry entry = entries.get(i);
                if (i > 0) {
                    sb.append(',');
                }
                sb.append('{');
                appendField(sb, "pluginId", entry.getPluginId());
                sb.append(',');
                appendField(sb, "pluginName", entry.getPluginName());
                sb.append(',');
                appendField(sb, "version", entry.getVersion());
                sb.append(',');
                appendField(sb, "jarFileName", entry.getJarFileName());
                sb.append(',');
                appendField(sb, "checksumSha256", entry.getChecksumSha256());
                sb.append(',');
                appendField(sb, "status", entry.getStatus());
                sb.append(',');
                appendField(sb, "lastUpdateTime", entry.getLastUpdateTime().toString());
                sb.append(',');
                appendField(sb, "remarks", entry.getRemarks());
                sb.append('}');
            }
            sb.append("]}");
            Path parent = registryFile.getParent();
            if (parent != null && !Files.exists(parent)) {
                Files.createDirectories(parent);
            }
            Files.writeString(registryFile, sb.toString(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            LOGGER.log(
                    Level.WARNING,
                    "failed to persist plugin registry to json: " + registryFile,
                    e);
        }
    }

    private static String sha256Hex(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(bytes);
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                String hex = Integer.toHexString(b & 0xFF);
                if (hex.length() == 1) {
                    sb.append('0');
                }
                sb.append(hex);
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    private static void appendField(StringBuilder sb, String name, String value) {
        sb.append('"').append(name).append('"').append(':').append('"');
        if (value != null) {
            sb.append(escapeJson(value));
        }
        // value 为 null 时输出空字符串
        sb.append('"');
    }

    private static String escapeJson(String value) {
        StringBuilder sb = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '\\' -> sb.append("\\\\");
                case '"' -> sb.append("\\\"");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> sb.append(c);
            }
        }
        return sb.toString();
    }

    private static String unescapeJson(String value) {
        StringBuilder sb = new StringBuilder(value.length());
        boolean escaping = false;
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (!escaping) {
                if (c == '\\') {
                    escaping = true;
                } else {
                    sb.append(c);
                }
            } else {
                switch (c) {
                    case '\\' -> sb.append('\\');
                    case '"' -> sb.append('"');
                    case 'b' -> sb.append('\b');
                    case 'f' -> sb.append('\f');
                    case 'n' -> sb.append('\n');
                    case 'r' -> sb.append('\r');
                    case 't' -> sb.append('\t');
                    default -> sb.append(c);
                }
                escaping = false;
            }
        }
        return sb.toString();
    }
}

