#!/bin/bash

echo "🔧 Creating Custom Banking Problem (No Solution in Database)"
echo "==========================================================="
echo "🎯 This creates a unique problem to demonstrate the support ticket workflow"
echo ""

# Create custom problem directory
CUSTOM_DIR="$HOME/custom_banking_problem"
mkdir -p "$CUSTOM_DIR"/{logs,config,temp}

echo "Creating Custom Integration Failure Problem..."

# Create logs for a custom integration failure
cat > "$CUSTOM_DIR/logs/integration_failure.log" << 'EOF'
2024-08-16 15:30:00 [ERROR] ThirdPartyAPI: Connection timeout to payment-gateway-v3.bank.com
2024-08-16 15:30:05 [CRITICAL] Integration: Legacy COBOL system communication failure
2024-08-16 15:30:10 [ERROR] ThirdPartyAPI: SSL handshake failed with credit-check-service.gov
2024-08-16 15:30:15 [CRITICAL] Integration: Message queue overflow - 50,000 pending transactions
2024-08-16 15:30:20 [ERROR] ThirdPartyAPI: Authentication failed for regulatory-reporting-api.fed.gov
2024-08-16 15:30:25 [CRITICAL] Integration: Data format mismatch - ISO 20022 vs proprietary format
EOF

# Create config showing the integration issue
cat > "$CUSTOM_DIR/config/integration_config.xml" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<integration_config>
    <service name="payment_gateway_v3" status="FAILED" last_success="2024-08-15T09:00:00Z"/>
    <service name="cobol_mainframe" status="TIMEOUT" last_success="2024-08-16T08:30:00Z"/>
    <service name="credit_check_api" status="SSL_ERROR" last_success="2024-08-16T14:45:00Z"/>
    <service name="regulatory_api" status="AUTH_FAILED" last_success="2024-08-16T10:15:00Z"/>
    <message_queue current_size="50000" max_size="10000" status="OVERFLOW"/>
    <data_format_errors count="1247" type="ISO_20022_MISMATCH"/>
</integration_config>
EOF

# Create temporary error files
echo "INTEGRATION_FAILURE_MARKER_FILE" > "$CUSTOM_DIR/temp/integration_error.tmp"
echo "LEGACY_SYSTEM_COMMUNICATION_FAILURE" > "$CUSTOM_DIR/temp/cobol_error.tmp"
echo "THIRD_PARTY_API_AUTHENTICATION_ISSUES" > "$CUSTOM_DIR/temp/api_auth_error.tmp"

# Start a process that simulates the integration failure
cat > "$CUSTOM_DIR/integration_failure_simulator.js" << 'EOF'
// Simulate integration failure
console.log('DEMO: Banking integration failure simulator started');
console.log('DEMO: Simulating third-party API connection issues...');

let errorCount = 0;
function simulateIntegrationFailure() {
    errorCount++;
    
    if (errorCount % 100 === 0) {
        console.log(`DEMO: Integration failure - ${errorCount} failed API calls, message queue backing up...`);
    }
    
    // Simulate some CPU work for the failing integration attempts
    for (let i = 0; i < 10000; i++) {
        Math.random() * Math.sqrt(i);
    }
    
    // Continue failing until stopped
    setTimeout(simulateIntegrationFailure, 50);
}

simulateIntegrationFailure();

// Auto-cleanup after 10 minutes
setTimeout(() => {
    console.log('DEMO: Integration failure simulator stopping...');
    process.exit(0);
}, 10 * 60 * 1000);
EOF

# Start the integration failure simulator
node "$CUSTOM_DIR/integration_failure_simulator.js" &
INTEGRATION_PID=$!

echo "✅ Custom banking integration problem created!"
echo ""
echo "📋 Problem Details:"
echo "   • Third-party API connection failures"
echo "   • Legacy COBOL system communication issues"  
echo "   • SSL handshake failures with government APIs"
echo "   • Message queue overflow (50K pending transactions)"
echo "   • Data format mismatches (ISO 20022 vs proprietary)"
echo ""
echo "🎯 This problem is NOT in the solution database!"
echo "   Claude should offer to create a support ticket when no solution is found."
echo ""
echo "📁 Problem files created in: $CUSTOM_DIR"
echo "🔄 Integration failure simulator PID: $INTEGRATION_PID"
echo ""
echo "🚀 Ready for Claude Desktop demo:"
echo "1. Ask Claude to 'detect problems' - it will find the integration failure"
echo "2. Ask for solutions - Claude will find no matches"
echo "3. Claude should offer to create a support ticket"
echo "4. Accept the ticket creation"
echo "5. Wait 3+ minutes and check ticket status"
echo "6. Simulate support resolution"
echo "7. View the updated database with the new solution"
echo ""
echo "🧹 Integration simulator will auto-cleanup in 10 minutes"
