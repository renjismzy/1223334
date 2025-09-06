#!/usr/bin/env node

const { DocumentConverter } = require('./dist/converter');
const path = require('path');
const fs = require('fs-extra');

async function testImageConversion() {
  console.log('🖼️  Testing Enhanced Image Conversion Features...');
  console.log('=' .repeat(60));
  
  const converter = new DocumentConverter();
  
  try {
    // 测试支持的格式
    console.log('📋 Testing supported formats...');
    const formats = converter.getSupportedFormats();
    console.log('✅ Input formats:', formats.input_formats.join(', '));
    console.log('✅ Output formats:', formats.output_formats.join(', '));
    console.log('✅ Image features available:', formats.image_features ? 'Yes' : 'No');
    
    // 检查是否有现有的图像文件进行测试
    const testImagePath = 'e:/1223334/Lulab_优秀学员_Yang_Jinze.pdf';
    if (await fs.pathExists(testImagePath)) {
      console.log('\n📄 Found test file, getting document info...');
      const info = await converter.getDocumentInfo(testImagePath);
      console.log('✅ Document info:', JSON.stringify(info, null, 2));
    }
    
    // 创建一个简单的SVG测试图像
    const testSvgPath = path.join(__dirname, 'test-image.svg');
    const svgContent = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f8ff"/>
        <circle cx="200" cy="150" r="80" fill="#4169e1"/>
        <text x="200" y="160" font-family="Arial" font-size="24" 
              text-anchor="middle" fill="white">MCP Test</text>
      </svg>
    `;
    
    await fs.writeFile(testSvgPath, svgContent);
    console.log('\n🎨 Created test SVG image:', testSvgPath);
    
    // 测试SVG到PNG转换
    const outputPngPath = path.join(__dirname, 'test-output.png');
    console.log('\n🔄 Testing SVG to PNG conversion...');
    const result = await converter.convertDocument(
      testSvgPath,
      outputPngPath,
      'png',
      {
        image_options: {
          width: 400,
          height: 300,
          quality: 90
        }
      }
    );
    
    console.log('✅ Conversion result:', JSON.stringify(result, null, 2));
    
    if (result.success && await fs.pathExists(outputPngPath)) {
      console.log('✅ PNG file created successfully!');
      
      // 测试PNG到JPEG转换
      const outputJpegPath = path.join(__dirname, 'test-output.jpg');
      console.log('\n🔄 Testing PNG to JPEG conversion...');
      const jpegResult = await converter.convertDocument(
        outputPngPath,
        outputJpegPath,
        'jpeg',
        {
          image_options: {
            quality: 85,
            background_color: '#ffffff'
          }
        }
      );
      
      console.log('✅ JPEG conversion result:', JSON.stringify(jpegResult, null, 2));
      
      if (jpegResult.success) {
        console.log('✅ JPEG file created successfully!');
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 Image conversion tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  testImageConversion();
}

module.exports = { testImageConversion };