package io.github.xtemplus.pluginframework.core.contract;

import java.util.ArrayList;
import java.util.List;
import org.everit.json.schema.Schema;
import org.everit.json.schema.ValidationException;
import org.json.JSONObject;

/**
 * 基于 JSON Schema 的请求/响应体验证器（契约能力）。
 *
 * <p>使用 everit-json-schema 校验 JSON 字符串是否符合给定 schema；供扩展点运行时在调用前后做契约校验。
 */
public final class SchemaValidator {

    private SchemaValidator() {}

    /**
     * 校验 JSON 字符串是否符合给定 JSON Schema。
     *
     * @param schemaJson JSON Schema 字符串（合法 JSON）
     * @param bodyJson 待校验的 JSON 字符串
     * @return 校验通过返回空列表，否则返回错误信息列表
     */
    public static List<String> validate(String schemaJson, String bodyJson) {
        List<String> errors = new ArrayList<>();
        if (schemaJson == null || schemaJson.isEmpty()) {
            return errors;
        }
        if (bodyJson == null) {
            bodyJson = "null";
        }
        try {
            Schema schema =
                    org.everit.json.schema.loader.SchemaLoader.load(
                            new JSONObject(schemaJson));
            schema.validate(new JSONObject(bodyJson));
        } catch (ValidationException e) {
            collectErrors(e, errors);
        } catch (Exception e) {
            errors.add(e.getMessage() != null ? e.getMessage() : e.toString());
        }
        return errors;
    }

    private static void collectErrors(ValidationException e, List<String> errors) {
        if (e.getCausingExceptions().isEmpty()) {
            errors.add(e.getMessage());
        } else {
            for (ValidationException c : e.getCausingExceptions()) {
                collectErrors(c, errors);
            }
        }
    }
}
