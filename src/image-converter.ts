import * as fs from 'fs-extra';
import * as path from 'path';
import * as mime from 'mime-types';
import sharp from 'sharp';
import Jimp from 'jimp';

export interface WatermarkOptions {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
  fontSize?: number;
  color?: string;
}

export interface ImageConversionOptions {
  quality?: number; // 1-100
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  background?: string;
  progressive?: boolean;
  lossless?: boolean;
  effort?: number; // WebP effort 0-6
  watermark?: {
    text?: string;
    image?: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
    fontSize?: number;
    color?: string;
  };
  effects?: {
    blur?: number;
    sharpen?: number;
    brightness?: number; // -1 to 1
    contrast?: number; // -1 to 1
    saturation?: number; // -1 to 1
    hue?: number; // -180 to 180
    grayscale?: boolean;
    sepia?: boolean;
    invert?: boolean;
  };
}

export interface ImageInfo {
  format: string;
  width: number;
  height: number;
  channels: number;
  density?: number;
  hasAlpha: boolean;
  size: number;
  colorSpace?: string;
  created?: Date;
  modified?: Date;
}

export interface ImageConversionResult {
  success: boolean;
  output_path: string;
  message: string;
  original_size?: number;
  new_size?: number;
  compression_ratio?: number;
  metadata?: any;
}

export class ImageConverter {
  constructor() {}

