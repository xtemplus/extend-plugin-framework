package io.github.xtemplus.pluginframework.core.support;

import io.github.xtemplus.pluginframework.core.registry.ExtensionRegistry;
import io.github.xtemplus.pluginframework.core.spi.ExtPoint;
import io.github.xtemplus.pluginframework.core.spi.ExtRunCondition;
import io.github.xtemplus.pluginframework.core.spi.ExtensionPoint;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * 将宿主对象上带 {@link ExtPoint} / {@link ExtRunCondition} 的方法注册为 {@link ExtensionPoint}。
 *
 * <p>典型用法：在 {@code Plugin#onEnable} 中调用 {@link #registerAll(String, Object, ExtensionRegistry)}，{@code
 * host} 通常为插件实例 {@code this}，也可为任意持有注解方法的实例。
 *
 * <p>同一实现类可对<strong>同一 {@code pointId}</strong> 声明多个 {@link ExtPoint} 方法，将按 {@link
 * ExtPoint#order()}、{@code pointId}、方法名排序后依次注册为多条扩展实现（与 {@link
 * io.github.xtemplus.pluginframework.core.registry.ExtensionRegistry} 多实现语义一致）。同一 {@code pointId} 下至多一个
 * {@link ExtRunCondition}，供该 {@code pointId} 下<strong>全部</strong>执行方法共用。
 */
public final class ExtensionPointMethodRegistrar {

    private ExtensionPointMethodRegistrar() {}

    /**
     * 扫描 {@code host} 类层次（自具体类向父类直至 {@link Object}）中声明的方法，注册所有 Map 扩展点。
     *
     * @param pluginId 插件 ID，用于 {@link ExtensionRegistry#register(String, ExtensionPoint)}
     * @param host 包含注解方法的实例（通常为插件 {@code this}）
     * @param registry 扩展点注册表
     * @throws IllegalArgumentException 参数为空
     * @throws IllegalStateException 签名非法、同一 pointId 多个 {@link ExtRunCondition}、孤立条件方法等
     */
    public static void registerAll(String pluginId, Object host, ExtensionRegistry registry) {
        Objects.requireNonNull(pluginId, "pluginId");
        Objects.requireNonNull(host, "host");
        Objects.requireNonNull(registry, "registry");

        Map<String, Method> supportByPointId = new HashMap<>();
        List<ExecuteBinding> executes = new ArrayList<>();

        for (Class<?> c = host.getClass(); c != null && c != Object.class; c = c.getSuperclass()) {
            for (Method m : c.getDeclaredMethods()) {
                if (m.isBridge() || Modifier.isStatic(m.getModifiers())) {
                    continue;
                }
                ExtPoint ext = m.getAnnotation(ExtPoint.class);
                if (ext != null) {
                    validateExecuteMethod(m);
                    String pointId = ext.value();
                    if (pointId == null || pointId.isEmpty()) {
                        throw new IllegalStateException(
                                "@ExtPoint value (pointId) must be non-empty on " + m);
                    }
                    executes.add(new ExecuteBinding(pointId, ext.order(), m));
                    m.setAccessible(true);
                }
                ExtRunCondition sup = m.getAnnotation(ExtRunCondition.class);
                if (sup != null) {
                    validateSupportMethod(m);
                    String pointId = sup.value();
                    if (pointId == null || pointId.isEmpty()) {
                        throw new IllegalStateException(
                                "@ExtRunCondition value (pointId) must be non-empty on " + m);
                    }
                    Method previous = supportByPointId.put(pointId, m);
                    if (previous != null) {
                        throw new IllegalStateException(
                                "duplicate @ExtRunCondition for pointId '"
                                        + pointId
                                        + "': "
                                        + previous
                                        + " vs "
                                        + m);
                    }
                    m.setAccessible(true);
                }
            }
        }

        for (Map.Entry<String, Method> e : supportByPointId.entrySet()) {
            String pid = e.getKey();
            boolean hasExecute = false;
            for (ExecuteBinding eb : executes) {
                if (pid.equals(eb.pointId)) {
                    hasExecute = true;
                    break;
                }
            }
            if (!hasExecute) {
                throw new IllegalStateException(
                        "@ExtRunCondition without @ExtPoint for pointId '" + pid + "'");
            }
        }

        executes.sort(
                Comparator.comparingInt((ExecuteBinding eb) -> eb.order)
                        .thenComparing(eb -> eb.pointId)
                        .thenComparing(eb -> eb.execute.getName()));

        for (ExecuteBinding eb : executes) {
            Method support = supportByPointId.get(eb.pointId);
            ExtensionPoint<Object, Object> adapter =
                    new ReflectiveExtPoint(host, eb.pointId, eb.execute, support, eb.order);
            registry.register(pluginId, adapter);
        }
    }

