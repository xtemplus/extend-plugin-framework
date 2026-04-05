package io.github.xtemplus.webplugin.service;

/** Rejects path traversal and absolute paths in manifest {@code entry} / {@code styles} values. */
final class PluginRelativePaths {

    private PluginRelativePaths() {}

    static boolean isSafeRelativeResourcePath(String raw) {
        if (raw == null || raw.isEmpty()) {
            return false;
        }
        String p = raw.replace('\\', '/');
        if (p.startsWith("/")) {
            return false;
        }
        for (String seg : p.split("/")) {
            if (seg.isEmpty() || ".".equals(seg) || "..".equals(seg)) {
                return false;
            }
        }
        return true;
    }
}
