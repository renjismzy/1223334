# 部署平台配置指南

## 概述

本指南解决"部署成功但无法连接到服务器扫描工具"的问题。该问题通常由以下原因引起：

1. 部署平台无法访问HTTP端点
2. 端口配置不正确
3. 健康检查路径未正确设置
4. 网络或防火墙限制

## 各平台配置指南

### Railway 配置

**1. 环境变量设置**
```bash
PORT=3000
NODE_ENV=production
```

**2. 健康检查配置**
- 健康检查路径：`/health`
- 健康检查端口：`3000`
- 超时设置：30秒

**3. 网络配置**
```yaml
# railway.toml
[build]
builder = "dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
```

### Render 配置

**1. 服务设置**
- 服务类型：Web Service
- 构建命令：`npm run build`
- 启动命令：`node dist/index.js`

**2. 环境变量**
```bash
PORT=3000
NODE_ENV=production
```

**3. 健康检查**
- 健康检查路径：`/health`
- 健康检查间隔：30秒

### Vercel 配置

**注意：** Vercel主要用于静态网站和serverless函数，不适合长期运行的MCP服务器。

如果必须使用Vercel，需要配置API路由：

**1. 创建API路由文件**
```javascript
// api/health.js
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    service: 'mcp-document-converter',
    timestamp: new Date().toISOString()
  });
}
```

**2. vercel.json配置**
```json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/health",
      "destination": "/api/health"
    }
  ]
}
```

### Netlify 配置

**注意：** 类似Vercel，Netlify不适合长期运行的服务器。

如果使用Netlify Functions：

**1. 函数配置**
```javascript
// netlify/functions/health.js
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      status: 'healthy',
      service: 'mcp-document-converter',
      timestamp: new Date().toISOString()
    })
  };
};
```

### Docker 部署配置

**1. 容器运行**
```bash
# 基本运行
docker run -p 3000:3000 mcp-document-converter

# 带环境变量
docker run -p 3000:3000 -e PORT=3000 -e NODE_ENV=production mcp-document-converter

# 带健康检查
docker run -p 3000:3000 --health-cmd="curl -f http://localhost:3000/health || exit 1" --health-interval=30s mcp-document-converter
```

**2. Docker Compose配置**
```yaml
version: '3.8'
services:
  mcp-converter:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 自托管服务器配置

**1. Nginx反向代理**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 健康检查端点
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

**2. 系统服务配置**
```ini
# /etc/systemd/system/mcp-converter.service
[Unit]
Description=MCP Document Converter
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/mcp-converter
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

## 故障排除步骤

### 1. 验证本地服务
```bash
# 检查服务是否运行
curl http://localhost:3000/health

# 检查工具端点
curl http://localhost:3000/tools

# 检查状态页面
curl http://localhost:3000/status
```

### 2. 检查网络连接
```bash
# 检查端口是否开放
telnet your-domain.com 3000

# 检查DNS解析
nslookup your-domain.com

# 检查HTTP响应
curl -I http://your-domain.com/health
```

### 3. 调试部署平台

**Railway:**
```bash
# 查看部署日志
railway logs

# 检查服务状态
railway status
```

**Render:**
- 查看部署日志
- 检查服务健康状态
- 验证环境变量设置

**Docker:**
```bash
# 查看容器日志
docker logs <container_id>

# 检查容器状态
docker ps

# 进入容器调试
docker exec -it <container_id> /bin/sh
```

### 4. 常见问题解决

**问题1：端口未正确暴露**
```bash
# 解决方案：确保Dockerfile中EXPOSE 3000
# 确保运行时端口映射正确
```

**问题2：健康检查失败**
```bash
# 解决方案：检查/health端点是否返回200状态码
curl -v http://your-domain.com/health
```

**问题3：CORS问题**
```bash
# 解决方案：确保响应头包含正确的CORS设置
# Access-Control-Allow-Origin: *
```

**问题4：超时问题**
```bash
# 解决方案：增加健康检查超时时间
# 优化应用启动时间
```

## 推荐部署平台

根据MCP服务器的特性，推荐使用以下平台：

1. **Railway** - 最佳选择，支持长期运行服务
2. **Render** - 良好支持，免费层有限制
3. **自托管VPS** - 完全控制，需要运维经验
4. **Docker容器** - 灵活部署，适合各种环境

**不推荐：**
- Vercel/Netlify（适合静态网站，不适合长期运行的服务器）

## 监控和维护

### 1. 健康监控
```bash
# 设置定期健康检查
*/5 * * * * curl -f http://your-domain.com/health || echo "Service down" | mail admin@example.com
```

### 2. 日志监控
```bash
# 监控应用日志
tail -f /var/log/mcp-converter.log

# 监控系统资源
top -p $(pgrep node)
```

### 3. 性能监控
```bash
# 监控响应时间
curl -w "@curl-format.txt" -o /dev/null -s http://your-domain.com/health
```

通过遵循本指南，应该能够解决大部分部署平台连接问题，确保MCP服务器能够被正确扫描和使用。