    private static final class ExecuteBinding {
        final String pointId;
        final int order;
        final Method execute;

        ExecuteBinding(String pointId, int order, Method execute) {
            this.pointId = pointId;
            this.order = order;
            this.execute = execute;
        }
    }

    private static void validateExecuteMethod(Method m) {
        if (Modifier.isPrivate(m.getModifiers())) {
            throw new IllegalStateException("@ExtPoint method must not be private: " + m);
        }
        Class<?>[] params = m.getParameterTypes();
        if (params.length != 1 || !Map.class.isAssignableFrom(params[0])) {
            throw new IllegalStateException(
                    "@ExtPoint method must have exactly one Map parameter: " + m);
        }
        Class<?> ret = m.getReturnType();
        if (!Map.class.isAssignableFrom(ret)) {
            throw new IllegalStateException(
                    "@ExtPoint method return type must be assignable to Map: " + m);
        }
    }

    private static void validateSupportMethod(Method m) {
        if (Modifier.isPrivate(m.getModifiers())) {
            throw new IllegalStateException("@ExtRunCondition method must not be private: " + m);
        }
        Class<?>[] params = m.getParameterTypes();
        if (params.length != 1 || !Map.class.isAssignableFrom(params[0])) {
            throw new IllegalStateException(
                    "@ExtRunCondition method must have exactly one Map parameter: " + m);
        }
        Class<?> ret = m.getReturnType();
        if (ret != boolean.class && ret != Boolean.class) {
            throw new IllegalStateException(
                    "@ExtRunCondition method must return boolean or Boolean: " + m);
        }
    }

    private static final class ReflectiveExtPoint implements ExtensionPoint<Object, Object> {

        private final Object host;
        private final String pointId;
        private final Method execute;
        private final Method support;
        private final int order;

        ReflectiveExtPoint(Object host, String pointId, Method execute, Method support, int order) {
            this.host = host;
            this.pointId = pointId;
            this.execute = execute;
            this.support = support;
            this.order = order;
        }

        @Override
        public String getPointId() {
            return pointId;
        }

        @Override
        public int getOrder() {
            return order;
        }

        @Override
        public boolean supports(Object context) {
            if (support == null) {
                return true;
            }
            try {
                Object r = support.invoke(host, context);
                if (r instanceof Boolean) {
                    return (Boolean) r;
                }
                return false;
            } catch (IllegalAccessException e) {
                throw new IllegalStateException("cannot invoke support method: " + support, e);
            } catch (InvocationTargetException e) {
                Throwable c = e.getCause() != null ? e.getCause() : e;
                if (c instanceof RuntimeException) {
                    throw (RuntimeException) c;
                }
                throw new IllegalStateException(c.getMessage(), c);
            }
        }

        @Override
        public Object execute(Object context) {
            try {
                return execute.invoke(host, context);
            } catch (IllegalAccessException e) {
                throw new IllegalStateException("cannot invoke extension method: " + execute, e);
            } catch (InvocationTargetException e) {
                Throwable c = e.getCause() != null ? e.getCause() : e;
                if (c instanceof RuntimeException) {
                    throw (RuntimeException) c;
                }
                throw new IllegalStateException(c.getMessage(), c);
            }
        }
    }
}
