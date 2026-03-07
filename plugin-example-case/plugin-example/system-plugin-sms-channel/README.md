# 短信通道插件（VIP 展示）

通过**扩展点**方式接入主程序：仅当用户为 **VIP** 时展示「短信登录」通道。

## 扩展点约定

- **扩展点 ID**：`user.channel.available`
- **入参（Map）**：`isVip` (boolean) — 是否 VIP 用户
- **出参（Map）**：`channel`、`label`、`description` — 仅当 `isVip=true` 时本插件参与并返回短信通道

主程序不依赖任何业务 SDK 接口，仅调用 `ExtensionRegistry.getExtensions("user.channel.available", context)`，传入 Map 含 `isVip`，收集各插件返回的 Map 列表。

## 构建与使用

```bash
mvn clean package
```

将 `target/system-plugin-sms-channel-0.0.1-SNAPSHOT.jar` 放入宿主 **plugins/** 目录（或通过管理台上传），重启或刷新插件后：

- 访问 **GET /api/channels?isVip=true** → 返回包含 `{"channel":"sms","label":"短信登录",...}` 的列表
- 访问 **GET /api/channels?isVip=false** → 不包含短信通道（本插件 supports 返回 false）
