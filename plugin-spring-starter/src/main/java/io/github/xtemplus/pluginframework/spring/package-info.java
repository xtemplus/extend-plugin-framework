/**
 * 插件框架 Spring 集成入口。
 *
 * <p>目录结构：
 *
 * <ul>
 *   <li>本包：包说明与入口索引
 *   <li>config：自动配置与配置属性
 *   <li>exception：框架异常（{@link io.github.xtemplus.pluginframework.spring.exception.PluginFrameworkException} 基类，
 *       {@link io.github.xtemplus.pluginframework.spring.exception.PluginArgumentException} 参数不合法）
 *   <li>manager：Spring 环境插件管理器（{@link io.github.xtemplus.pluginframework.spring.manager.SpringPluginManager}）
 *   <li>mvc：Spring MVC 集成（插件 Controller 注册）
 * </ul>
 */
package io.github.xtemplus.pluginframework.spring;
