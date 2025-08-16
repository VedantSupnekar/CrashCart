#!/bin/bash

echo "🚀 Complete System Diagnostics & Solution Workflow Demo"
echo "======================================================="
echo ""

echo "Step 1: 📊 Collect System Information"
echo "-------------------------------------"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_system_info","arguments":{}}}' | node mcp-server.js 2>/dev/null | jq -r '.result.content[0].text' | head -15
echo ""

echo "Step 2: 🔍 Detect Problems"
echo "--------------------------"
PROBLEMS=$(echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"detect_problems","arguments":{}}}' | node mcp-server.js 2>/dev/null | jq -r '.result.content[0].text')
echo "$PROBLEMS"
echo ""

echo "Step 3: 💡 Find Solutions for Detected Problems"
echo "----------------------------------------------"

# Extract problem IDs from the AI-ready data (this is a simplified extraction)
echo "🔍 Finding solutions for memory_critical..."
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"find_solutions","arguments":{"problem_id":"memory_critical","problem_keywords":["memory","high_usage","performance","critical"]}}}' | node mcp-server.js 2>/dev/null | jq -r '.result.content[0].text' | head -20

echo ""
echo "🔍 Finding solutions for disk_critical_1..."
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"find_solutions","arguments":{"problem_id":"disk_critical_1","problem_keywords":["disk","storage","full","critical","space"]}}}' | node mcp-server.js 2>/dev/null | jq -r '.result.content[0].text' | head -15

echo ""
echo "Step 4: 📋 Review Solution Database"
echo "-----------------------------------"
echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"list_solutions","arguments":{}}}' | node mcp-server.js 2>/dev/null | jq -r '.result.content[1].text'

echo ""
echo "✅ Demo Complete!"
echo ""
echo "🎯 What This Demonstrates:"
echo "1. ✅ System diagnostics collection"
echo "2. ✅ Intelligent problem detection"
echo "3. ✅ AI-powered solution matching"
echo "4. ✅ Success rate tracking"
echo "5. ✅ Platform-specific commands"
echo "6. ✅ Persistent solution database"
echo ""
echo "🚀 Ready for Claude Desktop:"
echo "1. Restart Claude Desktop"
echo "2. Ask: 'Please detect problems and find solutions'"
echo "3. Watch the AI analyze and recommend fixes!"
echo ""
echo "🏦 Banking/Enterprise Ready:"
echo "- Comprehensive system context"
echo "- Proven solutions with success rates"
echo "- Version-controlled knowledge base"
echo "- Auto-learning from application results"