  async convertImage(
    inputPath: string,
    outputPath: string,
    targetFormat: string,
    options: ImageConversionOptions = {}
  ): Promise<ImageConversionResult> {
    try {
      // 检查输入文件是否存在
      if (!(await fs.pathExists(inputPath))) {
        throw new Error(`Input file does not exist: ${inputPath}`);
      }

      // 确保输出目录存在
      await fs.ensureDir(path.dirname(outputPath));

      // 获取原始文件大小
      const originalStats = await fs.stat(inputPath);
      const originalSize = originalStats.size;

      // 检测输入文件格式
      const inputFormat = this.detectImageFormat(inputPath);
      
      // 执行图像转换
      await this.processImage(inputPath, outputPath, targetFormat, options);
      
      // 获取转换后文件大小
      const newStats = await fs.stat(outputPath);
      const newSize = newStats.size;
      const compressionRatio = ((originalSize - newSize) / originalSize * 100);
      
      return {
        success: true,
        output_path: outputPath,
        message: `Successfully converted ${inputFormat} to ${targetFormat}`,
        original_size: originalSize,
        new_size: newSize,
        compression_ratio: Math.round(compressionRatio * 100) / 100,
      };
    } catch (error) {
      return {
        success: false,
        output_path: outputPath,
        message: `Image conversion failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getImageInfo(filePath: string): Promise<ImageInfo> {
    const stats = await fs.stat(filePath);
    const format = this.detectImageFormat(filePath);
    
    try {
      const metadata = await sharp(filePath).metadata();
      
      return {
        format,
        width: metadata.width || 0,
        height: metadata.height || 0,
        channels: metadata.channels || 0,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha || false,
        size: stats.size,
        colorSpace: metadata.space,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    } catch (error) {
      // 如果Sharp失败，尝试使用Jimp
      try {
        const image = await Jimp.read(filePath);
        return {
          format,
          width: image.getWidth(),
          height: image.getHeight(),
          channels: 4, // Jimp默认RGBA
          hasAlpha: true,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        };
      } catch (jimpError) {
        throw new Error(`Unable to read image metadata: ${error}`);
      }
    }
  }

  getSupportedImageFormats() {
    return {
      input_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'tif', 'gif', 'bmp', 'svg', 'heic', 'heif'],
      output_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'gif', 'bmp', 'pdf'],
      features: {
        resize: true,
        quality_control: true,
        watermark: true,
        effects: true,
        batch_processing: true,
        metadata_preservation: true,
      },
    };
  }

  private detectImageFormat(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mime.lookup(filePath);
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'jpeg';
      case '.png':
        return 'png';
      case '.webp':
        return 'webp';
      case '.avif':
        return 'avif';
      case '.tiff':
      case '.tif':
        return 'tiff';
      case '.gif':
        return 'gif';
      case '.bmp':
        return 'bmp';
      case '.svg':
        return 'svg';
      case '.heic':
        return 'heic';
      case '.heif':
        return 'heif';
      default:
        if (mimeType && mimeType.startsWith('image/')) {
          return mimeType.split('/')[1];
        }
        return 'unknown';
    }
  }

  private async processImage(
    inputPath: string,
    outputPath: string,
    targetFormat: string,
    options: ImageConversionOptions
  ): Promise<void> {
    const inputFormat = this.detectImageFormat(inputPath);
    
    // 对于SVG，使用特殊处理
    if (inputFormat === 'svg') {
      return this.processSvgImage(inputPath, outputPath, targetFormat, options);
    }
    
    // 使用Sharp进行主要的图像处理
    try {
      let pipeline = sharp(inputPath);
      
      // 调整大小
      if (options.width || options.height) {
        pipeline = pipeline.resize(options.width, options.height, {
          fit: options.fit || 'inside',
          background: options.background || { r: 255, g: 255, b: 255, alpha: 1 },
        });
      }
      
      // 应用效果
      if (options.effects) {
        const effects = options.effects;
        
        if (effects.blur) {
          pipeline = pipeline.blur(effects.blur);
        }
        
        if (effects.sharpen) {
          pipeline = pipeline.sharpen(effects.sharpen);
        }
        
        if (effects.brightness !== undefined || effects.contrast !== undefined || 
            effects.saturation !== undefined || effects.hue !== undefined) {
          pipeline = pipeline.modulate({
            brightness: effects.brightness ? 1 + effects.brightness : undefined,
            saturation: effects.saturation ? 1 + effects.saturation : undefined,
            hue: effects.hue,
          });
        }
        
        if (effects.grayscale) {
          pipeline = pipeline.grayscale();
        }
        
        if (effects.invert) {
          pipeline = pipeline.negate();
        }
      }
      
      // 设置输出格式和选项
      switch (targetFormat.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          pipeline = pipeline.jpeg({
            quality: options.quality || 80,
            progressive: options.progressive || false,
          });
          break;
        case 'png':
          pipeline = pipeline.png({
            quality: options.quality || 80,
            progressive: options.progressive || false,
          });
          break;
        case 'webp':
          pipeline = pipeline.webp({
            quality: options.quality || 80,
            lossless: options.lossless || false,
            effort: options.effort || 4,
          });
          break;
        case 'avif':
          pipeline = pipeline.avif({
            quality: options.quality || 80,
            lossless: options.lossless || false,
            effort: options.effort || 4,
          });
          break;
        case 'tiff':
          pipeline = pipeline.tiff({
            quality: options.quality || 80,
          });
          break;
        case 'gif':
          // Sharp不直接支持GIF输出，使用Jimp
          return this.processWithJimp(inputPath, outputPath, targetFormat, options);
        case 'bmp':
          // Sharp不直接支持BMP输出，使用Jimp
          return this.processWithJimp(inputPath, outputPath, targetFormat, options);
        case 'pdf':
          return this.convertImageToPdf(inputPath, outputPath, options);
        default:
          throw new Error(`Unsupported output format: ${targetFormat}`);
      }
      
      // 添加水印
      if (options.watermark) {
        pipeline = await this.addWatermark(pipeline, options.watermark);
      }
      
      // 保存文件
      await pipeline.toFile(outputPath);
      
    } catch (error) {
      // 如果Sharp失败，尝试使用Jimp作为后备
      console.warn(`Sharp processing failed, falling back to Jimp: ${error}`);
      await this.processWithJimp(inputPath, outputPath, targetFormat, options);
    }
  }

  private async processSvgImage(
    inputPath: string,
    outputPath: string,
    targetFormat: string,
    options: ImageConversionOptions
  ): Promise<void> {
    // 使用Sharp直接处理SVG
    let pipeline = sharp(inputPath, {
      density: 300 // 设置SVG渲染密度
    });
    
    // 调整大小
    if (options.width || options.height) {
      pipeline = pipeline.resize(options.width || 800, options.height || 600, {
        fit: options.fit || 'inside',
        background: options.background || { r: 255, g: 255, b: 255, alpha: 1 },
      });
    }
    
    // 应用格式转换
    pipeline = this.applySharpFormat(pipeline, targetFormat, options);
    
    // 保存文件
    await pipeline.toFile(outputPath);
  }

  private async processWithJimp(
    inputPath: string,
    outputPath: string,
    targetFormat: string,
    options: ImageConversionOptions
  ): Promise<void> {
    const image = await Jimp.read(inputPath);
    
    // 调整大小
    if (options.width || options.height) {
      const width = options.width || Jimp.AUTO;
      const height = options.height || Jimp.AUTO;
      image.resize(width, height);
    }
    
    // 应用效果
    if (options.effects) {
      const effects = options.effects;
      
      if (effects.blur) {
        image.blur(effects.blur);
      }
      
      if (effects.brightness !== undefined) {
        image.brightness(effects.brightness);
      }
      
      if (effects.contrast !== undefined) {
        image.contrast(effects.contrast);
      }
      
      if (effects.grayscale) {
        image.greyscale();
      }
      
      if (effects.sepia) {
        image.sepia();
      }
      
      if (effects.invert) {
        image.invert();
      }
    }
    
    // 设置质量
    if (options.quality && (targetFormat === 'jpeg' || targetFormat === 'jpg')) {
      image.quality(options.quality);
    }
    
    // 保存文件
    await image.writeAsync(outputPath);
  }

  private async addWatermark(pipeline: sharp.Sharp, watermark: NonNullable<ImageConversionOptions['watermark']>): Promise<sharp.Sharp> {
    if (watermark.text) {
      // 文字水印 - 使用SVG创建文字图像
      const fontSize = watermark.fontSize || 24;
      const color = watermark.color || 'rgba(255, 255, 255, 0.8)';
      const opacity = watermark.opacity || 0.8;
      
      const svgText = `
        <svg width="400" height="100">
          <text x="200" y="50" font-family="Arial" font-size="${fontSize}" 
                fill="${color}" text-anchor="middle" dominant-baseline="middle"
                opacity="${opacity}">
            ${watermark.text}
          </text>
        </svg>
      `;
      
      const textBuffer = Buffer.from(svgText);
      
      // 根据位置设置水印
      const gravity = this.getWatermarkGravity(watermark.position || 'bottom-right');
      
      return pipeline.composite([{
        input: textBuffer,
        gravity,
        blend: 'over',
      }]);
    }
    
    if (watermark.image) {
      // 图片水印
      const gravity = this.getWatermarkGravity(watermark.position || 'bottom-right');
      
      return pipeline.composite([{
        input: watermark.image,
        gravity,
        blend: 'over',
      }]);
    }
    
    return pipeline;
  }

  private getWatermarkGravity(position: string): string {
    switch (position) {
      case 'top-left': return 'northwest';
      case 'top-right': return 'northeast';
      case 'bottom-left': return 'southwest';
      case 'bottom-right': return 'southeast';
      case 'center': return 'center';
      default: return 'southeast';
    }
  }

  private applySharpFormat(pipeline: sharp.Sharp, targetFormat: string, options: ImageConversionOptions): sharp.Sharp {
    switch (targetFormat.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        return pipeline.jpeg({
          quality: options.quality || 80,
          progressive: options.progressive || false,
        });
      case 'png':
        return pipeline.png({
          quality: options.quality || 80,
          progressive: options.progressive || false,
        });
      case 'webp':
        return pipeline.webp({
          quality: options.quality || 80,
          lossless: options.lossless || false,
          effort: options.effort || 4,
        });
      case 'avif':
        return pipeline.avif({
          quality: options.quality || 80,
          lossless: options.lossless || false,
          effort: options.effort || 4,
        });
      case 'tiff':
        return pipeline.tiff({
          quality: options.quality || 80,
        });
      default:
        return pipeline;
    }
  }

  private async convertImageToPdf(
    inputPath: string,
    outputPath: string,
    options: ImageConversionOptions
  ): Promise<void> {
    // 使用puppeteer将图像转换为PDF
    const puppeteer = require('puppeteer');
    let browser;
    
    try {
      browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      // 读取图像并转换为base64
      const imageBuffer = await fs.readFile(inputPath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = mime.lookup(inputPath) || 'image/jpeg';
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            img { max-width: 100%; max-height: 100%; object-fit: contain; }
          </style>
        </head>
        <body>
          <img src="data:${mimeType};base64,${base64Image}" alt="Image" />
        </body>
        </html>
      `;
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
      });
      
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async batchConvertImages(
    inputDir: string,
    outputDir: string,
    targetFormat: string,
    options: ImageConversionOptions = {}
  ): Promise<{ success: number; failed: number; results: ImageConversionResult[] }> {
    const results: ImageConversionResult[] = [];
    let success = 0;
    let failed = 0;
    
    // 确保输出目录存在
    await fs.ensureDir(outputDir);
    
    // 获取所有图像文件
    const files = await fs.readdir(inputDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff', '.tif', '.gif', '.bmp', '.svg', '.heic', '.heif'].includes(ext);
    });
    
    // 批量处理
    for (const file of imageFiles) {
      const inputPath = path.join(inputDir, file);
      const outputFileName = path.basename(file, path.extname(file)) + '.' + targetFormat;
      const outputPath = path.join(outputDir, outputFileName);
      
      const result = await this.convertImage(inputPath, outputPath, targetFormat, options);
      results.push(result);
      
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }
    
    return { success, failed, results };
  }

