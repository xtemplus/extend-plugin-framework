package com.plugin.framework.core.support;

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
 * 从插件 jar（URLClassLoader）中列出类名的工具，用于约定式插件的包扫描。
 *
 * <p>仅处理 jar 协议 URL，仅收集 .class 且路径中不包含 '-' 的条目（排除内部类等）。
 */
public final class PluginClassLoaderScan {

    private static final Logger logger =
            Logger.getLogger(PluginClassLoaderScan.class.getName());

    private PluginClassLoaderScan() {}

    /**
     * 从 classLoader 背后的 jar 中列出指定包下的所有类名（不含子包，仅该包内 .class）。
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
            String prefix = basePackage.replace('.', '/') + "/";
            for (String className : allClassNames) {
                String path = className.replace('.', '/') + ".class";
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
            if (!"jar".equals(url.getProtocol())) {
                continue;
            }
            String path = url.getPath();
            if (path.startsWith("file:")) {
                path = path.substring(5);
            }
            int sep = path.indexOf("!/");
            if (sep > 0) {
                path = path.substring(0, sep);
            }
            try {
                try (JarFile jarFile = new JarFile(path)) {
                    Enumeration<JarEntry> entries = jarFile.entries();
                    while (entries.hasMoreElements()) {
                        JarEntry entry = entries.nextElement();
                        String name = entry.getName();
                        if (name.endsWith(".class") && !name.contains("-")) {
                            String className =
                                    name.substring(0, name.length() - 6).replace('/', '.');
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
}
