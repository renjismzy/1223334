FROM node:18-alpine

# 安装必要的系统依赖（减少包数量以加快构建）
RUN apk add --no-cache chromium ca-certificates

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production
ENV PORT=3000

# 复制package文件并安装生产依赖
COPY package*.json ./
RUN npm ci --only=production --silent && npm cache clean --force

# 复制源代码和配置
COPY src/ ./src/
COPY tsconfig.json ./

# 临时安装构建依赖，构建后立即清理
RUN npm install typescript --silent && \
    npm run build && \
    npm uninstall typescript && \
    rm -rf src/ tsconfig.json && \
    npm cache clean --force

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs && \
    chown -R appuser:nodejs /app

# 切换到非root用户
USER appuser

# 暴露端口
EXPOSE 3000

# 添加健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动应用
CMD ["node", "dist/index.js"]