package com.plugin.framework.core.common;

/**
 * 插件框架通用常量，用于路径、协议、分隔符等，避免魔法字符串。
 *
 * <p>命名规范：文件/协议相关用名词，分隔符用 DELIMITER_ 或 SUFFIX_ 前缀。
 */
public final class PluginConstants {

    private PluginConstants() {}

    // ---------- 文件与扩展名 ----------
    /** Jar 文件后缀。 */
    public static final String SUFFIX_JAR = ".jar";

    /** 类文件后缀。 */
    public static final String SUFFIX_CLASS = ".class";

    /** 插件目录下激活 jar 的 glob 匹配模式。 */
    public static final String GLOB_JAR_FILES = "*" + SUFFIX_JAR;

    /** 插件元数据在 jar 内的路径。 */
    public static final String METADATA_PATH = "META-INF/plugin.properties";

    // ---------- 路径与协议 ----------
    /** URL/路径分隔符。 */
    public static final String PATH_SEPARATOR = "/";

    /** 包名分隔符（Java 包）。 */
    public static final char PACKAGE_SEPARATOR_CHAR = '.';

    /** Jar URL 内部分隔符（jar:file:/path/to/x.jar!/）。 */
    public static final String JAR_ENTRY_SEPARATOR = "!/";

    /** file 协议前缀。 */
    public static final String PREFIX_FILE = "file:";

    /** file 协议前缀长度，用于 substring 截掉前缀。 */
    public static final int PREFIX_FILE_LENGTH = 5;

    /** URL 协议：jar。 */
    public static final String PROTOCOL_JAR = "jar";

    /** URL 协议：file。 */
    public static final String PROTOCOL_FILE = "file";

    // ---------- 目录与命名 ----------
    /** 停用插件存放子目录名。 */
    public static final String DISABLED_SUBDIR = "disabled";

    /** 上传临时文件前缀（后缀为时间戳 + .jar）。 */
    public static final String UPLOAD_TEMP_PREFIX = "upload-";

    // ---------- 分隔符 ----------
    /** 逗号分隔符（如 plugin.scan.packages）。 */
    public static final String DELIMITER_COMMA = ",";

    /** 安全 token 内字段分隔符（HMAC 数据拼接）。 */
    public static final String DELIMITER_SECURITY = ":";

    /** 文件名中 name-version-token 的分隔符。 */
    public static final String DELIMITER_HYPHEN = "-";

    /** Bean 名中 pluginId 与类名的分隔符（如 pluginId#className）。 */
    public static final String BEAN_NAME_SEPARATOR = "#";
}
