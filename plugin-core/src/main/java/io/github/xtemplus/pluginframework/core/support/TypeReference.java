package io.github.xtemplus.pluginframework.core.support;

import java.lang.reflect.GenericArrayType;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.lang.reflect.WildcardType;

/**
 * 通过匿名子类在运行时保留泛型参数 {@link #getType()}，扩展点返回值校验使用 {@link #getRawType()} 与 {@link
 * Class#isInstance}。
 *
 * <p>用法与常见 JSON 库类似，例如：
 *
 * <pre>{@code
 * new TypeReference<Map<String, Object>>() {}
 * }</pre>
 *
 * <p>说明：运行时无法校验 {@code Map} 的键值泛型是否严格为 {@code String}/{@code Object}，仅保证对象为 {@link
 * Map}；嵌套泛型同样只校验到原始类型（如 {@code List}）。
 *
 * @param <T> 声明的完整泛型类型
 */
public abstract class TypeReference<T> {

    private final Type type;
    private final Class<?> rawType;

    /** 由匿名子类 {@code new TypeReference<...>() \{\}} 解析泛型参数。 */
    protected TypeReference() {
        Type superClass = getClass().getGenericSuperclass();
        if (!(superClass instanceof ParameterizedType)) {
            throw new IllegalArgumentException(
                    "TypeReference requires anonymous subclass, e.g. new TypeReference<Map<String,Object>>() {}");
        }
        ParameterizedType pt = (ParameterizedType) superClass;
        if (pt.getRawType() != TypeReference.class) {
            throw new IllegalArgumentException("Invalid TypeReference hierarchy");
        }
        Type[] args = pt.getActualTypeArguments();
        if (args.length != 1) {
            throw new IllegalArgumentException("TypeReference expects exactly one type argument");
        }
        this.type = args[0];
        this.rawType = resolveRawType(this.type);
    }

    /** 完整类型，如 {@code ParameterizedType} 表示的 {@code Map<String,Object>}。 */
    public final Type getType() {
        return type;
    }

    /**
     * 运行时用于 {@link Class#isInstance} 的类：{@code Class} 即自身，参数化类型则为其 raw class（如 {@code
     * Map.class}）。
     */
    public final Class<?> getRawType() {
        return rawType;
    }

    @SuppressWarnings("unchecked")
    public final T cast(Object obj) {
        return (T) obj;
    }

    private static Class<?> resolveRawType(Type type) {
        if (type instanceof Class) {
            return (Class<?>) type;
        }
        if (type instanceof ParameterizedType) {
            return (Class<?>) ((ParameterizedType) type).getRawType();
        }
        if (type instanceof GenericArrayType) {
            Type component = ((GenericArrayType) type).getGenericComponentType();
            Class<?> componentClass = resolveRawType(component);
            return java.lang.reflect.Array.newInstance(componentClass, 0).getClass();
        }
        if (type instanceof WildcardType) {
            Type[] upper = ((WildcardType) type).getUpperBounds();
            if (upper.length > 0) {
                return resolveRawType(upper[0]);
            }
            return Object.class;
        }
        throw new IllegalArgumentException("Unsupported Type: " + type);
    }
}
