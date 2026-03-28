package io.github.extend.plugin.core.support;

import io.github.extend.plugin.core.common.PluginConstants;

import java.net.URL;
import java.net.URLClassLoader;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * 插件 ClassLoader 扫描器：从插件 jar（URLClassLoader）中列出类名，用于约定式插件的包扫描。
 *
 * <p>支持 jar 与 file 协议 URL（插件加载时多为 file:/path/to/plugin.jar）；仅收集 .class 且路径中不包含 '-' 的条目（排除内部类等）。
 */
public final class PluginClassLoaderScanner {

    private static final Logger logger =
            Logger.getLogger(PluginClassLoaderScanner.class.getName());

    private PluginClassLoaderScanner() {}

    /**
     * 从 classLoader 背后的 jar 中列出指定包下的所有类名（含子包；仅收集 .class 且路径不含 '-' 的条目）。
     *
     * @param classLoader 插件 URLClassLoader
     * @param basePackages 要扫描的包名数组
     * @return 类全限定名列表
     */
    public static List<String> listClassNamesInPackages(
            ClassLoader classLoader, String[] basePackages) {
        Objects.requireNonNull(classLoader, "classLoader");
        if (basePackages == null || basePackages.length == 0) {
            return Collections.emptyList();
        }
        Set<String> allClassNames = listAllClassNamesFromJars(classLoader);
        if (allClassNames.isEmpty()) {
            return Collections.emptyList();
        }
        Set<String> result = new HashSet<>();
        for (String basePackage : basePackages) {
            if (basePackage == null || basePackage.isEmpty()) {
                continue;
            }
            String prefix =
                    basePackage.replace(PluginConstants.PACKAGE_SEPARATOR_CHAR, '/')
                            + PluginConstants.PATH_SEPARATOR;
            for (String className : allClassNames) {
                String path =
                        className.replace(PluginConstants.PACKAGE_SEPARATOR_CHAR, '/')
                                + PluginConstants.SUFFIX_CLASS;
                if (path.startsWith(prefix)) {
                    result.add(className);
                }
            }
        }
        return new ArrayList<>(result);
    }

    /**
     * 从 URLClassLoader 的 jar URL 中列出所有类名（不含包内子包，仅顶层 .class）。
     *
     * @param classLoader 通常为插件 jar 的 URLClassLoader
     * @return 类全限定名集合
     */
    public static Set<String> listAllClassNamesFromJars(ClassLoader classLoader) {
        if (!(classLoader instanceof URLClassLoader)) {
            return Collections.emptySet();
        }
        URLClassLoader urlClassLoader = (URLClassLoader) classLoader;
        Set<String> classNames = new HashSet<>();
        for (URL url : urlClassLoader.getURLs()) {
            String path = resolveJarPath(url);
            if (path == null) {
                continue;
            }
            try {
                try (JarFile jarFile = new JarFile(path)) {
                    Enumeration<JarEntry> entries = jarFile.entries();
                    while (entries.hasMoreElements()) {
                        JarEntry entry = entries.nextElement();
                        String name = entry.getName();
                        if (name.endsWith(PluginConstants.SUFFIX_CLASS)
                                && !name.contains(PluginConstants.DELIMITER_HYPHEN)) {
                            // 排除内部类等（含 '-' 的 class 名）
                            String className =
                                    name.substring(
                                                    0,
                                                    name.length() - PluginConstants.SUFFIX_CLASS.length())
                                            .replace(
                                                    PluginConstants.PATH_SEPARATOR.charAt(0),
                                                    PluginConstants.PACKAGE_SEPARATOR_CHAR);
                            classNames.add(className);
                        }
                    }
                }
            } catch (Exception e) {
                logger.log(
                        Level.WARNING,
                        "failed to list classes from jar: " + path,
                        e);
            }
        }
        return classNames;
    }

    /**
     * 从 URL 解析出本地 jar 文件路径。支持 jar:file:/path/to/x.jar!/ 与 file:/path/to/x.jar。
     * 插件加载时通常使用 file: 协议，约定式扫描需能解析出路径以便列出类。
     *
     * @param url URLClassLoader 中的 URL
     * @return 本地 jar 绝对路径，无法解析或非 jar 则 null
     */
    private static String resolveJarPath(URL url) {
        if (url == null) {
            return null;
        }
        String path = url.getPath();
        if (path == null) {
            return null;
        }
        if (PluginConstants.PROTOCOL_JAR.equals(url.getProtocol())) {
            if (path.startsWith(PluginConstants.PREFIX_FILE)) {
                path = path.substring(PluginConstants.PREFIX_FILE_LENGTH);
            }
            int sep = path.indexOf(PluginConstants.JAR_ENTRY_SEPARATOR);
            if (sep > 0) {
                path = path.substring(0, sep);
            }
        } else if (PluginConstants.PROTOCOL_FILE.equals(url.getProtocol())) {
            if (!path.endsWith(PluginConstants.SUFFIX_JAR)) {
                return null;
            }
            if (path.startsWith(PluginConstants.PREFIX_FILE)) {
                path = path.substring(PluginConstants.PREFIX_FILE_LENGTH);
            }
        } else {
            return null;
        }
        return path.isEmpty() ? null : path;
    }
}
