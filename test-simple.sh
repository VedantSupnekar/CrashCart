#!/bin/bash

echo "🔧 Testing System Diagnostics MCP Server..."
echo "==========================================="

# Test if server is running
echo "1. Checking if server is running on port 8181..."
if curl -s http://localhost:8181 > /dev/null; then
    echo "✅ Server is responding"
else
    echo "❌ Server is not responding. Make sure to run: npm run dev"
    exit 1
fi

echo ""
echo "2. Testing system info collection directly..."
echo "   (This will run the system commands directly to show what data we collect)"

echo ""
echo "📊 System Platform:"
node -e "console.log('Platform:', require('os').platform(), require('os').arch())"

echo ""
echo "💾 Memory Info:"
node -e "const os=require('os'); console.log('Total:', Math.round(os.totalmem()/(1024**3))+'GB', 'Free:', Math.round(os.freemem()/(1024**3))+'GB')"

echo ""
echo "💻 CPU Info:"
node -e "const os=require('os'); console.log('Cores:', os.cpus().length, 'Model:', os.cpus()[0].model.substring(0,50)+'...')"

echo ""
echo "⏱️ Uptime:"
node -e "const os=require('os'); const uptime=os.uptime(); console.log(Math.floor(uptime/3600)+'h', Math.floor((uptime%3600)/60)+'m')"

echo ""
echo "💽 Disk Usage:"
if [[ "$OSTYPE" == "darwin"* ]]; then
    df -h | head -5
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    df -h | head -5
else
    echo "Windows detected - would show disk info"
fi

echo ""
echo "🔄 Top Processes:"
if [[ "$OSTYPE" == "darwin"* ]]; then
    ps aux | sort -nr -k 3 | head -6
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    ps aux --sort=-%cpu | head -6
else
    echo "Windows detected - would show process info"
fi

echo ""
echo "✅ This is the kind of data your MCP server collects!"
echo ""
echo "🚀 To test the actual MCP server:"
echo "   1. The server is running at http://localhost:8181"
echo "   2. Use an MCP client (like Claude Desktop) to connect"
echo "   3. Or use the Smithery web interface at https://smithery.ai"
