package io.github.xtemplus.pluginframework.core.spi;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 标记「Map 入参 / Map 出参」的扩展点执行方法，由 {@link
 * io.github.xtemplus.pluginframework.core.support.ExtensionPointMethodRegistrar} 扫描并注册为 {@link
 * ExtensionPoint}。
 *
 * <p>方法签名须为：{@code Map<String, Object> methodName(Map<String, Object> context)}（或参数/返回为 Map
 * 子类型擦除后仍为 Map）。可选配合 {@link ExtRunCondition} 提供 {@code supports} 逻辑；缺省时 {@code supports}
 * 恒为 true。
 *
 * <p>同一类中可对相同 {@link #value() pointId} 声明多个 {@code @ExtPoint} 方法，将注册为多条扩展实现；{@link #order()}
 * 控制同一 pointId 下的先后顺序。该 pointId 下至多一个 {@link ExtRunCondition}，对所有这些方法共用。
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface ExtPoint {

    /**
     * 扩展点 ID，与 {@link ExtensionPoint#getPointId()} 一致。
     *
     * @return pointId
     */
    String value();

    /**
     * 注册顺序（升序）；数值越小越先注册。同一 pointId 多个方法时用于排序；再按 pointId、方法名稳定排序。
     *
     * @return 顺序
     */
    int order() default 0;
}
