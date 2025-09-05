#!/usr/bin/env node

/**
 * MCP Connection Test Script
 * 
 * This script helps test MCP server connectivity and configuration.
 * It simulates how MCP clients connect to the server and validates responses.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class MCPConnectionTester {
    constructor() {
        this.serverPath = path.join(__dirname, 'dist', 'index.js');
        this.timeout = 10000; // 10 seconds
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'info': '✓',
            'error': '✗',
            'warn': '⚠',
            'debug': '→'
        }[type] || 'ℹ';
        
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    async testServerExists() {
        this.log('Checking if server file exists...');
        
        if (!fs.existsSync(this.serverPath)) {
            this.log(`Server file not found: ${this.serverPath}`, 'error');
            this.log('Please run "npm run build" first', 'warn');
            return false;
        }
        
        this.log(`Server file found: ${this.serverPath}`);
        return true;
    }

    async testNodeVersion() {
        this.log('Checking Node.js version...');
        
        return new Promise((resolve) => {
            const nodeProcess = spawn('node', ['--version']);
            let output = '';
            
            nodeProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            nodeProcess.on('close', (code) => {
                if (code === 0) {
                    const version = output.trim();
                    this.log(`Node.js version: ${version}`);
                    
                    // Check if version is >= 18
                    const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
                    if (majorVersion >= 18) {
                        this.log('Node.js version is compatible');
                        resolve(true);
                    } else {
                        this.log('Node.js version should be >= 18', 'warn');
                        resolve(false);
                    }
                } else {
                    this.log('Failed to get Node.js version', 'error');
                    resolve(false);
                }
            });
        });
    }

    async testMCPProtocol() {
        this.log('Testing MCP protocol communication...');
        
        return new Promise((resolve) => {
            const serverProcess = spawn('node', [this.serverPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, NO_HTTP_SERVER: 'true' }
            });
            
            let responseReceived = false;
            let output = '';
            
            // Set timeout
            const timeoutId = setTimeout(() => {
                if (!responseReceived) {
                    this.log('MCP protocol test timed out', 'error');
                    serverProcess.kill();
                    resolve(false);
                }
            }, this.timeout);
            
            serverProcess.stdout.on('data', (data) => {
                output += data.toString();
                
                // Look for MCP response
                const lines = output.split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const response = JSON.parse(line.trim());
                            if (response.result && response.result.capabilities) {
                                responseReceived = true;
                                clearTimeout(timeoutId);
                                this.log('MCP protocol communication successful');
                                this.log(`Server capabilities: ${JSON.stringify(response.result.capabilities, null, 2)}`, 'debug');
                                serverProcess.kill();
                                resolve(true);
                                return;
                            }
                        } catch (e) {
                            // Not JSON, continue
                        }
                    }
                }
            });
            
            serverProcess.stderr.on('data', (data) => {
                const error = data.toString();
                if (error.includes('Error') || error.includes('error')) {
                    this.log(`Server error: ${error.trim()}`, 'error');
                }
            });
            
            serverProcess.on('close', (code) => {
                clearTimeout(timeoutId);
                if (!responseReceived) {
                    this.log(`Server exited with code ${code}`, code === 0 ? 'warn' : 'error');
                    resolve(false);
                }
            });
            
            // Send MCP initialize request
            const initRequest = {
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: {
                        name: 'mcp-connection-tester',
                        version: '1.0.0'
                    }
                }
            };
            
            this.log('Sending MCP initialize request...', 'debug');
            serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
        });
    }

    async testToolsAvailability() {
        this.log('Testing tools availability...');
        
        return new Promise((resolve) => {
            const serverProcess = spawn('node', [this.serverPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, NO_HTTP_SERVER: 'true' }
            });
            
            let toolsReceived = false;
            let output = '';
            let initialized = false;
            
            const timeoutId = setTimeout(() => {
                if (!toolsReceived) {
                    this.log('Tools availability test timed out', 'error');
                    serverProcess.kill();
                    resolve(false);
                }
            }, this.timeout);
            
            serverProcess.stdout.on('data', (data) => {
                output += data.toString();
                
                const lines = output.split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const response = JSON.parse(line.trim());
                            
                            // Handle initialize response
                            if (response.result && response.result.capabilities && !initialized) {
                                initialized = true;
                                this.log('Server initialized, requesting tools...', 'debug');
                                
                                // Send tools/list request
                                const toolsRequest = {
                                    jsonrpc: '2.0',
                                    id: 2,
                                    method: 'tools/list'
                                };
                                
                                serverProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');
                            }
                            
                            // Handle tools response
                            if (response.result && response.result.tools) {
                                toolsReceived = true;
                                clearTimeout(timeoutId);
                                
                                const tools = response.result.tools;
                                this.log(`Found ${tools.length} available tools:`);
                                
                                tools.forEach(tool => {
                                    this.log(`  - ${tool.name}: ${tool.description}`, 'debug');
                                });
                                
                                serverProcess.kill();
                                resolve(true);
                                return;
                            }
                        } catch (e) {
                            // Not JSON, continue
                        }
                    }
                }
            });
            
            serverProcess.stderr.on('data', (data) => {
                const error = data.toString();
                if (error.includes('Error') || error.includes('error')) {
                    this.log(`Server error: ${error.trim()}`, 'error');
                }
            });
            
            serverProcess.on('close', (code) => {
                clearTimeout(timeoutId);
                if (!toolsReceived) {
                    this.log(`Server exited with code ${code} before tools were received`, 'error');
                    resolve(false);
                }
            });
            
            // Send initialize request first
            const initRequest = {
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: {
                        name: 'mcp-connection-tester',
                        version: '1.0.0'
                    }
                }
            };
            
            serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
        });
    }

    async generateConfigExample() {
        this.log('Generating Claude Desktop configuration example...');
        
        const configPath = path.resolve(this.serverPath);
        const config = {
            mcpServers: {
                'document-converter': {
                    command: 'node',
                    args: [configPath],
                    env: {
                        NODE_ENV: 'production'
                    }
                }
            }
        };
        
        this.log('Claude Desktop configuration:');
        console.log(JSON.stringify(config, null, 2));
        
        this.log('\nConfiguration file locations:');
        this.log('  Windows: %APPDATA%\\Claude\\claude_desktop_config.json');
        this.log('  Mac: ~/.config/claude-desktop/claude_desktop_config.json');
        this.log('  Linux: ~/.config/claude-desktop/claude_desktop_config.json');
    }

    async runAllTests() {
        this.log('Starting MCP Connection Tests...');
        this.log('=' .repeat(50));
        
        const results = {
            serverExists: await this.testServerExists(),
            nodeVersion: await this.testNodeVersion(),
            mcpProtocol: false,
            toolsAvailability: false
        };
        
        if (results.serverExists && results.nodeVersion) {
            results.mcpProtocol = await this.testMCPProtocol();
            
            if (results.mcpProtocol) {
                results.toolsAvailability = await this.testToolsAvailability();
            }
        }
        
        this.log('=' .repeat(50));
        this.log('Test Results Summary:');
        this.log(`Server File Exists: ${results.serverExists ? '✓' : '✗'}`);
        this.log(`Node.js Version: ${results.nodeVersion ? '✓' : '✗'}`);
        this.log(`MCP Protocol: ${results.mcpProtocol ? '✓' : '✗'}`);
        this.log(`Tools Available: ${results.toolsAvailability ? '✓' : '✗'}`);
        
        const allPassed = Object.values(results).every(result => result);
        
        if (allPassed) {
            this.log('\n🎉 All tests passed! Your MCP server is ready for use.', 'info');
            await this.generateConfigExample();
        } else {
            this.log('\n❌ Some tests failed. Please check the errors above.', 'error');
            this.log('\nTroubleshooting tips:');
            
            if (!results.serverExists) {
                this.log('  - Run "npm run build" to build the server');
            }
            
            if (!results.nodeVersion) {
                this.log('  - Install Node.js version 18 or higher');
            }
            
            if (!results.mcpProtocol) {
                this.log('  - Check server logs for startup errors');
                this.log('  - Verify all dependencies are installed (npm install)');
            }
            
            if (!results.toolsAvailability) {
                this.log('  - Check if tools are properly exported in the server code');
            }
        }
        
        return allPassed;
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new MCPConnectionTester();
    tester.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test runner error:', error);
        process.exit(1);
    });
}

module.exports = MCPConnectionTester;