  async addTextWatermark(
    inputPath: string,
    outputPath: string,
    text: string,
    options: WatermarkOptions = {}
  ): Promise<void> {
    const { position = 'bottom-right', opacity = 0.5 } = options;
    
    // 使用sharp添加文字水印（简化版本）
    const image = sharp(inputPath);
    const { width, height } = await image.metadata();
    
    if (!width || !height) {
      throw new Error('Unable to get image dimensions');
    }
    
    // 创建SVG文字水印
    let x = 20, y = 50;
    switch (position) {
      case 'top-left':
        x = 20;
        y = 50;
        break;
      case 'top-right':
        x = width - 200; // 估算文字宽度
        y = 50;
        break;
      case 'bottom-left':
        x = 20;
        y = height - 20;
        break;
      case 'bottom-right':
        x = width - 200;
        y = height - 20;
        break;
      case 'center':
        x = width / 2 - 100;
        y = height / 2;
        break;
    }
    
    const svgText = `
      <svg width="${width}" height="${height}">
        <text x="${x}" y="${y}" font-family="Arial" font-size="30" 
              fill="rgba(255,255,255,${opacity})" 
              stroke="rgba(0,0,0,${opacity})" stroke-width="1">
          ${text}
        </text>
      </svg>
    `;
    
    await image
      .composite([{ input: Buffer.from(svgText), top: 0, left: 0 }])
      .toFile(outputPath);
  }

