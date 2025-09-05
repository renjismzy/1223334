FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

RUN npm ci --only=production

EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/index.js"]