# MCP Client Configuration Guide

## Overview

This guide helps you configure MCP clients (like Claude Desktop) to properly connect to the MCP Document Converter server. The error "deployment was successful, but the client cannot establish a connection to scan for available tools" typically indicates configuration issues between the client and server.

## Common Connection Issues

### 1. Server Not Running
- **Problem**: Server process exits after deployment or fails to start
- **Solution**: Verify server is running and check logs

```bash
# Check if server is running
node diagnose.js

# Check server logs
node dist/index.js
# Should show: "MCP Document Converter Server running on stdio"
```

### 2. Port/Host Binding Issues
- **Problem**: Server binds to localhost only, not accessible from containers
- **Solution**: Ensure server binds to 0.0.0.0 for container deployments

### 3. Authentication Configuration
- **Problem**: Missing or incorrect API keys/tokens
- **Solution**: Verify authentication setup in client configuration

## MCP Client Configuration

### Claude Desktop Configuration

**Location**: `~/.config/claude-desktop/claude_desktop_config.json` (Linux/Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

#### Option 1: Direct Command (Recommended)
```json
{
  "mcpServers": {
    "document-converter": {
      "command": "node",
      "args": ["/path/to/mcp-document-converter/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

#### Option 2: NPX Command
```json
{
  "mcpServers": {
    "document-converter": {
      "command": "npx",
      "args": ["mcp-document-converter"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

#### Option 3: HTTP Connection (if using HTTP server)
```json
{
  "mcpServers": {
    "document-converter": {
      "command": "node",
      "args": ["/path/to/mcp-document-converter/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "PORT": "3000"
      }
    }
  }
}
```

### Other MCP Clients

#### Generic MCP Client Configuration
```json
{
  "servers": {
    "document-converter": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "timeout": 30000
    }
  }
}
```

#### Docker-based Client Configuration
```json
{
  "mcpServers": {
    "document-converter": {
      "command": "docker",
      "args": [
        "run", 
        "--rm", 
        "-i", 
        "mcp-document-converter"
      ]
    }
  }
}
```

## Configuration Validation

### 1. Test Server Connectivity
```bash
# Test direct server execution
node dist/index.js

# Test with diagnostic tool
node diagnose.js

# Test HTTP endpoints (if enabled)
curl http://localhost:3000/health
```

### 2. Validate MCP Protocol
```bash
# Test MCP communication
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node dist/index.js
```

### 3. Check Client Logs

**Claude Desktop Logs:**
- Windows: `%APPDATA%\Claude\logs`
- Mac: `~/Library/Logs/Claude`
- Linux: `~/.config/claude-desktop/logs`

**Common Log Errors:**
```
[ERROR] Failed to start MCP server: command not found
[ERROR] MCP server exited with code 1
[ERROR] Timeout waiting for server initialization
[ERROR] Invalid MCP response format
```

## Troubleshooting Steps

### Step 1: Verify Installation
```bash
# Check if package is installed globally
npm list -g mcp-document-converter

# Or check local installation
npm list mcp-document-converter

# Verify executable
which node
node --version
```

### Step 2: Test Server Manually
```bash
# Navigate to project directory
cd /path/to/mcp-document-converter

# Build project
npm run build

# Test server
node dist/index.js
```

### Step 3: Check Permissions
```bash
# Ensure execute permissions
chmod +x dist/index.js

# Check file ownership
ls -la dist/index.js
```

### Step 4: Environment Variables
```bash
# Set required environment variables
export NODE_ENV=production
export PATH=$PATH:/path/to/node

# Test with environment
NODE_ENV=production node dist/index.js
```

## Platform-Specific Configurations

### Windows
```json
{
  "mcpServers": {
    "document-converter": {
      "command": "node.exe",
      "args": ["C:\\path\\to\\mcp-document-converter\\dist\\index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### macOS
```json
{
  "mcpServers": {
    "document-converter": {
      "command": "/usr/local/bin/node",
      "args": ["/Users/username/mcp-document-converter/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Linux
```json
{
  "mcpServers": {
    "document-converter": {
      "command": "/usr/bin/node",
      "args": ["/home/username/mcp-document-converter/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Advanced Configuration

### Custom Environment Variables
```json
{
  "mcpServers": {
    "document-converter": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "debug",
        "TEMP_DIR": "/tmp/mcp-converter",
        "MAX_FILE_SIZE": "50MB"
      }
    }
  }
}
```

### Timeout Configuration
```json
{
  "mcpServers": {
    "document-converter": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "timeout": 60000,
      "retries": 3,
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Resource Limits
```json
{
  "mcpServers": {
    "document-converter": {
      "command": "node",
      "args": [
        "--max-old-space-size=2048",
        "/path/to/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Security Considerations

### 1. File Permissions
- Ensure server files are not world-writable
- Use appropriate user permissions for execution
- Restrict access to configuration files

### 2. Environment Variables
- Don't store sensitive data in configuration files
- Use environment variables for secrets
- Consider using encrypted configuration

### 3. Network Security
- If using HTTP mode, consider HTTPS in production
- Implement proper authentication if needed
- Use firewall rules to restrict access

## Monitoring and Logging

### Enable Debug Logging
```json
{
  "mcpServers": {
    "document-converter": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "mcp:*"
      }
    }
  }
}
```

### Health Monitoring
```bash
# Create monitoring script
#!/bin/bash
while true; do
  if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "$(date): MCP server health check failed" >> /var/log/mcp-monitor.log
    # Restart logic here
  fi
  sleep 30
done
```

## Common Error Solutions

### "Command not found"
- Verify Node.js installation and PATH
- Use absolute paths in configuration
- Check file permissions

### "Server exited with code 1"
- Check server logs for detailed errors
- Verify all dependencies are installed
- Test server manually

### "Timeout waiting for initialization"
- Increase timeout values
- Check server startup time
- Verify server responds to initialization

### "Invalid MCP response format"
- Ensure server implements MCP protocol correctly
- Check for JSON parsing errors
- Verify protocol version compatibility

By following this guide, you should be able to successfully configure your MCP client to connect to the Document Converter server and resolve most connection issues.