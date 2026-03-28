package io.github.xtemplus.pluginframework.core.support;

/**
 * 扩展点批量/单次执行时遇到运行时异常或类型不符时的处理策略。
 *
 * <p>与 {@link io.github.xtemplus.pluginframework.core.registry.ExtensionRegistry} 的 {@code executeFirst} /
 * {@code executeAll} 等 default 方法配合使用；框架不在此记录日志。
 *
 * <p>类型不符：单次 {@link io.github.xtemplus.pluginframework.core.registry.ExtensionRegistry#executeFirst(String,
 * Object, Class, ExtensionFailurePolicy)} 恒返回 {@code Optional.empty()}；批量 {@link
 * io.github.xtemplus.pluginframework.core.registry.ExtensionRegistry#executeAll(String, Object, Class,
 * ExtensionFailurePolicy)} 在 {@link #FAIL_FAST} 下抛出 {@link IllegalStateException}，在 {@link #SKIP_ON_FAILURE}
 * 下跳过该项。
 */
public enum ExtensionFailurePolicy {

    /**
     * {@code execute} 抛出的运行时异常向外传播；批量路径下类型不符抛 {@link IllegalStateException}。
     */
    FAIL_FAST,

    /**
     * {@code execute} 抛错或类型不符时跳过当前扩展，继续处理后续（批量）；单次仅一个实现，抛错时返回 {@code
     * Optional.empty()}。
     */
    SKIP_ON_FAILURE
}
