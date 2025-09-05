# MCP Document Converter 部署指南

## 解决部署扫描问题

如果您在部署后遇到以下错误：

```
Your deployment succeeded, but we couldn't connect to your server to scan for tools.
```

这通常是因为部署平台无法正确连接到MCP服务器进行工具扫描。

## 解决方案

### 1. 使用测试配置文件

项目中包含了 `mcp-test-config.json` 文件，您可以使用此配置来设置测试配置文件：

```json
{
  "mcpServers": {
    "mcp-document-converter": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  },
  "testProfile": {
    "name": "test",
    "description": "Test profile for MCP Document Converter",
    "credentials": {},
    "settings": {
      "timeout": 30000,
      "retries": 3
    }
  }
}
```

### 2. 本地测试

在部署前，您可以本地测试MCP服务器：

```bash
# 构建项目
npm run build

# 启动MCP服务器
node dist/index.js

# 或使用npx
npx mcp-document-converter mcp
```

### 3. 验证工具可用性

服务器提供以下工具：

- `convert_document`: 转换文档格式
- `get_document_info`: 获取文档信息
- `list_supported_formats`: 列出支持的格式

### 4. 环境要求

- Node.js >= 16.0.0
- 所有依赖已正确安装
- 服务器能够访问文件系统（用于文档转换）

### 5. 故障排除

如果仍然遇到问题：

1. 检查服务器日志输出
2. 确认所有依赖已正确安装
3. 验证Node.js版本兼容性
4. 检查网络连接和防火墙设置

## 支持的格式

- **输入格式**: PDF, DOCX, DOC, HTML, HTM, MD, TXT
- **输出格式**: PDF, DOCX, HTML, MD, TXT

## 联系支持

如果问题持续存在，请提供以下信息：
- 错误日志
- 部署环境详情
- 使用的配置文件