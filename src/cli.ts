#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { DocumentConverter } from './converter.js';
import type { ConversionOptions } from './converter.js';

const program = new Command();
const converter = new DocumentConverter();

program
  .name('mcp-doc-converter')
  .description('MCP Document Converter - Convert documents between various formats')
  .version('1.0.0');

program
  .command('convert')
  .description('Convert a document to another format')
  .requiredOption('-i, --input <path>', 'Input file path')
  .requiredOption('-o, --output <path>', 'Output file path')
  .requiredOption('-f, --format <format>', 'Target format (pdf, docx, md, html, txt)')
  .option('--preserve-formatting', 'Preserve original formatting', false)
  .option('--extract-images', 'Extract images separately', false)
  .option('--image-dir <path>', 'Directory to save extracted images')
  .action(async (options) => {
    try {
      console.log('🔄 Converting document...');
      
      const inputExt = path.extname(options.input).toLowerCase();
      const isWordToPdf = (inputExt === '.docx' || inputExt === '.doc') && options.format.toLowerCase() === 'pdf';

      const convOpts: ConversionOptions = {
        preserve_formatting: options.preserveFormatting,
        extract_images: options.extractImages,
        image_output_dir: options.imageDir ? path.resolve(options.imageDir) : undefined,
      };

      if (isWordToPdf) {
        // 针对 Word→PDF 默认开启高保真排版与中文字体优先
        convOpts.preserve_formatting = convOpts.preserve_formatting ?? true;
        convOpts.pdf_options = {
          ...(convOpts.pdf_options || {}),
          prefer_chinese_fonts: (convOpts.pdf_options?.prefer_chinese_fonts ?? true),
        };
      }
      
      const result = await converter.convertDocument(
        path.resolve(options.input),
        path.resolve(options.output),
        options.format,
        convOpts
      );
      
      if (result.success) {
        console.log('✅ Conversion completed successfully!');
        console.log(`📄 Output: ${result.output_path}`);
        if (result.extracted_images && result.extracted_images.length > 0) {
          console.log(`🖼️  Extracted ${result.extracted_images.length} images`);
        }
      } else {
        console.error('❌ Conversion failed:', result.message);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Get information about a document')
  .requiredOption('-f, --file <path>', 'Document file path')
  .action(async (options) => {
    try {
      const filePath = path.resolve(options.file);
      
      if (!(await fs.pathExists(filePath))) {
        console.error('❌ File does not exist:', filePath);
        process.exit(1);
      }
      
      console.log('📊 Analyzing document...');
      const info = await converter.getDocumentInfo(filePath);
      
      console.log('\n📄 Document Information:');
      console.log(`Format: ${info.format.toUpperCase()}`);
      console.log(`Size: ${(info.size / 1024).toFixed(2)} KB`);
      if (info.pages) {
        console.log(`Pages: ${info.pages}`);
      }
      if (info.title) {
        console.log(`Title: ${info.title}`);
      }
      if (info.author) {
        console.log(`Author: ${info.author}`);
      }
      if (info.created) {
        console.log(`Created: ${info.created.toLocaleDateString()}`);
      }
      if (info.modified) {
        console.log(`Modified: ${info.modified.toLocaleDateString()}`);
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('formats')
  .description('List supported input and output formats')
  .action(() => {
    const formats = converter.getSupportedFormats();
    
    console.log('📋 Supported Formats:\n');
    console.log('📥 Input formats:', formats.input_formats.join(', '));
    console.log('📤 Output formats:', formats.output_formats.join(', '));
    
    console.log('\n🔄 Conversion Matrix:');
    const matrix = formats.conversion_matrix as Record<string, string[]>;
    Object.entries(matrix).forEach(([input, outputs]) => {
      console.log(`  ${input.toUpperCase()} → ${outputs.map(f => f.toUpperCase()).join(', ')}`);
    });
  });

program
  .command('mcp')
  .description('Start MCP server mode')
  .action(() => {
    console.log('🚀 Starting MCP Document Converter Server...');
    // 导入并启动MCP服务器
    require('./index.js');
  });

program
  .command('batch')
  .description('Batch convert multiple files')
  .requiredOption('-d, --dir <path>', 'Input directory')
  .requiredOption('-o, --output <path>', 'Output directory')
  .requiredOption('-f, --format <format>', 'Target format')
  .option('--pattern <pattern>', 'File pattern to match (glob)', '**/*')
  .option('--preserve-formatting', 'Preserve original formatting', false)
  .action(async (options) => {
    try {
      const inputDir = path.resolve(options.dir);
      const outputDir = path.resolve(options.output);
      
      if (!(await fs.pathExists(inputDir))) {
        console.error('❌ Input directory does not exist:', inputDir);
        process.exit(1);
      }
      
      await fs.ensureDir(outputDir);
      
      // 简单的文件查找（这里可以扩展为使用glob模式）
      const files = await fs.readdir(inputDir);
      const supportedExts = ['.pdf', '.docx', '.doc', '.html', '.htm', '.md', '.txt'];
      
      const filesToConvert = files.filter(file => 
        supportedExts.some(ext => file.toLowerCase().endsWith(ext))
      );
      
      if (filesToConvert.length === 0) {
        console.log('⚠️  No supported files found in the directory');
        return;
      }
      
      console.log(`🔄 Converting ${filesToConvert.length} files...`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const file of filesToConvert) {
        const inputPath = path.join(inputDir, file);
        const baseName = path.parse(file).name;
        const outputPath = path.join(outputDir, `${baseName}.${options.format}`);
        
        try {
          console.log(`  Converting: ${file}`);
          const result = await converter.convertDocument(
            inputPath,
            outputPath,
            options.format,
            {
              preserve_formatting: options.preserveFormatting,
            }
          );
          
          if (result.success) {
            successCount++;
            console.log(`    ✅ Success`);
          } else {
            failCount++;
            console.log(`    ❌ Failed: ${result.message}`);
          }
        } catch (error) {
          failCount++;
          console.log(`    ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      console.log(`\n📊 Batch conversion completed:`);
      console.log(`  ✅ Successful: ${successCount}`);
      console.log(`  ❌ Failed: ${failCount}`);
      
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// 添加使用示例
program
  .command('examples')
  .description('Show usage examples')
  .action(() => {
    console.log('📚 Usage Examples:\n');
    
    console.log('🔄 Convert single file:');
    console.log('  npx mcp-document-converter convert -i document.pdf -o output.md -f md\n');
    
    console.log('📊 Get document info:');
    console.log('  npx mcp-document-converter info -f document.pdf\n');
    
    console.log('📋 List supported formats:');
    console.log('  npx mcp-document-converter formats\n');
    
    console.log('🔄 Batch convert:');
    console.log('  npx mcp-document-converter batch -d ./docs -o ./output -f html\n');
    
    console.log('🚀 Start MCP server:');
    console.log('  npx mcp-document-converter mcp\n');
  });

program.parse();