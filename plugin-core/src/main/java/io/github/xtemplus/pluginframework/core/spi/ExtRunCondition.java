package io.github.xtemplus.pluginframework.core.spi;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 标记与 {@link ExtPoint#value()} 相同 pointId 的 {@code supports} 方法。
 *
 * <p>方法签名须为：{@code boolean methodName(Map<String, Object> context)}。
 *
 * <p>同一 {@code pointId} 下至多声明<strong>一个</strong>条件方法；若存在多个 {@link ExtPoint}（同一或不同方法）共用该
 * {@code pointId}，该条件对它们<strong>全部</strong>生效。
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface ExtRunCondition {

    /**
     * 必须与成对 {@link ExtPoint#value()} 一致。
     *
     * @return pointId
     */
    String value();
}
