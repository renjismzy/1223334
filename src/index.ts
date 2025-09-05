#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as http from 'http';
import * as url from 'url';
// 导入文档转换器类
import { DocumentConverter } from './converter';

class DocumentConverterServer {
  private server: Server;
  private converter: DocumentConverter;
  private httpServer?: http.Server;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-document-converter',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.converter = new DocumentConverter();
    this.setupToolHandlers();
    this.setupHttpServer();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'convert_document',
            description: 'Convert documents between various formats (PDF, Word, Markdown, HTML, TXT)',
            inputSchema: {
              type: 'object',
              properties: {
                input_path: {
                  type: 'string',
                  description: 'Path to the input document file',
                },
                output_path: {
                  type: 'string',
                  description: 'Path for the output converted file',
                },
                target_format: {
                  type: 'string',
                  enum: ['pdf', 'docx', 'md', 'html', 'txt'],
                  description: 'Target format for conversion',
                },
                options: {
                  type: 'object',
                  description: 'Additional conversion options',
                  properties: {
                    preserve_formatting: {
                      type: 'boolean',
                      description: 'Whether to preserve original formatting',
                      default: true,
                    },
                    extract_images: {
                      type: 'boolean',
                      description: 'Whether to extract and save images separately',
                      default: false,
                    },
                  },
                },
              },
              required: ['input_path', 'output_path', 'target_format'],
            },
          },
          {
            name: 'get_document_info',
            description: 'Get information about a document (format, size, page count, etc.)',
            inputSchema: {
              type: 'object',
              properties: {
                file_path: {
                  type: 'string',
                  description: 'Path to the document file',
                },
              },
              required: ['file_path'],
            },
          },
          {
            name: 'list_supported_formats',
            description: 'List all supported input and output formats',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'convert_document': {
            const { input_path, output_path, target_format, options = {} } = args as {
              input_path: string;
              output_path: string;
              target_format: string;
              options?: any;
            };

            const result = await this.converter.convertDocument(
              input_path,
              output_path,
              target_format,
              options
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'get_document_info': {
            const { file_path } = args as { file_path: string };
            const info = await this.converter.getDocumentInfo(file_path);

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(info, null, 2),
                },
              ],
            };
          }

          case 'list_supported_formats': {
            const formats = this.converter.getSupportedFormats();

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(formats, null, 2),
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private setupHttpServer() {
    this.httpServer = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url || '', true);
      const pathname = parsedUrl.pathname;

      // 设置CORS头
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      switch (pathname) {
        case '/':
        case '/health':
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'healthy',
            service: 'mcp-document-converter',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            tools: ['convert_document', 'get_document_info', 'list_supported_formats']
          }));
          break;

        case '/tools':
          res.writeHead(200, { 'Content-Type': 'application/json' });
          const formats = this.converter.getSupportedFormats();
          res.end(JSON.stringify({
            tools: [
              {
                name: 'convert_document',
                description: 'Convert documents between various formats',
                supported_formats: formats
              },
              {
                name: 'get_document_info',
                description: 'Get information about a document'
              },
              {
                name: 'list_supported_formats',
                description: 'List all supported input and output formats'
              }
            ]
          }));
          break;

        case '/status':
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>MCP Document Converter</title>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
                .status { background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; margin: 20px 0; }
                .tools { background: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0; }
                .tool { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #007acc; }
                code { background: #f1f1f1; padding: 2px 6px; border-radius: 3px; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🚀 MCP Document Converter Server</h1>
                <div class="status">
                  <strong>✅ Status:</strong> Running and healthy<br>
                  <strong>📅 Started:</strong> ${new Date().toLocaleString()}<br>
                  <strong>🔧 Version:</strong> 1.0.0
                </div>
                <div class="tools">
                  <h2>Available Tools:</h2>
                  <div class="tool">
                    <strong>convert_document</strong> - Convert documents between various formats (PDF, Word, Markdown, HTML, TXT)
                  </div>
                  <div class="tool">
                    <strong>get_document_info</strong> - Get information about a document (format, size, page count, etc.)
                  </div>
                  <div class="tool">
                    <strong>list_supported_formats</strong> - List all supported input and output formats
                  </div>
                </div>
                <p><strong>API Endpoints:</strong></p>
                <ul>
                  <li><code>GET /health</code> - Health check</li>
                  <li><code>GET /tools</code> - List available tools</li>
                  <li><code>GET /status</code> - This status page</li>
                </ul>
              </div>
            </body>
            </html>
          `);
          break;

        default:
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found', path: pathname }));
      }
    });
  }

  async run() {
    try {
      // 启动HTTP服务器
      const port = process.env.PORT || 3000;
      if (this.httpServer) {
        this.httpServer.listen(port, () => {
          console.error(`🌐 HTTP server running on port ${port}`);
          console.error(`📊 Status page: http://localhost:${port}/status`);
          console.error(`🔍 Health check: http://localhost:${port}/health`);
        });
      }

      // 启动MCP服务器
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('🚀 Starting MCP Document Converter Server...');
      console.error('MCP Document Converter Server running on stdio');
      
      // 添加进程信号处理
      process.on('SIGINT', () => {
        console.error('Received SIGINT, shutting down gracefully...');
        if (this.httpServer) {
          this.httpServer.close();
        }
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        console.error('Received SIGTERM, shutting down gracefully...');
        if (this.httpServer) {
          this.httpServer.close();
        }
        process.exit(0);
      });
      
    } catch (error) {
      console.error('Failed to start servers:', error);
      process.exit(1);
    }
  }
}

const server = new DocumentConverterServer();
server.run().catch(console.error);