# Smithery 部署指南

## 概述

本文档提供了将 `mcp-document-converter` 部署到 Smithery 平台的详细说明。

## 前提条件

- Smithery 账户和访问权限
- Smithery CLI 工具已安装
- Node.js 14.x 或更高版本

## 部署步骤

### 1. 准备部署文件

确保项目根目录中包含以下文件：

- `smithery.config.json`：Smithery 部署配置文件
- `package.json`：项目依赖和脚本
- `dist/` 目录：编译后的代码

### 2. 登录 Smithery

```bash
smithery login
```

### 3. 部署服务

```bash
smithery deploy
```

### 4. 验证部署

```bash
smithery status mcp-document-converter
```

## 配置说明

### 资源配置

`smithery.config.json` 中的资源配置可以根据需要调整：

```json
"resources": {
  "cpu": "0.5",      // CPU 核心数
  "memory": "512Mi",  // 内存大小
  "storage": "1Gi"    // 存储大小
}
```

### 扩展配置

```json
"scaling": {
  "minReplicas": 1,   // 最小副本数
  "maxReplicas": 3,   // 最大副本数
  "targetCPUUtilizationPercentage": 80  // CPU 使用率触发扩展的阈值
}
```

## 使用方法

部署完成后，可以通过 Smithery 平台提供的 MCP 接口访问文档转换服务：

```javascript
// 示例代码
const result = await smithery.invoke('mcp-document-converter', 'convert_document', {
  input_path: '/path/to/input.md',
  output_path: '/path/to/output.docx',
  target_format: 'docx',
  options: {
    preserve_formatting: true,
    extract_images: false
  }
});
```

## 故障排除

如果遇到部署或运行问题，请检查：

1. Smithery 日志：`smithery logs mcp-document-converter`
2. 确保所有依赖已正确安装
3. 验证 `smithery.config.json` 配置是否正确

## 支持

如需进一步帮助，请联系 Smithery 支持团队或提交 GitHub issue。