#!/usr/bin/env node

/**
 * MCP Document Converter 诊断工具
 * 用于检查服务状态和部署平台连接问题
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// 配置
const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 3000;
const TIMEOUT = 10000; // 10秒超时

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// HTTP请求函数
function makeRequest(url, timeout = TIMEOUT) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.get(url, {
      timeout: timeout,
      headers: {
        'User-Agent': 'MCP-Diagnostics/1.0'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          url: url
        });
      });
    });
    
    req.on('error', (err) => {
      reject({
        error: err.message,
        code: err.code,
        url: url
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Request timeout',
        code: 'TIMEOUT',
        url: url
      });
    });
  });
}

// 检查单个端点
async function checkEndpoint(baseUrl, path, expectedStatus = 200) {
  const url = `${baseUrl}${path}`;
  const startTime = Date.now();
  
  try {
    const response = await makeRequest(url);
    const responseTime = Date.now() - startTime;
    
    if (response.statusCode === expectedStatus) {
      logSuccess(`${path} - Status: ${response.statusCode}, Time: ${responseTime}ms`);
      
      // 检查CORS头
      if (response.headers['access-control-allow-origin']) {
        logInfo(`  CORS: ${response.headers['access-control-allow-origin']}`);
      } else {
        logWarning(`  Missing CORS headers`);
      }
      
      // 检查内容类型
      if (response.headers['content-type']) {
        logInfo(`  Content-Type: ${response.headers['content-type']}`);
      }
      
      // 尝试解析JSON响应
      if (path !== '/status' && response.headers['content-type']?.includes('application/json')) {
        try {
          const json = JSON.parse(response.data);
          if (json.status) {
            logInfo(`  Service Status: ${json.status}`);
          }
          if (json.tools && Array.isArray(json.tools)) {
            logInfo(`  Available Tools: ${json.tools.length}`);
          }
        } catch (e) {
          logWarning(`  Invalid JSON response`);
        }
      }
      
      return true;
    } else {
      logError(`${path} - Unexpected status: ${response.statusCode}`);
      return false;
    }
  } catch (err) {
    logError(`${path} - ${err.error} (${err.code})`);
    return false;
  }
}

// 主诊断函数
async function diagnose(host = DEFAULT_HOST, port = DEFAULT_PORT) {
  const baseUrl = `http://${host}:${port}`;
  
  log(`\n${colors.bold}🔍 MCP Document Converter 诊断报告${colors.reset}`);
  log(`📍 检查地址: ${baseUrl}`);
  log(`⏰ 超时设置: ${TIMEOUT}ms\n`);
  
  const endpoints = [
    { path: '/health', description: '健康检查端点' },
    { path: '/tools', description: '工具列表端点' },
    { path: '/', description: '根路径端点' },
    { path: '/status', description: '状态页面端点' }
  ];
  
  let successCount = 0;
  
  for (const endpoint of endpoints) {
    log(`\n🔍 检查 ${endpoint.description} (${endpoint.path})`);
    const success = await checkEndpoint(baseUrl, endpoint.path);
    if (success) successCount++;
  }
  
  // 总结报告
  log(`\n${colors.bold}📊 诊断总结${colors.reset}`);
  log(`✅ 成功: ${successCount}/${endpoints.length}`);
  
  if (successCount === endpoints.length) {
    logSuccess('所有端点正常工作！');
    log('\n🎉 服务状态良好，部署平台应该能够正常扫描工具。');
  } else {
    logError(`${endpoints.length - successCount} 个端点存在问题`);
    log('\n🔧 故障排除建议:');
    log('1. 检查服务是否正在运行');
    log('2. 验证端口配置是否正确');
    log('3. 检查防火墙设置');
    log('4. 查看服务日志获取详细错误信息');
    log('5. 参考 PLATFORM_CONFIG_GUIDE.md 获取平台特定配置');
  }
  
  // 额外检查
  log(`\n🔍 额外检查`);
  
  // 检查端口是否被占用
  try {
    const testUrl = `http://${host}:${port}`;
    await makeRequest(testUrl, 3000);
    logSuccess(`端口 ${port} 可访问`);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      logError(`端口 ${port} 连接被拒绝 - 服务可能未运行`);
    } else if (err.code === 'TIMEOUT') {
      logWarning(`端口 ${port} 响应超时`);
    } else {
      logError(`端口 ${port} 检查失败: ${err.error}`);
    }
  }
}

// 命令行参数解析
function parseArgs() {
  const args = process.argv.slice(2);
  let host = DEFAULT_HOST;
  let port = DEFAULT_PORT;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--host' || arg === '-h') {
      host = args[++i];
    } else if (arg === '--port' || arg === '-p') {
      port = parseInt(args[++i]);
    } else if (arg === '--help') {
      console.log(`
使用方法: node diagnose.js [选项]

选项:
  --host, -h <host>    服务器地址 (默认: ${DEFAULT_HOST})
  --port, -p <port>    端口号 (默认: ${DEFAULT_PORT})
  --help               显示帮助信息

示例:
  node diagnose.js
  node diagnose.js --host your-domain.com --port 3000
  node diagnose.js -h localhost -p 8080
`);
      process.exit(0);
    } else if (arg.startsWith('http')) {
      // 支持完整URL
      try {
        const url = new URL(arg);
        host = url.hostname;
        port = url.port || (url.protocol === 'https:' ? 443 : 80);
      } catch (e) {
        logError(`无效的URL: ${arg}`);
        process.exit(1);
      }
    }
  }
  
  return { host, port };
}

// 主程序
if (require.main === module) {
  const { host, port } = parseArgs();
  
  diagnose(host, port).catch((err) => {
    logError(`诊断过程中发生错误: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { diagnose, checkEndpoint, makeRequest };