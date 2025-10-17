import * as fs from 'fs-extra';
import * as path from 'path';
import * as mime from 'mime-types';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import TurndownService from 'turndown';
import { marked } from 'marked';
import puppeteer from 'puppeteer';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { ImageConverter, ImageConversionOptions, ImageConversionResult } from './image-converter';
import { spawn } from 'child_process';

export interface ConversionOptions {
  preserve_formatting?: boolean;
  extract_images?: boolean;
  image_output_dir?: string;
  // 图像转换选项
  image_options?: ImageConversionOptions;
  // PDF 输出选项
  pdf_options?: {
    format?: string;
    landscape?: boolean;
    printBackground?: boolean;
    scale?: number;
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    header?: string;
    footer?: string;
    prefer_chinese_fonts?: boolean;
  };
}

export interface DocumentInfo {
  format: string;
  size: number;
  pages?: number;
  title?: string;
  author?: string;
  created?: Date;
  modified?: Date;
}

export interface ConversionResult {
  success: boolean;
  output_path: string;
  message: string;
  extracted_images?: string[];
  metadata?: any;
}

export class DocumentConverter {
  private turndownService: TurndownService;
  private imageConverter: ImageConverter;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
    this.imageConverter = new ImageConverter();
  }

  async convertDocument(
    inputPath: string,
    outputPath: string,
    targetFormat: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    try {
      // 检查输入文件是否存在
      if (!(await fs.pathExists(inputPath))) {
        throw new Error(`Input file does not exist: ${inputPath}`);
      }

      // 确保输出目录存在
      await fs.ensureDir(path.dirname(outputPath));

      // 检测输入文件格式
      const inputFormat = this.detectFormat(inputPath);
      
      // 在 Windows 上优先使用 Word COM（高保真）进行 DOCX -> PDF 转换
      if (inputFormat === 'docx' && targetFormat === 'pdf') {
        const usedWordCom = await this.convertDocxToPdfViaWordCom(inputPath, outputPath);
        if (usedWordCom) {
          return {
            success: true,
            output_path: outputPath,
            message: `Successfully converted docx to pdf via Microsoft Word (COM)`,
          };
        }
        // 若未安装 Word 或 COM 失败，尝试 DocumentAssistant 的 Python 脚本
        const usedPython = await this.convertDocxToPdfViaPython(inputPath, outputPath);
        if (usedPython) {
          return {
            success: true,
            output_path: outputPath,
            message: `Successfully converted docx to pdf via DocumentAssistant script`,
          };
        }
        // 若上述两种方案失败，则继续走下方的常规读取+HTML渲染方案
      }
      
      // 检查是否为图像格式
      const imageFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'tiff', 'gif', 'bmp', 'svg', 'heic', 'heif'];
      if (imageFormats.includes(inputFormat)) {
        // 使用图像转换器
        const imageResult = await this.imageConverter.convertImage(
          inputPath,
          outputPath,
          targetFormat,
          options.image_options || {}
        );
        return {
          success: imageResult.success,
          output_path: imageResult.output_path,
          message: imageResult.message,
          metadata: {
            original_size: imageResult.original_size,
            new_size: imageResult.new_size,
            compression_ratio: imageResult.compression_ratio,
          },
        };
      }
      
      // 读取文档内容
      const content = await this.readDocument(inputPath, inputFormat, options);
      
      // 转换到目标格式
      const result = await this.writeDocument(content, outputPath, targetFormat, options);
      
      return {
        success: true,
        output_path: outputPath,
        message: `Successfully converted ${inputFormat} to ${targetFormat}`,
        ...result,
      };
    } catch (error) {
      return {
        success: false,
        output_path: outputPath,
        message: `Conversion failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getDocumentInfo(filePath: string): Promise<DocumentInfo> {
    const stats = await fs.stat(filePath);
    const format = this.detectFormat(filePath);
    
    const info: DocumentInfo = {
      format,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    };

    try {
      // 检查是否为图像格式
      const imageFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'tiff', 'gif', 'bmp', 'svg', 'heic', 'heif'];
      if (imageFormats.includes(format)) {
        // 获取图像信息
        const imageInfo = await this.imageConverter.getImageInfo(filePath);
        return {
          format: imageInfo.format,
          size: imageInfo.size,
          created: imageInfo.created,
          modified: imageInfo.modified,
          // 添加图像特有信息
          pages: 1, // 图像只有一页
          title: path.basename(filePath, path.extname(filePath)),
          author: undefined,
        };
      }
      
      // 尝试获取更多元数据
      if (format === 'pdf') {
        const buffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(buffer);
        info.pages = pdfData.numpages;
        info.title = pdfData.info?.Title;
        info.author = pdfData.info?.Author;
      } else if (format === 'docx') {
        const buffer = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({ buffer });
        // Word文档页数估算（基于字符数）
        info.pages = Math.ceil(result.value.length / 2000);
      }
    } catch (error) {
      // 忽略元数据提取错误
    }

    return info;
  }

  getSupportedFormats() {
    const imageFormats = this.imageConverter.getSupportedImageFormats();
    return {
      input_formats: ['pdf', 'docx', 'doc', 'html', 'htm', 'md', 'txt', ...imageFormats.input_formats],
      output_formats: ['pdf', 'docx', 'html', 'md', 'txt', ...imageFormats.output_formats],
      conversion_matrix: {
        pdf: ['txt', 'md', 'html'],
        docx: ['txt', 'md', 'html', 'pdf'],
        html: ['txt', 'md', 'pdf'],
        md: ['html', 'pdf', 'txt'],
        txt: ['html', 'md', 'pdf'],
        // 图像格式转换矩阵
        jpg: imageFormats.output_formats,
        jpeg: imageFormats.output_formats,
        png: imageFormats.output_formats,
        webp: imageFormats.output_formats,
        avif: imageFormats.output_formats,
        tiff: imageFormats.output_formats,
        gif: imageFormats.output_formats,
        bmp: imageFormats.output_formats,
        svg: imageFormats.output_formats,
        heic: imageFormats.output_formats,
        heif: imageFormats.output_formats,
      },
      image_features: imageFormats.features,
    };
  }

  private detectFormat(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mime.lookup(filePath);
    
    // 文档格式
    switch (ext) {
      case '.pdf':
        return 'pdf';
      case '.docx':
        return 'docx';
      case '.doc':
        return 'doc';
      case '.html':
      case '.htm':
        return 'html';
      case '.md':
      case '.markdown':
        return 'md';
      case '.txt':
        return 'txt';
      // 图像格式
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
        if (mimeType) {
          if (mimeType.includes('pdf')) return 'pdf';
          if (mimeType.includes('word')) return 'docx';
          if (mimeType.includes('html')) return 'html';
          if (mimeType.startsWith('image/')) {
            return mimeType.split('/')[1];
          }
        }
        return 'txt'; // 默认为文本格式
    }
  }

  private async readDocument(
    filePath: string,
    format: string,
    options: ConversionOptions
  ): Promise<{ text: string; html?: string; metadata?: any }> {
    const buffer = await fs.readFile(filePath);
    
    switch (format) {
      case 'pdf': {
        const pdfData = await pdfParse(buffer);
        return {
          text: pdfData.text,
          metadata: pdfData.info,
        };
      }
      
      case 'docx': {
        const result = await mammoth.convertToHtml({ buffer });
        const textResult = await mammoth.extractRawText({ buffer });
        return {
          text: textResult.value,
          html: result.value,
          metadata: result.messages,
        };
      }
      
      case 'html': {
        const htmlContent = buffer.toString('utf-8');
        const text = this.turndownService.turndown(htmlContent);
        return {
          text,
          html: htmlContent,
        };
      }
      
      case 'md': {
        const mdContent = buffer.toString('utf-8');
        const html = await marked(mdContent);
        return {
          text: mdContent,
          html,
        };
      }
      
      case 'txt':
      default: {
        const text = buffer.toString('utf-8');
        return { text };
      }
    }
  }

  private async writeDocument(
    content: { text: string; html?: string; metadata?: any },
    outputPath: string,
    format: string,
    options: ConversionOptions
  ): Promise<Partial<ConversionResult>> {
    switch (format) {
      case 'txt': {
        await fs.writeFile(outputPath, content.text, 'utf-8');
        return {};
      }
      
      case 'md': {
        let markdown = content.text;
        if (content.html) {
          markdown = this.turndownService.turndown(content.html);
        }
        await fs.writeFile(outputPath, markdown, 'utf-8');
        return {};
      }
      
      case 'html': {
        let html = content.html;
        if (!html) {
          html = await marked(content.text);
        }
        
        const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Converted Document</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 5px; }
    code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
        
        await fs.writeFile(outputPath, fullHtml, 'utf-8');
        return {};
      }
      
      case 'pdf': {
        return await this.convertToPdf(content, outputPath, options);
      }
      
      case 'docx': {
        return await this.convertToDocx(content, outputPath);
      }
      
      default:
        throw new Error(`Unsupported output format: ${format}`);
    }
  }

  private async convertToPdf(
    content: { text: string; html?: string },
    outputPath: string,
    options?: ConversionOptions
  ): Promise<Partial<ConversionResult>> {
    let browser;
    try {
      browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      let html = content.html;
      if (!html || (options && options.preserve_formatting === false)) {
        html = await marked(content.text);
      }
      
      const preferChinese = options?.pdf_options?.prefer_chinese_fonts ?? true;
      const fontFamily = preferChinese
        ? "'Microsoft YaHei','SimSun','Noto Sans SC','Arial',sans-serif"
        : "Arial, sans-serif";
      
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: ${fontFamily}; line-height: 1.6; margin: 40px; }
    h1, h2, h3 { color: #333; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 5px; }
    code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
      
      await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
      
      const esc = (s: string) => String(s).replace(/[&<>]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c] || c));
      
      const pdfOpts = options?.pdf_options || {};
      const hasHeaderFooter = !!(pdfOpts.header || pdfOpts.footer);
      
      await page.pdf({
        path: outputPath,
        format: (pdfOpts.format as any) || 'A4',
        landscape: pdfOpts.landscape || false,
        printBackground: pdfOpts.printBackground ?? true,
        margin: {
          top: pdfOpts.margin?.top || '20mm',
          right: pdfOpts.margin?.right || '20mm',
          bottom: pdfOpts.margin?.bottom || '20mm',
          left: pdfOpts.margin?.left || '20mm',
        },
        ...(pdfOpts.scale ? { scale: pdfOpts.scale } : {}),
        ...(hasHeaderFooter ? {
          displayHeaderFooter: true,
          headerTemplate: pdfOpts.header
            ? `<div style="font-size:10px; color:#555; margin-left: 10mm; margin-right: 10mm;">${esc(pdfOpts.header)}</div>`
            : '<div></div>',
          footerTemplate: pdfOpts.footer
            ? `<div style="font-size:10px; color:#555; margin-left: 10mm; margin-right: 10mm; width:100%; text-align:center;">${esc(pdfOpts.footer)}<span style="margin-left:8px;"><span class="pageNumber"></span>/<span class="totalPages"></span></span></div>`
            : `<div style="font-size:10px; color:#555; text-align:center; width:100%;"><span class="pageNumber"></span>/<span class="totalPages"></span></div>`
        } : {})
      });
      
      return {};
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async convertToDocx(
    content: { text: string; html?: string },
    outputPath: string
  ): Promise<Partial<ConversionResult>> {
    // Convert text to paragraphs
    const lines = content.text.split('\n');
    const paragraphs = lines.map(line => {
      if (line.trim() === '') {
        return new Paragraph({});
      }
      return new Paragraph({
        children: [new TextRun(line)],
      });
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(outputPath, buffer);
    
    return {};
  }

  // 使用 /DocumentAssistant/docx_to_pdf_converter.py 进行 DOCX -> PDF 转换
  private async convertDocxToPdfViaPython(inputPath: string, outputPath: string): Promise<boolean> {
    try {
      const scriptPath = path.resolve(process.cwd(), 'DocumentAssistant', 'docx_to_pdf_converter.py');
      const scriptExists = await fs.pathExists(scriptPath);
      if (!scriptExists) {
        return false;
      }

      // 优先尝试使用 'python'，失败则回退到 Windows 的 'py'
      const run = (cmd: string, args: string[]) => new Promise<boolean>((resolve) => {
        const proc = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, DOCX_PDF_METHOD: 'word', DOCX_PDF_SKIP_MCP: '1' } });
        proc.on('error', () => resolve(false));
        proc.on('close', (code) => resolve(code === 0));
      });

      const args = [scriptPath, inputPath, outputPath];
      let ok = await run('python', args);
      if (!ok) {
        ok = await run('py', ['-3', ...args]);
      }

      if (ok) {
        // 简单确认输出文件存在且非空
        if (await fs.pathExists(outputPath)) {
          const stat = await fs.stat(outputPath);
          if (stat.size > 0) return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  // 在 Windows 上通过 VBScript 调用 Microsoft Word COM 进行 DOCX -> PDF 转换
  private async convertDocxToPdfViaWordCom(inputPath: string, outputPath: string): Promise<boolean> {
    if (process.platform !== 'win32') return false;
    try {
      const tempDir = await fs.mkdtemp(path.join(require('os').tmpdir(), 'docx2pdf-'));
      const vbsPath = path.join(tempDir, 'docx2pdf.vbs');
      const vbs = [
        'On Error Resume Next',
        'Dim inputPath, outputPath',
        'inputPath = WScript.Arguments(0)',
        'outputPath = WScript.Arguments(1)',
        'Dim word',
        'Set word = CreateObject("Word.Application")',
        'If Err.Number <> 0 Then WScript.Quit 1',
        'word.Visible = False',
        'Dim doc',
        'Set doc = word.Documents.Open(inputPath)',
        'If Err.Number <> 0 Then WScript.Quit 2',
        'doc.ExportAsFixedFormat outputPath, 17',
        'doc.Close False',
        'word.Quit',
      ].join('\r\n');
      await fs.writeFile(vbsPath, vbs, 'utf-8');

      const run = () => new Promise<boolean>((resolve) => {
        const proc = spawn('cscript', ['//nologo', vbsPath, inputPath, outputPath], { stdio: 'inherit' });
        proc.on('error', () => resolve(false));
        proc.on('close', async (code) => {
          if (code === 0 && (await fs.pathExists(outputPath))) {
            const stat = await fs.stat(outputPath);
            resolve(stat.size > 0);
          } else {
            resolve(false);
          }
        });
      });

      const ok = await run();
      return ok;
    } catch {
      return false;
    }
  }
}