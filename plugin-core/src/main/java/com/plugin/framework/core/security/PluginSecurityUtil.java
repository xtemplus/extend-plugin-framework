package com.plugin.framework.core.security;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Objects;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * 插件 Jar 安全命名与校验工具。
 *
 * <p>基于 HMAC-SHA256 + 随机 nonce 生成安全 token，并在文件名中携带：
 *
 * <pre>
 *   {pluginName}-{version}-{secureToken}.jar
 * </pre>
 *
 * secureToken = nonceBase62 + signatureBase62 的截断字符串。
 */
public final class PluginSecurityUtil {

    private static final String DELIMITER = ":";

    private static final char[] BASE62 =
            "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".toCharArray();

    private static final SecureRandom RANDOM = new SecureRandom();

    private PluginSecurityUtil() {}

    /**
     * 生成安全的插件 Jar 文件名。
     *
     * @param pluginId 插件唯一标识（plugin.id）
     * @param pluginName 插件名称（展示名）
     * @param version 插件版本
     * @param secretKey HMAC 使用的对称密钥
     * @param nonceLength 随机因子长度（Base62 字符长度）
     * @param tokenLength 最终 token 总长度
     * @return 文件名（不含路径）
     */
    public static String generateSecureFileName(
            String pluginId,
            String pluginName,
            String version,
            String secretKey,
            int nonceLength,
            int tokenLength) {
        Objects.requireNonNull(pluginId, "pluginId");
        Objects.requireNonNull(pluginName, "pluginName");
        Objects.requireNonNull(version, "version");
        Objects.requireNonNull(secretKey, "secretKey");
        String nonce = randomBase62(nonceLength);
        String data = pluginId + DELIMITER + version + DELIMITER + nonce;
        String token = generateTokenInternal(data, secretKey, nonce, tokenLength);
        return pluginName + "-" + version + "-" + token + ".jar";
    }

    /**
     * 校验文件名与元数据是否匹配，并进行 HMAC 校验。
     *
     * @param fileName jar 文件名（不含路径）
     * @param pluginId 元数据中的 plugin.id
     * @param pluginName 元数据中的 plugin.name
     * @param version 元数据中的 plugin.version
     * @param secretKey HMAC 使用的对称密钥
     * @param nonceLength 随机因子长度（生成时的配置）
     * @param tokenLength token 总长度（生成时的配置）
     * @return 是否校验通过
     */
    public static boolean verifyFileNameAndMetadata(
            String fileName,
            String pluginId,
            String pluginName,
            String version,
            String secretKey,
            int nonceLength,
            int tokenLength) {
        Objects.requireNonNull(fileName, "fileName");
        Objects.requireNonNull(pluginId, "pluginId");
        Objects.requireNonNull(pluginName, "pluginName");
        Objects.requireNonNull(version, "version");
        Objects.requireNonNull(secretKey, "secretKey");
        if (!fileName.endsWith(".jar")) {
            return false;
        }
        String baseName = fileName.substring(0, fileName.length() - 4);
        String[] parts = baseName.split("-");
        if (parts.length < 3) {
            return false;
        }
        // 允许 pluginName 本身包含 '-'，因此从后往前解析 version 与 token
        String tokenFromFile = parts[parts.length - 1];
        String versionFromFile = parts[parts.length - 2];
        StringBuilder nameBuilder = new StringBuilder();
        for (int i = 0; i < parts.length - 2; i++) {
            if (i > 0) {
                nameBuilder.append("-");
            }
            nameBuilder.append(parts[i]);
        }
        String pluginNameFromFile = nameBuilder.toString();
        if (!pluginNameFromFile.equals(pluginName)) {
            return false;
        }
        if (!versionFromFile.equals(version)) {
            return false;
        }
        if (tokenFromFile.length() != tokenLength) {
            return false;
        }
        String nonce = tokenFromFile.substring(0, nonceLength);
        String data = pluginId + DELIMITER + version + DELIMITER + nonce;
        String expectedToken = generateTokenInternal(data, secretKey, nonce, tokenLength);
        return tokenFromFile.equals(expectedToken);
    }

    private static String generateTokenInternal(
            String data, String secretKey, String nonce, int tokenLength) {
        byte[] digest = hmacSha256(secretKey, data);
        String signatureBase62 = base62Encode(digest);
        String raw = nonce + signatureBase62;
        if (raw.length() <= tokenLength) {
            return raw;
        }
        return raw.substring(0, tokenLength);
    }

    private static byte[] hmacSha256(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec =
                    new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("failed to calculate HMAC-SHA256", e);
        }
    }

    private static String base62Encode(byte[] input) {
        if (input == null || input.length == 0) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        int value = 0;
        int bitCount = 0;
        for (byte b : input) {
            value = (value << 8) | (b & 0xFF);
            bitCount += 8;
            while (bitCount >= 6) {
                int index = (value >> (bitCount - 6)) & 0x3F;
                sb.append(BASE62[index % BASE62.length]);
                bitCount -= 6;
            }
        }
        if (bitCount > 0) {
            int index = (value << (6 - bitCount)) & 0x3F;
            sb.append(BASE62[index % BASE62.length]);
        }
        return sb.toString();
    }

    private static String randomBase62(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            int idx = RANDOM.nextInt(BASE62.length);
            sb.append(BASE62[idx]);
        }
        return sb.toString();
    }
}

