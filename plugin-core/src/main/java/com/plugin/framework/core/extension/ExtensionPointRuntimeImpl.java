package com.plugin.framework.core.extension;

import com.plugin.framework.core.contract.SchemaValidator;
import java.lang.reflect.Method;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.json.JSONObject;

/**
 * 扩展点运行时默认实现：查注册表、契约校验、进程内反射或 HTTP 调用。
 */
public final class ExtensionPointRuntimeImpl implements ExtensionPointRuntime {

    private final ExtensionPointRegistry registry;
    private final HttpClient httpClient;

    public ExtensionPointRuntimeImpl(ExtensionPointRegistry registry) {
        this(registry, HttpClient.newHttpClient());
    }

    public ExtensionPointRuntimeImpl(ExtensionPointRegistry registry, HttpClient httpClient) {
        this.registry = Objects.requireNonNull(registry, "registry");
        this.httpClient = httpClient != null ? httpClient : HttpClient.newHttpClient();
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
        if (impl.getType() == ExtensionPointImplementationType.BUILTIN) {
            return executeBuiltin(pointId, impl, inputMap);
        }
        if (impl.getType() == ExtensionPointImplementationType.HTTP) {
            return executeHttp(pointId, impl, inputMap);
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

    private Object executeHttp(
            String pointId,
            ExtensionPointImplementation impl,
            Map<String, Object> inputMap) throws Exception {
        String baseUrl = impl.getBaseUrl();
        if (baseUrl == null || baseUrl.isEmpty()) {
            throw new ExtensionPointRuntimeException(
                    "HTTP implementation missing baseUrl");
        }
        String body = mapToJson(inputMap);
        HttpRequest request =
                HttpRequest.newBuilder()
                        .uri(URI.create(baseUrl))
                        .header("Content-Type", "application/json; charset=UTF-8")
                        .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                        .build();
        HttpResponse<String> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new ExtensionPointRuntimeException(
                    "HTTP extension point returned " + response.statusCode() + ": " + response.body());
        }
        String responseBody = response.body();
        if (responseBody == null || responseBody.isEmpty()) {
            return null;
        }
        return new JSONObject(responseBody).toMap();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> toMap(Object o) {
        if (o == null) {
            return Map.of();
        }
        if (o instanceof Map) {
            return (Map<String, Object>) o;
        }
        return Map.of();
    }

    private static String mapToJson(Map<String, Object> map) {
        if (map == null || map.isEmpty()) {
            return "{}";
        }
        return new JSONObject(map).toString();
    }
}
