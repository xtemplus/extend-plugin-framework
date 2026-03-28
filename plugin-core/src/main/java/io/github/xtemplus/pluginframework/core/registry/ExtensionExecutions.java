package io.github.xtemplus.pluginframework.core.registry;

import io.github.xtemplus.pluginframework.core.spi.ExtensionPoint;
import io.github.xtemplus.pluginframework.core.support.ExtensionFailurePolicy;
import io.github.xtemplus.pluginframework.core.support.TypeReference;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * 扩展点排序与执行实现；仅供 {@link ExtensionRegistry} 的 default 方法委托，宿主请使用 {@code registry.xxx(...)}。
 */
final class ExtensionExecutions {

    private ExtensionExecutions() {}

    static List<ExtensionPoint<?, ?>> orderedExtensions(
            ExtensionRegistry registry, String pointId, Object context) {
        Objects.requireNonNull(registry, "registry");
        List<ExtensionPoint<?, ?>> raw =
                new ArrayList<>(registry.getExtensions(pointId, context));
        if (raw.isEmpty()) {
            return Collections.emptyList();
        }
        List<Integer> indices =
                IntStream.range(0, raw.size())
                        .boxed()
                        .sorted(
                                Comparator.comparingInt((Integer i) -> raw.get(i).getOrder())
                                        .thenComparingInt(i -> i))
                        .collect(Collectors.toList());
        List<ExtensionPoint<?, ?>> out = new ArrayList<>(raw.size());
        for (int i : indices) {
            out.add(raw.get(i));
        }
        return Collections.unmodifiableList(out);
    }

