package io.github.xtemplus.webplugin.service;

/**
 * Compares plugin {@code version} strings for merge semantics: numeric dot-separated cores (SemVer-like)
 * compare per segment; optional {@code -prerelease} suffix compares lexicographically after the core.
 * Non-numeric segments fall back to {@link String#compareTo} for that segment. This is <strong>not</strong>
 * a full SemVer 2.0 comparator (no build metadata rules); it is deterministic and sufficient for typical
 * {@code x.y.z} plus simple tags.
 */
final class PluginVersionOrder {

    private PluginVersionOrder() {}

    /** True if {@code candidate} should replace {@code existing} when both refer to the same plugin id. */
    static boolean isNewer(String candidate, String existing) {
        if (candidate == null) {
            return false;
        }
        if (existing == null) {
            return true;
        }
        return compare(candidate, existing) > 0;
    }

    private static int compare(String a, String b) {
        String[] aParts = splitPrerelease(a);
        String[] bParts = splitPrerelease(b);
        int coreCmp = compareCore(aParts[0], bParts[0]);
        if (coreCmp != 0) {
            return coreCmp;
        }
        String ap = aParts.length > 1 ? aParts[1] : "";
        String bp = bParts.length > 1 ? bParts[1] : "";
        return comparePrerelease(ap, bp);
    }

    /** Empty prerelease (GA) is newer than any non-empty prerelease when cores are equal. */
    private static int comparePrerelease(String ap, String bp) {
        boolean ae = ap.isEmpty();
        boolean be = bp.isEmpty();
        if (ae && be) {
            return 0;
        }
        if (ae) {
            return 1;
        }
        if (be) {
            return -1;
        }
        return ap.compareTo(bp);
    }

    private static String[] splitPrerelease(String v) {
        int dash = v.indexOf('-');
        if (dash < 0) {
            return new String[] {v, ""};
        }
        return new String[] {v.substring(0, dash), v.substring(dash + 1)};
    }

    private static int compareCore(String a, String b) {
        String[] as = a.split("\\.");
        String[] bs = b.split("\\.");
        int n = Math.max(as.length, bs.length);
        for (int i = 0; i < n; i++) {
            String x = i < as.length ? as[i] : "0";
            String y = i < bs.length ? bs[i] : "0";
            Long xi = tryParseUnsignedLong(x);
            Long yi = tryParseUnsignedLong(y);
            if (xi != null && yi != null) {
                int c = Long.compare(xi, yi);
                if (c != 0) {
                    return c;
                }
            } else {
                int c = x.compareTo(y);
                if (c != 0) {
                    return c;
                }
            }
        }
        return 0;
    }

    private static Long tryParseUnsignedLong(String s) {
        if (s.isEmpty()) {
            return null;
        }
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c < '0' || c > '9') {
                return null;
            }
        }
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
