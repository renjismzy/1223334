# MCP Document Converter Troubleshooting Guide

## Overview

This comprehensive guide addresses common issues with the MCP Document Converter, particularly the "deployment succeeded but couldn't connect to server to scan for tools" error that users frequently encounter.

## Quick Diagnosis

### 1. Run Automated Tests

```bash
# Test MCP protocol communication (recommended)
npm test

# Test HTTP endpoints (for deployment platforms)
npm run test:http
```

### 2. Manual Verification

```bash
# Check if server builds correctly
npm run build

# Test server startup
node dist/index.js

# Test HTTP endpoints (if server is running)
curl http://localhost:3000/health
curl http://localhost:3000/tools
```

## Common Issues and Solutions

### Issue 1: "Command not found" or "Server exited with code 1"

**Symptoms:**
- MCP client reports server startup failure
- Error messages about missing commands or dependencies

**Solutions:**

1. **Verify Node.js Installation:**
   ```bash
   node --version  # Should be >= 18.0.0
   npm --version
   ```

2. **Check File Paths:**
   - Use absolute paths in MCP client configuration
   - Verify `dist/index.js` exists after building

3. **Install Dependencies:**
   ```bash
   npm install
   npm run build
   ```

4. **Test Server Manually:**
   ```bash
   npm test  # This will validate everything
   ```

### Issue 2: "Timeout waiting for server initialization"

**Symptoms:**
- MCP client times out during connection
- Server starts but doesn't respond to initialization

**Solutions:**

1. **Check Server Logs:**
   ```bash
   # Run server directly to see error messages
   node dist/index.js
   ```

2. **Verify MCP Protocol:**
   ```bash
   # Test MCP communication
   npm test
   ```

3. **Increase Timeout (in MCP client config):**
   ```json
   {
     "mcpServers": {
       "document-converter": {
         "command": "node",
         "args": ["/path/to/dist/index.js"],
         "timeout": 30000,
         "env": { "NODE_ENV": "production" }
       }
     }
   }
   ```

### Issue 3: "Port already in use" (EADDRINUSE)

**Symptoms:**
- Error: `listen EADDRINUSE: address already in use :::3000`
- Server fails to start HTTP server

**Solutions:**

