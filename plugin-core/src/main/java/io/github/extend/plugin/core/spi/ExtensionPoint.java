package io.github.extend.plugin.core.spi;

/**
 * 通用扩展点接口，支持泛型上下文与返回值。
 *
 * <p>宿主系统通过约定扩展点 ID 和上下文类型，将业务扩展能力开放给插件实现。
 *
 * @param <C> 扩展点上下文类型
 * @param <R> 扩展执行结果类型
 */
public interface ExtensionPoint<C, R> {

    /**
     * 扩展点唯一标识。
     *
     * @return 扩展点 ID
     */
    String getPointId();

    /**
     * 判断当前扩展是否适用于给定上下文。
     *
     * @param context 调用上下文
     * @return 是否支持
     */
    default boolean supports(C context) {
        return true;
    }

    /**
     * 执行扩展逻辑。
     *
     * @param context 调用上下文
     * @return 扩展执行结果
     */
    R execute(C context);
}