    static Optional<ExtensionPoint<?, ?>> firstExtension(
            ExtensionRegistry registry, String pointId, Object context) {
        List<ExtensionPoint<?, ?>> list = orderedExtensions(registry, pointId, context);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    static <T> Optional<T> executeFirst(
            ExtensionRegistry registry,
            String pointId,
            Object context,
            Class<T> resultType,
            ExtensionFailurePolicy policy) {
        Objects.requireNonNull(resultType, "resultType");
        Objects.requireNonNull(policy, "policy");
        Optional<ExtensionPoint<?, ?>> first = firstExtension(registry, pointId, context);
        if (!first.isPresent()) {
            return Optional.empty();
        }
        Object out;
        try {
            out = executeUnchecked(first.get(), context);
        } catch (RuntimeException e) {
            if (policy == ExtensionFailurePolicy.SKIP_ON_FAILURE) {
                return Optional.empty();
            }
            throw e;
        }
        if (out == null || !resultType.isInstance(out)) {
            return Optional.empty();
        }
        return Optional.of(resultType.cast(out));
    }

    static <T> Optional<T> executeFirst(
            ExtensionRegistry registry,
            String pointId,
            Object context,
            TypeReference<T> resultType,
            ExtensionFailurePolicy policy) {
        Objects.requireNonNull(resultType, "resultType");
        Objects.requireNonNull(policy, "policy");
        Class<?> raw = resultType.getRawType();
        Optional<ExtensionPoint<?, ?>> first = firstExtension(registry, pointId, context);
        if (!first.isPresent()) {
            return Optional.empty();
        }
        Object out;
        try {
            out = executeUnchecked(first.get(), context);
        } catch (RuntimeException e) {
            if (policy == ExtensionFailurePolicy.SKIP_ON_FAILURE) {
                return Optional.empty();
            }
            throw e;
        }
        if (out == null || !raw.isInstance(out)) {
            return Optional.empty();
        }
        return Optional.of(resultType.cast(out));
    }

    /** 不做类型校验；扩展返回 {@code null} 时为 {@code Optional.empty()}。 */
    static Optional<Object> executeFirst(
            ExtensionRegistry registry,
            String pointId,
            Object context,
            ExtensionFailurePolicy policy) {
        Objects.requireNonNull(policy, "policy");
        Optional<ExtensionPoint<?, ?>> first = firstExtension(registry, pointId, context);
        if (!first.isPresent()) {
            return Optional.empty();
        }
        try {
            Object out = executeUnchecked(first.get(), context);
            return Optional.ofNullable(out);
        } catch (RuntimeException e) {
            if (policy == ExtensionFailurePolicy.SKIP_ON_FAILURE) {
                return Optional.empty();
            }
            throw e;
        }
    }

    static <T> List<T> executeAll(
            ExtensionRegistry registry,
            String pointId,
            Object context,
            Class<T> resultType,
            ExtensionFailurePolicy policy) {
        Objects.requireNonNull(resultType, "resultType");
        Objects.requireNonNull(policy, "policy");
        List<ExtensionPoint<?, ?>> ordered = orderedExtensions(registry, pointId, context);
        if (ordered.isEmpty()) {
            return Collections.emptyList();
        }
        List<T> results = new ArrayList<>();
        for (ExtensionPoint<?, ?> ext : ordered) {
            Object out;
            try {
                out = executeUnchecked(ext, context);
            } catch (RuntimeException e) {
                if (policy == ExtensionFailurePolicy.FAIL_FAST) {
                    throw e;
                }
                continue;
            }
            if (out == null || !resultType.isInstance(out)) {
                if (policy == ExtensionFailurePolicy.FAIL_FAST) {
                    throw new IllegalStateException(
                            "extension returned null or wrong type for pointId="
                                    + pointId
                                    + " impl="
                                    + ext.getClass().getName());
                }
                continue;
            }
            results.add(resultType.cast(out));
        }
        return Collections.unmodifiableList(results);
    }

    static <T> List<T> executeAll(
            ExtensionRegistry registry,
            String pointId,
            Object context,
            TypeReference<T> resultType,
            ExtensionFailurePolicy policy) {
        Objects.requireNonNull(resultType, "resultType");
        Objects.requireNonNull(policy, "policy");
        Class<?> raw = resultType.getRawType();
        List<ExtensionPoint<?, ?>> ordered = orderedExtensions(registry, pointId, context);
        if (ordered.isEmpty()) {
            return Collections.emptyList();
        }
        List<T> results = new ArrayList<>();
        for (ExtensionPoint<?, ?> ext : ordered) {
            Object out;
            try {
                out = executeUnchecked(ext, context);
            } catch (RuntimeException e) {
                if (policy == ExtensionFailurePolicy.FAIL_FAST) {
                    throw e;
                }
                continue;
            }
            if (out == null || !raw.isInstance(out)) {
                if (policy == ExtensionFailurePolicy.FAIL_FAST) {
                    throw new IllegalStateException(
                            "extension returned null or wrong type for pointId="
                                    + pointId
                                    + " impl="
                                    + ext.getClass().getName());
                }
                continue;
            }
            results.add(resultType.cast(out));
        }
        return Collections.unmodifiableList(results);
    }

    /** 不做类型校验；列表元素可为 {@code null}（扩展返回 null 时仍会加入）。 */
    static List<Object> executeAll(
            ExtensionRegistry registry,
            String pointId,
            Object context,
            ExtensionFailurePolicy policy) {
        Objects.requireNonNull(policy, "policy");
        List<ExtensionPoint<?, ?>> ordered = orderedExtensions(registry, pointId, context);
        if (ordered.isEmpty()) {
            return Collections.emptyList();
        }
        List<Object> results = new ArrayList<>();
        for (ExtensionPoint<?, ?> ext : ordered) {
            try {
                results.add(executeUnchecked(ext, context));
            } catch (RuntimeException e) {
                if (policy == ExtensionFailurePolicy.FAIL_FAST) {
                    throw e;
                }
            }
        }
        return Collections.unmodifiableList(results);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    static Optional<Map<String, Object>> executeFirstMap(
            ExtensionRegistry registry,
            String pointId,
            Object context,
            ExtensionFailurePolicy policy) {
        Optional<Map> raw = executeFirst(registry, pointId, context, Map.class, policy);
        return raw.map(m -> (Map<String, Object>) m);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    static List<Map<String, Object>> executeAllMaps(
            ExtensionRegistry registry,
            String pointId,
            Object context,
            ExtensionFailurePolicy policy) {
        List<Map> raw = executeAll(registry, pointId, context, Map.class, policy);
        List<Map<String, Object>> out = new ArrayList<>(raw.size());
        for (Map m : raw) {
            out.add((Map<String, Object>) m);
        }
        return Collections.unmodifiableList(out);
    }

    @SuppressWarnings("unchecked")
    private static Object executeUnchecked(ExtensionPoint<?, ?> ext, Object context) {
        return ((ExtensionPoint<Object, Object>) ext).execute(context);
    }
}