1. **Find and Kill Existing Process:**
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -ti:3000 | xargs kill -9
   ```

2. **Use Different Port:**
   ```bash
   PORT=3001 node dist/index.js
   ```

3. **Disable HTTP Server (for MCP-only usage):**
   ```bash
   NO_HTTP_SERVER=true node dist/index.js
   ```

### Issue 4: "Deployment succeeded but couldn't connect to server"

**Symptoms:**
- Deployment platform reports successful deployment
- Tool scanning fails during connection

**Solutions:**

1. **Verify HTTP Endpoints:**
   ```bash
   npm run test:http
   ```

2. **Check Platform Configuration:**
   - Ensure port 3000 is exposed
   - Verify health check endpoints are accessible
   - Check CORS headers are present

3. **Platform-Specific Fixes:**
   
   **Railway/Render:**
   ```bash
   # Ensure PORT environment variable is set
   PORT=$PORT node dist/index.js
   ```
   
   **Vercel/Netlify:**
   ```json
   // vercel.json
   {
     "functions": {
       "dist/index.js": {
         "runtime": "nodejs18.x"
       }
     }
   }
   ```
   
   **Docker:**
   ```dockerfile
   EXPOSE 3000
   HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
     CMD curl -f http://localhost:3000/health || exit 1
   ```

### Issue 5: "Invalid MCP response format"

**Symptoms:**
- MCP client receives malformed responses
- JSON parsing errors in client logs

**Solutions:**

1. **Verify Server Implementation:**
   ```bash
   npm test  # This validates MCP protocol compliance
   ```

2. **Check Protocol Version:**
   - Ensure MCP client and server use compatible protocol versions
   - Current server supports protocol version `2024-11-05`

3. **Test with Minimal Configuration:**
   ```json
   {
     "mcpServers": {
       "document-converter": {
         "command": "node",
         "args": ["/absolute/path/to/dist/index.js"]
       }
     }
   }
   ```

## MCP Client Configuration

### Claude Desktop

**Configuration File Locations:**
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Mac: `~/.config/claude-desktop/claude_desktop_config.json`
- Linux: `~/.config/claude-desktop/claude_desktop_config.json`

**Recommended Configuration:**
```json
{
  "mcpServers": {
    "document-converter": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-document-converter/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Advanced Configuration:**
```json
{
  "mcpServers": {
    "document-converter": {
      "command": "node",
      "args": [
        "--max-old-space-size=2048",
        "/absolute/path/to/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info",
        "TEMP_DIR": "/tmp/mcp-converter"
      },
      "timeout": 30000
    }
  }
}
```

### Other MCP Clients

**Generic Configuration:**
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

## Environment Variables

### Server Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|----------|
| `NODE_ENV` | Runtime environment | `development` | `production` |
| `PORT` | HTTP server port | `3000` | `8080` |
| `NO_HTTP_SERVER` | Disable HTTP server | `false` | `true` |
| `LOG_LEVEL` | Logging level | `info` | `debug` |
| `TEMP_DIR` | Temporary files directory | OS default | `/tmp/mcp` |
| `MAX_FILE_SIZE` | Maximum file size | `50MB` | `100MB` |

### Usage Examples

```bash
# Production deployment
NODE_ENV=production PORT=3000 node dist/index.js

# MCP-only mode (no HTTP server)
NO_HTTP_SERVER=true node dist/index.js

# Debug mode
LOG_LEVEL=debug node dist/index.js

# Custom configuration
PORT=8080 TEMP_DIR=/custom/temp MAX_FILE_SIZE=100MB node dist/index.js
```

## Debugging Steps

### 1. Basic Validation

```bash
# Step 1: Verify installation
node --version
npm list

# Step 2: Build project
npm run build

# Step 3: Test MCP protocol
npm test

# Step 4: Test HTTP endpoints (if needed)
npm run test:http
```

### 2. Advanced Debugging

```bash
# Enable debug logging
DEBUG=mcp:* node dist/index.js

# Test with minimal environment
NO_HTTP_SERVER=true NODE_ENV=production node dist/index.js

# Check file permissions
ls -la dist/index.js
chmod +x dist/index.js
```

### 3. Client-Side Debugging

**Claude Desktop Logs:**
- Windows: `%APPDATA%\Claude\logs`
- Mac: `~/Library/Logs/Claude`
- Linux: `~/.config/claude-desktop/logs`

**Common Log Patterns:**
```
[ERROR] Failed to start MCP server: command not found
[ERROR] MCP server exited with code 1
[ERROR] Timeout waiting for server initialization
[ERROR] Invalid MCP response format
```

## Performance Optimization

### Memory Management

```json
{
  "mcpServers": {
    "document-converter": {
      "command": "node",
      "args": [
        "--max-old-space-size=2048",
        "--gc-interval=100",
        "/path/to/dist/index.js"
      ]
    }
  }
}
```

### File Processing Limits

```bash
# Set environment variables for limits
MAX_FILE_SIZE=100MB TEMP_DIR=/fast/ssd/temp node dist/index.js
```

### Concurrent Processing

```bash
# Limit concurrent operations
MAX_CONCURRENT_CONVERSIONS=3 node dist/index.js
```

## Security Considerations

### File Permissions

```bash
# Secure file permissions
chmod 755 dist/index.js
chown user:group dist/index.js

# Restrict configuration access
chmod 600 ~/.config/claude-desktop/claude_desktop_config.json
```

### Environment Variables

```bash
# Use environment files for sensitive data
echo "API_KEY=secret" > .env
echo ".env" >> .gitignore
```

### Network Security

```bash
# Bind to localhost only (default)
HOST=127.0.0.1 node dist/index.js

# Use HTTPS in production
HTTPS=true SSL_CERT=/path/to/cert.pem SSL_KEY=/path/to/key.pem node dist/index.js
```

## Monitoring and Maintenance

### Health Monitoring

```bash
# Create monitoring script
#!/bin/bash
while true; do
  if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "$(date): Health check failed" >> /var/log/mcp-monitor.log
    # Add restart logic here
  fi
  sleep 30
done
```

### Log Rotation

```bash
# Setup log rotation
node dist/index.js 2>&1 | rotatelogs /var/log/mcp-server.%Y%m%d.log 86400
```

### Automated Testing

```bash
# Add to CI/CD pipeline
npm run build
npm test
npm run test:http
```

## Getting Help

### Documentation References

- [MCP_CLIENT_CONFIG.md](./MCP_CLIENT_CONFIG.md) - Detailed client configuration
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guides
- [PLATFORM_CONFIG_GUIDE.md](./PLATFORM_CONFIG_GUIDE.md) - Platform-specific setup
- [HTTP_ENDPOINTS.md](./HTTP_ENDPOINTS.md) - API documentation
- [DOCKER_BUILD_GUIDE.md](./DOCKER_BUILD_GUIDE.md) - Docker optimization

### Diagnostic Tools

- `npm test` - Complete MCP protocol validation
- `npm run test:http` - HTTP endpoint testing
- `node diagnose.js` - Detailed HTTP diagnostics
- `node test-mcp-connection.js` - Full MCP connection testing

### Support Checklist

When seeking help, please provide:

1. **System Information:**
   ```bash
   node --version
   npm --version
   uname -a  # or systeminfo on Windows
   ```

2. **Test Results:**
   ```bash
   npm test 2>&1 | tee test-results.log
   ```

3. **Configuration:**
   - MCP client configuration (sanitized)
   - Environment variables used
   - Deployment platform details

4. **Error Logs:**
   - Server startup logs
   - MCP client logs
   - Any error messages

5. **Steps to Reproduce:**
   - Exact commands used
   - Expected vs actual behavior
   - When the issue started occurring

By following this comprehensive troubleshooting guide, you should be able to resolve most MCP Document Converter connection and configuration issues.