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

### 5. Docker构建问题解决

如果遇到Docker构建超时或内部错误：

**错误示例：**
```
Using Dockerfile from repository 
Unexpected internal error or timeout.
```

**解决方案：**

1. **使用优化的Dockerfile**
   - 项目已包含优化的单阶段构建Dockerfile
   - 减少了构建步骤和依赖安装时间
   - 添加了健康检查和安全配置

2. **本地测试Docker构建**
   ```bash
   # 本地构建测试
   docker build -t mcp-document-converter .
   
   # 运行容器测试
   docker run -p 3000:3000 mcp-document-converter
   ```

3. **检查构建资源**
   - 确保构建环境有足够内存（推荐2GB+）
   - 检查网络连接稳定性
   - 考虑使用更快的镜像源

### 6. 运行时故障排除

如果服务运行时遇到问题：

1. **检查HTTP端点是否可访问**
   ```bash
   curl http://localhost:3000/health
   # 应该返回: {"status":"healthy",...}
   ```

2. **检查服务器日志输出**
   - 查找 "HTTP server running on port 3000" 消息
   - 查找 "MCP Document Converter Server running on stdio" 消息

3. **验证端口配置**
   - 确认端口3000未被其他服务占用
   - 检查防火墙是否阻止端口3000
   - 尝试设置不同端口：`PORT=8080 node dist/index.js`

4. **确认所有依赖已正确安装**
   ```bash
   npm ci
   npm run build
   ```

5. **验证Node.js版本兼容性**
6. **检查网络连接和防火墙设置**

## 支持的格式

- **输入格式**: PDF, DOCX, DOC, HTML, HTM, MD, TXT
- **输出格式**: PDF, DOCX, HTML, MD, TXT

## 联系支持

如果问题持续存在，请提供以下信息：
- 错误日志
- 部署环境详情
- 使用的配置文件