  async addImageWatermark(
    inputPath: string,
    outputPath: string,
    watermarkPath: string,
    options: WatermarkOptions = {}
  ): Promise<void> {
    const { position = 'bottom-right', opacity = 0.5 } = options;
    
    const image = sharp(inputPath);
    const watermark = sharp(watermarkPath);
    
    // 调整水印透明度
    const watermarkBuffer = await watermark
      .composite([{
        input: Buffer.from(`<svg><rect width="100%" height="100%" fill="rgba(255,255,255,${1-opacity})"/></svg>`),
        blend: 'multiply'
      }])
      .png()
      .toBuffer();
    
    const gravity = this.getWatermarkGravity(position);
    
    await image
      .composite([{
        input: watermarkBuffer,
        gravity: gravity as any,
        blend: 'over'
      }])
      .toFile(outputPath);
  }

  async createThumbnail(
    inputPath: string,
    outputPath: string,
    width: number = 200,
    height: number = 200
  ): Promise<void> {
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
  }

  async optimizeImage(
    inputPath: string,
    outputPath: string,
    quality: number = 80
  ): Promise<ImageConversionResult> {
    const format = this.detectImageFormat(inputPath);
    
    const options: ImageConversionOptions = {
      quality,
      progressive: true
    };
    
    return this.convertImage(inputPath, outputPath, format, options);
  }
}