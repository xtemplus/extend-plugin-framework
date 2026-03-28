package io.github.xtemplus.pluginframework.core.extension;

import io.github.xtemplus.pluginframework.core.common.ExtensionImplType;
import io.github.xtemplus.pluginframework.core.contract.SchemaValidator;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.json.JSONObject;

/**
 * 扩展点运行时的默认实现：基于注册表查找定义与实现，支持契约校验，以及进程内反射（BUILTIN）与
 * HTTP 远程调用两种执行方式。
 *
 * <p>宿主通过 {@link ExtensionPointRuntime#invoke(String, Object)} 或 {@link #invokeAll} 调用
 * 扩展点时，本实现负责 request schema 校验、按实现类型派发执行、response schema 校验并聚合结果。
 */
public final class DefaultExtensionPointRuntime implements ExtensionPointRuntime {

    private final ExtensionPointRegistry registry;

    /**
     * 构造默认运行时（HTTP 扩展点使用 {@link HttpURLConnection}）。
     *
     * @param registry 扩展点注册表
     */
    public DefaultExtensionPointRuntime(ExtensionPointRegistry registry) {
        this.registry = Objects.requireNonNull(registry, "registry");
    }

    @Override
    public Object invoke(String pointId, Object input) {
        List<Object> all = invokeAll(pointId, input);
        return all.isEmpty() ? null : all.get(0);
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<Object> invokeAll(String pointId, Object input) {
        Objects.requireNonNull(pointId, "pointId");
        Optional<ExtensionPointDefinition> defOpt = registry.getDefinition(pointId);
        ExtensionPointDefinition definition = defOpt.orElse(null);

        Map<String, Object> inputMap = toMap(input);
        if (definition != null && definition.hasRequestSchema()) {
            String inputJson = mapToJson(inputMap);
            List<String> errors = SchemaValidator.validate(definition.getRequestSchema(), inputJson);
            if (!errors.isEmpty()) {
                throw new ExtensionPointRuntimeException(
                        "request schema validation failed: " + String.join("; ", errors));
            }
        }

        List<ExtensionPointImplementation> impls = registry.getImplementations(pointId);
        List<Object> results = new ArrayList<>();
        for (ExtensionPointImplementation impl : impls) {
            try {
                Object result = execute(pointId, impl, inputMap);
                if (result == null) {
                    continue;
                }
                if (definition != null && definition.hasResponseSchema()) {
                    Map<String, Object> resultMap = toMap(result);
                    String resultJson = mapToJson(resultMap);
                    List<String> errors =
                            SchemaValidator.validate(definition.getResponseSchema(), resultJson);
                    if (!errors.isEmpty()) {
                        throw new ExtensionPointRuntimeException(
                                "response schema validation failed: " + String.join("; ", errors));
                    }
                }
                results.add(result);
            } catch (ExtensionPointRuntimeException e) {
                throw e;
            } catch (Exception e) {
                throw new ExtensionPointRuntimeException(
                        "extension point execution failed: " + impl.getPluginId(), e);
            }
        }
        return results;
    }

    @Override
    public Optional<ExtensionPointDefinition> getDefinition(String pointId) {
        return registry.getDefinition(pointId);
    }

    private Object execute(
            String pointId,
            ExtensionPointImplementation impl,
            Map<String, Object> inputMap) throws Exception {
        if (impl.getType() == ExtensionImplType.BUILTIN) {
            return executeBuiltin(pointId, impl, inputMap);
        }
        if (impl.getType() == ExtensionImplType.HTTP) {
            return executeHttp(impl, inputMap);
        }
        return null;
    }

    private Object executeBuiltin(
            String pointId,
            ExtensionPointImplementation impl,
            Map<String, Object> inputMap) throws Exception {
        ClassLoader loader = impl.getClassLoader();
        String handlerClass = impl.getHandlerClass();
        String handlerMethod = impl.getHandlerMethod();
        if (loader == null || handlerClass == null || handlerMethod == null) {
            throw new ExtensionPointRuntimeException(
                    "BUILTIN implementation missing classLoader/handlerClass/handlerMethod");
        }
        Class<?> clazz = Class.forName(handlerClass, true, loader);
        Object instance = clazz.getConstructor().newInstance();

        Method method = findHandlerMethod(clazz, handlerMethod);
        if (method == null) {
            throw new ExtensionPointRuntimeException(
                    "handler method not found: " + handlerClass + "#" + handlerMethod
                            + "(String, Map) or (Map)");
        }
        method.setAccessible(true);
        Object result;
        if (method.getParameterCount() == 2) {
            result = method.invoke(instance, pointId, inputMap);
        } else {
            result = method.invoke(instance, inputMap);
        }
        return result;
    }

    private static Method findHandlerMethod(Class<?> clazz, String methodName) {
        try {
            return clazz.getDeclaredMethod(methodName, String.class, Map.class);
        } catch (NoSuchMethodException e) {
            // ignore
        }
        try {
            return clazz.getDeclaredMethod(methodName, Map.class);
        } catch (NoSuchMethodException e) {
            return null;
        }
    }

    private Object executeHttp(ExtensionPointImplementation impl, Map<String, Object> inputMap)
            throws Exception {
        String baseUrl = impl.getBaseUrl();
        if (baseUrl == null || baseUrl.isEmpty()) {
            throw new ExtensionPointRuntimeException(
                    "HTTP implementation missing baseUrl");
        }
        String body = mapToJson(inputMap);
        URL url = new URL(baseUrl);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        conn.setFixedLengthStreamingMode(bytes.length);
        try (OutputStream os = conn.getOutputStream()) {
            os.write(bytes);
        }
        int code = conn.getResponseCode();
        InputStream stream = code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream();
        String responseBody = readUtf8Stream(stream);
        if (code < 200 || code >= 300) {
            throw new ExtensionPointRuntimeException(
                    "HTTP extension point returned " + code + ": " + responseBody);
        }
        if (responseBody == null || responseBody.isEmpty()) {
            return null;
        }
        return new JSONObject(responseBody).toMap();
    }

    private static String readUtf8Stream(InputStream stream) throws java.io.IOException {
        if (stream == null) {
            return "";
        }
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int r;
        while ((r = stream.read(buf)) != -1) {
            baos.write(buf, 0, r);
        }
        return baos.toString(StandardCharsets.UTF_8.name());
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> toMap(Object o) {
        if (o == null) {
            return Collections.emptyMap();
        }
        if (o instanceof Map) {
            return (Map<String, Object>) o;
        }
        return Collections.emptyMap();
    }

    private static String mapToJson(Map<String, Object> map) {
        if (map == null || map.isEmpty()) {
            return "{}";
        }
        return new JSONObject(map).toString();
    }
}
