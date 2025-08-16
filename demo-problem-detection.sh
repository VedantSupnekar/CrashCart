#!/bin/bash

echo "🔍 System Diagnostics & Problem Detection Demo"
echo "=============================================="
echo ""

echo "1. 📊 Collecting System Information..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_system_info","arguments":{}}}' | node mcp-server.js 2>/dev/null | jq -r '.result.content[0].text' | head -20

echo ""
echo "2. 🚨 Running Problem Detection..."
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"detect_problems","arguments":{}}}' | node mcp-server.js 2>/dev/null | jq -r '.result.content[0].text'

echo ""
echo "3. 🤖 AI-Ready Problem Data (JSON):"
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"detect_problems","arguments":{}}}' | node mcp-server.js 2>/dev/null | jq -r '.result.content[1].text' | grep -A 50 "AI-Ready Problem Data"

echo ""
echo "✅ Demo Complete!"
echo ""
echo "🚀 Next Steps:"
echo "1. Restart Claude Desktop"
echo "2. Ask: 'Please run detect_problems to analyze my system'"
echo "3. See the intelligent problem detection in action!"
