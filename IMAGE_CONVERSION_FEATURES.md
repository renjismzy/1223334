# 🖼️ 图像转换功能增强

## 新增功能概览

MCP Document Converter 现已支持强大的图像转换和处理功能！

### 🎯 支持的图像格式

**输入格式：**
- JPEG/JPG
- PNG
- WebP
- AVIF
- TIFF/TIF
- GIF
- BMP
- SVG
- HEIC/HEIF

**输出格式：**
- JPEG/JPG
- PNG
- WebP
- AVIF
- TIFF
- GIF
- BMP
- PDF

### 🚀 核心功能

#### 1. 基础图像转换
```javascript
// 使用 MCP 工具
{
  "name": "convert_document",
  "arguments": {
    "input_path": "/path/to/image.png",
    "output_path": "/path/to/output.jpg",
    "target_format": "jpeg"
  }
}
```

#### 2. 图像调整大小
```javascript
{
  "name": "convert_document",
  "arguments": {
    "input_path": "/path/to/image.png",
    "output_path": "/path/to/resized.png",
    "target_format": "png",
    "options": {
      "image_options": {
        "width": 800,
        "height": 600,
        "maintain_aspect_ratio": true
      }
    }
  }
}
```

#### 3. 图像质量控制
```javascript
{
  "name": "convert_document",
  "arguments": {
    "input_path": "/path/to/image.jpg",
    "output_path": "/path/to/compressed.jpg",
    "target_format": "jpeg",
    "options": {
      "image_options": {
        "quality": 85
      }
    }
  }
}
```

#### 4. 背景色设置
```javascript
{
  "name": "convert_document",
  "arguments": {
    "input_path": "/path/to/transparent.png",
    "output_path": "/path/to/with-background.jpg",
    "target_format": "jpeg",
    "options": {
      "image_options": {
        "background_color": "#ffffff"
      }
    }
  }
}
```

#### 5. 文字水印
```javascript
{
  "name": "convert_document",
  "arguments": {
    "input_path": "/path/to/image.jpg",
    "output_path": "/path/to/watermarked.jpg",
    "target_format": "jpeg",
    "options": {
      "image_options": {
        "watermark": {
          "text": "© 2024 My Company",
          "position": "bottom-right",
          "opacity": 0.7
        }
      }
    }
  }
}
```

#### 6. 图像水印
```javascript
{
  "name": "convert_document",
  "arguments": {
    "input_path": "/path/to/image.jpg",
    "output_path": "/path/to/watermarked.jpg",
    "target_format": "jpeg",
    "options": {
      "image_options": {
        "watermark": {
          "image_path": "/path/to/logo.png",
          "position": "top-right",
          "opacity": 0.5
        }
      }
    }
  }
}
```

### 🔧 技术实现

#### 使用的库
- **Sharp**: 高性能图像处理（主要引擎）
- **Jimp**: 纯JavaScript图像处理（备用方案）

#### 架构设计
- `ImageConverter` 类：专门处理图像转换
- `DocumentConverter` 类：统一接口，自动检测文件类型
- 智能格式检测：根据文件扩展名和MIME类型识别
- 错误处理：完善的错误捕获和用户友好的错误信息

### 📊 性能特点

- **高效处理**: 使用Sharp库，基于libvips，性能优异
- **内存优化**: 流式处理，支持大文件
- **格式丰富**: 支持现代图像格式（WebP、AVIF等）
- **质量控制**: 精确的压缩和质量控制

### 🎨 使用示例

#### 批量图像转换
```javascript
const { DocumentConverter } = require('mcp-document-converter');
const converter = new DocumentConverter();

// 将PNG转换为WebP以节省空间
const result = await converter.convertDocument(
  'photo.png',
  'photo.webp',
  'webp',
  {
    image_options: {
      quality: 90,
      width: 1920,
      maintain_aspect_ratio: true
    }
  }
);

console.log('转换结果:', result);
```

#### 创建缩略图
```javascript
// 创建缩略图
const thumbnailResult = await converter.convertDocument(
  'large-image.jpg',
  'thumbnail.jpg',
  'jpeg',
  {
    image_options: {
      width: 200,
      height: 200,
      quality: 80
    }
  }
);
```

### 🔍 获取图像信息

```javascript
{
  "name": "get_document_info",
  "arguments": {
    "file_path": "/path/to/image.jpg"
  }
}
```

返回信息包括：
- 文件格式
- 文件大小
- 图像尺寸
- 创建和修改时间
- 其他元数据

### 🚀 快速开始

1. **安装依赖**
   ```bash
   npm install
   ```

2. **构建项目**
   ```bash
   npm run build
   ```

3. **测试图像功能**
   ```bash
   node test-image-conversion.js
   ```

4. **启动MCP服务器**
   ```bash
   npm start
   ```

### 📝 注意事项

- SVG文件会以300 DPI密度渲染
- 透明图像转换为JPEG时会自动添加白色背景
- 水印功能支持文字和图像两种类型
- 所有转换操作都会保留原始文件

### 🔧 故障排除

如果遇到问题，请参考：
- [故障排除指南](./TROUBLESHOOTING_GUIDE.md)
- [MCP客户端配置](./MCP_CLIENT_CONFIG.md)

---

**享受强大的图像转换功能！** 🎉