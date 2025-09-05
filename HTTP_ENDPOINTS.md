# HTTP端点文档

## 概述

MCP Document Converter 提供HTTP端点以支持部署平台的工具扫描和健康检查功能。这些端点与MCP协议并行运行，确保服务可以被正确识别和监控。

## 可用端点

### 1. 健康检查端点

**路径：** `GET /health`

**描述：** 返回服务健康状态和基本信息

**响应示例：**
```json
{
  "status": "healthy",
  "service": "mcp-document-converter",
  "version": "1.0.0",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "tools": ["convert_document", "get_document_info", "list_supported_formats"]
}
```

**用途：**
- 部署平台健康检查
- 监控系统状态验证
- 负载均衡器健康探测

### 2. 工具列表端点

**路径：** `GET /tools`

**描述：** 返回所有可用工具的详细信息

**响应示例：**
```json
{
  "tools": [
    {
      "name": "convert_document",
      "description": "Convert documents between various formats",
      "supported_formats": {
        "input_formats": ["pdf", "docx", "doc", "html", "htm", "md", "txt"],
        "output_formats": ["pdf", "docx", "html", "md", "txt"]
      }
    },
    {
      "name": "get_document_info",
      "description": "Get information about a document",
      "supported_formats": {
        "input_formats": ["pdf", "docx", "doc", "html", "htm", "md", "txt"]
      }
    },
    {
      "name": "list_supported_formats",
      "description": "List all supported input and output formats"
    }
  ]
}
```

**用途：**
- 部署平台工具发现
- API文档生成
- 客户端功能探测

### 3. 状态页面

**路径：** `GET /status`

**描述：** 返回HTML格式的服务状态页面

**功能：**
- 服务基本信息显示
- 可用工具列表
- API端点链接
- 实时状态监控

**用途：**
- 人工监控和调试
- 服务状态可视化
- 快速功能验证

### 4. 根路径

**路径：** `GET /`

**描述：** 返回服务基本信息和欢迎消息

**响应示例：**
```json
{
  "service": "MCP Document Converter",
  "version": "1.0.0",
  "description": "A Model Context Protocol server for document conversion",
  "endpoints": {
    "health": "/health",
    "tools": "/tools",
    "status": "/status"
  }
}
```

## 配置

### 环境变量

- `PORT`: HTTP服务器端口（默认：3000）
- `NODE_ENV`: 运行环境（production/development）

### CORS配置

所有端点都包含以下CORS头：
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## 使用示例

### 基本健康检查
```bash
curl http://localhost:3000/health
```

### 获取工具列表
```bash
curl http://localhost:3000/tools
```

### 查看状态页面
```bash
# 在浏览器中打开
open http://localhost:3000/status
```

### 测试所有端点
```bash
#!/bin/bash
BASE_URL="http://localhost:3000"

echo "Testing health endpoint..."
curl -s "$BASE_URL/health" | jq .

echo "Testing tools endpoint..."
curl -s "$BASE_URL/tools" | jq .

echo "Testing root endpoint..."
curl -s "$BASE_URL/" | jq .

echo "Testing status page..."
curl -s "$BASE_URL/status" | head -20
```

## 部署注意事项

### 基本配置
- 确保部署环境支持HTTP服务器
- 配置正确的端口映射（默认3000）
- 设置适当的环境变量（PORT, NODE_ENV）
- 考虑负载均衡和反向代理配置

### 部署平台工具扫描

部署平台通常会扫描以下端点来发现和验证MCP工具：

**关键端点：**
- `/health` - 健康检查，必须返回200状态码
- `/tools` - 工具列表，用于发现可用功能
- `/` - 根路径，提供服务基本信息

**扫描要求：**
- 端点必须在服务启动后立即可用
- 响应时间应在30秒内
- 必须包含正确的CORS头
- JSON响应格式必须符合规范

**常见问题：**
如果遇到"无法连接到服务器扫描工具"错误：
1. 检查端口是否正确暴露
2. 验证健康检查端点可访问性
3. 确认防火墙和网络配置
4. 查看部署平台特定要求

详细解决方案请参考 `PLATFORM_CONFIG_GUIDE.md`

## 监控和调试

### 日志监控
服务启动时会输出以下信息：
```
🌐 HTTP server running on port 3000
📊 Status page: http://localhost:3000/status
🔍 Health check: http://localhost:3000/health
🚀 Starting MCP Document Converter Server...
MCP Document Converter Server running on stdio
```

### 故障排除
1. **端点无响应**：检查服务是否正常启动
2. **CORS错误**：验证请求头设置
3. **超时问题**：检查网络连接和服务器负载
4. **格式错误**：确认JSON响应格式正确

### 性能监控
```bash
# 监控响应时间
time curl http://localhost:3000/health

# 并发测试
ab -n 100 -c 10 http://localhost:3000/health
```

通过这些HTTP端点，MCP Document Converter可以与各种部署平台和监控系统无缝集成。