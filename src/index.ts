#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
// 导入文档转换器类
import { DocumentConverter } from './converter';

class DocumentConverterServer {
  private server: Server;
  private converter: DocumentConverter;

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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Document Converter Server running on stdio');
  }
}

const server = new DocumentConverterServer();
server.run().catch(console.error);