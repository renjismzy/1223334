# Docker构建优化指南

## 问题描述

在部署过程中可能遇到以下Docker构建错误：
```
Using Dockerfile from repository 
Unexpected internal error or timeout.
```

## 解决方案

### 1. 优化的Dockerfile设计

项目已经从多阶段构建优化为单阶段构建，主要改进包括：

- **减少构建层数**：从多阶段构建简化为单阶段
- **最小化依赖**：只安装必要的系统包
- **优化构建顺序**：先安装生产依赖，再进行构建
- **及时清理**：构建完成后立即删除临时文件和开发依赖
- **添加健康检查**：内置HTTP健康检查端点

### 2. 构建优化特性

#### 系统依赖优化
```dockerfile
# 只安装必要的包，减少下载时间
RUN apk add --no-cache chromium ca-certificates
```

#### 构建过程优化
```dockerfile
# 临时安装构建依赖，构建后立即清理
RUN npm install typescript --silent && \
    npm run build && \
    npm uninstall typescript && \
    rm -rf src/ tsconfig.json && \
    npm cache clean --force
```

#### 安全配置
```dockerfile
# 创建非root用户运行应用
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs && \
    chown -R appuser:nodejs /app
USER appuser
```

### 3. 本地测试步骤

在部署前，建议先进行本地测试：

```bash
# 1. 构建镜像
docker build -t mcp-document-converter .

# 2. 运行容器
docker run -p 3000:3000 mcp-document-converter

# 3. 测试健康检查
curl http://localhost:3000/health

# 4. 测试功能端点
curl http://localhost:3000/tools
```

### 4. 构建环境要求

为确保构建成功，请确保：

- **内存**：至少2GB可用内存
- **存储**：至少1GB可用磁盘空间
- **网络**：稳定的网络连接用于下载依赖
- **Docker版本**：Docker 20.10+

### 5. 常见构建问题及解决方案

#### 问题1：网络超时
```bash
# 解决方案：使用国内镜像源
docker build --build-arg NPM_REGISTRY=https://registry.npmmirror.com .
```

#### 问题2：内存不足
```bash
# 解决方案：增加Docker内存限制
docker build --memory=2g .
```

#### 问题3：依赖安装失败
```bash
# 解决方案：清理Docker缓存后重试
docker system prune -f
docker build --no-cache .
```

### 6. 部署平台特定配置

#### Vercel/Netlify
- 确保设置正确的构建命令：`npm run build`
- 设置环境变量：`NODE_ENV=production`
- 配置端口：`PORT=3000`

#### Railway/Render
- 使用优化的Dockerfile
- 设置健康检查路径：`/health`
- 配置端口映射：`3000:3000`

#### Docker Hub/自托管
- 使用多架构构建：`docker buildx build --platform linux/amd64,linux/arm64`
- 配置自动构建触发器
- 设置镜像标签策略

### 7. 监控和调试

#### 构建日志分析
```bash
# 查看详细构建日志
docker build --progress=plain .
```

#### 运行时调试
```bash
# 进入容器调试
docker run -it --entrypoint /bin/sh mcp-document-converter

# 查看应用日志
docker logs <container_id>
```

#### 健康检查验证
```bash
# 检查容器健康状态
docker ps --format "table {{.Names}}\t{{.Status}}"

# 手动执行健康检查
docker exec <container_id> node -e "require('http').get('http://localhost:3000/health', (res) => console.log(res.statusCode))"
```

## 总结

通过以上优化，Docker构建时间从原来的多阶段构建显著减少，同时提高了构建成功率。如果仍然遇到问题，请检查构建环境的资源配置和网络连接。