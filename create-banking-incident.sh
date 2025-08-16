#!/bin/bash

echo "🏦 Creating Sophisticated Banking Incident Simulation"
echo "====================================================="
echo "🎯 Simulating real banking system failures for enterprise demo"
echo ""

# Create banking incident demo directory
DEMO_DIR="$HOME/banking_incident_demo"
mkdir -p "$DEMO_DIR"/{logs,services,database,security,network}

echo "1. 🚨 Creating Security Breach Scenario"
echo "--------------------------------------"

# Create security logs showing breach
cat > "$DEMO_DIR/logs/security_monitor.log" << 'EOF'
2024-08-16 14:23:15 [WARN] Multiple failed login attempts detected: admin user
2024-08-16 14:23:18 [ALERT] Suspicious outbound connection to 45.142.122.33:443
2024-08-16 14:23:22 [CRITICAL] Privilege escalation attempt detected on user account 'service_payment'
2024-08-16 14:23:25 [ALERT] Unusual data access pattern: customer_accounts table
2024-08-16 14:23:30 [CRITICAL] Potential data exfiltration: 50MB transferred to external IP
2024-08-16 14:23:35 [ALERT] Malware signature detected: Banking.Trojan.Zeus.variant
EOF

cat > "$DEMO_DIR/logs/network_monitor.log" << 'EOF'
2024-08-16 14:23:40 [ALERT] Suspicious outbound connection to known malware C&C domains
2024-08-16 14:23:45 [WARN] Unusual network traffic spike: 500% increase in outbound connections
2024-08-16 14:23:50 [CRITICAL] Communication with blacklisted IP ranges detected
2024-08-16 14:23:55 [ALERT] DNS queries to suspicious domains: banking-secure-update[.]tk
2024-08-16 14:24:00 [CRITICAL] Encrypted tunnel established to unauthorized endpoint
EOF

cat > "$DEMO_DIR/logs/auth_failures.log" << 'EOF'
AUTH_FAIL: 2024-08-16 14:20:10 - admin from 192.168.1.100
AUTH_FAIL: 2024-08-16 14:20:15 - admin from 192.168.1.100
AUTH_FAIL: 2024-08-16 14:20:20 - admin from 192.168.1.100
AUTH_FAIL: 2024-08-16 14:20:25 - service_payment from 10.0.0.50
AUTH_FAIL: 2024-08-16 14:20:30 - service_payment from 10.0.0.50
AUTH_FAIL: 2024-08-16 14:20:35 - db_admin from 10.0.0.25
AUTH_FAIL: 2024-08-16 14:20:40 - api_gateway from 10.0.0.75
AUTH_SUCCESS: 2024-08-16 14:23:45 - service_payment from 10.0.0.50 [SUSPICIOUS: After multiple failures]
EOF

echo "✅ Security breach logs created"

echo ""
echo "2. 💳 Creating Payment Service Degradation"
echo "------------------------------------------"

# Create payment service issues
cat > "$DEMO_DIR/services/payment_service.log" << 'EOF'
2024-08-16 14:25:00 [ERROR] Database connection pool exhausted: 0/50 connections available
2024-08-16 14:25:05 [ERROR] Transaction timeout: Payment ID 78234 failed after 30s
2024-08-16 14:25:10 [CRITICAL] Payment processing queue backed up: 2,847 pending transactions
2024-08-16 14:25:15 [ERROR] Database connection pool exhausted: 0/50 connections available
2024-08-16 14:25:20 [ERROR] Transaction timeout: Payment ID 78235 failed after 30s
2024-08-16 14:25:25 [WARN] Payment success rate dropped to 23% (normally 99.8%)
2024-08-16 14:25:30 [CRITICAL] Revenue impact: $2.3M in failed transactions in last 5 minutes
2024-08-16 14:25:35 [ERROR] Database deadlock detected in customer_accounts table
EOF

# Start memory leak simulator for payment service
cat > "$DEMO_DIR/memory_leak_simulator.js" << 'EOF'
// Simulate memory leak in payment service
console.log('DEMO: Payment service memory leak simulator started');
const leaks = [];
let counter = 0;

function simulateMemoryLeak() {
    // Allocate memory without releasing
    const bigArray = new Array(100000).fill(`payment_transaction_${counter++}`);
    leaks.push(bigArray);
    
    if (counter % 100 === 0) {
        console.log(`DEMO: Payment service memory usage: ~${Math.round(leaks.length * 0.8)}MB (${leaks.length} leaked objects)`);
    }
    
    // Continue leaking until stopped
    setTimeout(simulateMemoryLeak, 100);
}

simulateMemoryLeak();

// Auto-cleanup after 10 minutes
setTimeout(() => {
    console.log('DEMO: Payment service memory leak simulator stopping...');
    process.exit(0);
}, 10 * 60 * 1000);
EOF

node "$DEMO_DIR/memory_leak_simulator.js" &
PAYMENT_PID=$!
echo "✅ Payment service degradation created (PID: $PAYMENT_PID)"

echo ""
echo "3. 🔗 Creating API Service Overload"
echo "-----------------------------------"

cat > "$DEMO_DIR/services/api_gateway.log" << 'EOF'
2024-08-16 14:26:00 [WARN] API rate limit exceeded for partner: MegaBank_API (1000/min limit)
2024-08-16 14:26:05 [ERROR] Circuit breaker OPEN for service: account_verification
2024-08-16 14:26:10 [WARN] API rate limit exceeded for partner: FinTech_Partners (500/min limit)
2024-08-16 14:26:15 [ERROR] Circuit breaker OPEN for service: payment_processing
2024-08-16 14:26:20 [CRITICAL] 15 partner APIs affected by service degradation
2024-08-16 14:26:25 [ERROR] Partner SLA breach: Response time 45s (SLA: 2s)
2024-08-16 14:26:30 [WARN] API gateway CPU usage: 98% (threshold: 80%)
EOF

# Start database load simulator
cat > "$DEMO_DIR/database_load_simulator.js" << 'EOF'
// Simulate high database load
console.log('DEMO: Database load simulator started');
let queryCounter = 0;

function simulateDbLoad() {
    queryCounter++;
    
    // Simulate CPU-intensive "database queries"
    for (let i = 0; i < 50000; i++) {
        Math.sqrt(i * queryCounter);
    }
    
    if (queryCounter % 1000 === 0) {
        console.log(`DEMO: Simulated ${queryCounter} database queries, CPU load increasing...`);
    }
    
    // Continue until stopped
    setImmediate(simulateDbLoad);
}

simulateDbLoad();

// Auto-cleanup after 10 minutes
setTimeout(() => {
    console.log('DEMO: Database load simulator stopping...');
    process.exit(0);
}, 10 * 60 * 1000);
EOF

node "$DEMO_DIR/database_load_simulator.js" &
DB_LOAD_PID=$!
echo "✅ API service overload created (PID: $DB_LOAD_PID)"

echo ""
echo "4. 💾 Creating Data Integrity Issues"
echo "------------------------------------"

cat > "$DEMO_DIR/database/customer_db.log" << 'EOF'
2024-08-16 14:27:00 [ERROR] Slow query detected: SELECT * FROM customer_accounts (45.2s execution time)
2024-08-16 14:27:05 [CRITICAL] Table corruption detected: customer_transactions.ibd
2024-08-16 14:27:10 [ERROR] Deadlock detected: customer_accounts vs transaction_history
2024-08-16 14:27:15 [CRITICAL] Backup process failed: Insufficient disk space
2024-08-16 14:27:20 [ERROR] Index corruption detected: idx_customer_account_number
2024-08-16 14:27:25 [CRITICAL] Data integrity check failed: 1,247 inconsistent records
2024-08-16 14:27:30 [ERROR] Backup process failed: Network timeout to backup server
EOF

# Create fake corrupted database file
echo "CORRUPTED_DATA_SIMULATION_FILE" > "$DEMO_DIR/database/customer_db.log.corrupt"

echo "✅ Data integrity issues created"

echo ""
echo "5. 📊 Creating Compliance & Monitoring Files"
echo "--------------------------------------------"

cat > "$DEMO_DIR/security/compliance_report.log" << 'EOF'
COMPLIANCE_ALERT: PCI-DSS violation detected - unencrypted card data in memory
COMPLIANCE_ALERT: SOX compliance breach - unauthorized access to financial data
COMPLIANCE_ALERT: GDPR violation risk - customer data potentially compromised
AUDIT_TRAIL: Suspicious administrative actions detected
REGULATORY_NOTICE: Incident must be reported to financial authorities within 24h
EOF

cat > "$DEMO_DIR/network/firewall_rules.conf" << 'EOF'
# Emergency firewall rules for incident response
block out from any to 45.142.122.33
block out from any to banking-secure-update.tk
block in from 192.168.1.100 to any
log all
EOF

echo "✅ Compliance and monitoring files created"

echo ""
echo "🎯 Banking Incident Simulation Complete!"
echo "========================================"
echo ""
echo "📁 Incident files created in: $DEMO_DIR"
echo "🧠 Payment memory leak PID: $PAYMENT_PID"
echo "🔄 Database load simulator PID: $DB_LOAD_PID"
echo ""
echo "🚨 SIMULATED INCIDENT SUMMARY:"
echo "1. 🔐 Security Breach: Malware detected, data exfiltration attempt"
echo "2. 💳 Payment Crisis: Service down, $2.3M revenue at risk"  
echo "3. 🔗 API Overload: Partner integrations failing, SLA breaches"
echo "4. 💾 Data Integrity: Database corruption, backup failures"
echo "5. ⚖️ Compliance Risk: PCI-DSS, SOX, GDPR violations detected"
echo ""
echo "🚀 Ready for Claude Desktop demo:"
echo "1. Ask Claude to 'detect banking system problems'"
echo "2. Watch it find multiple critical issues"
echo "3. Request solutions for each problem type"
echo "4. Apply solutions and see the resolution"
echo ""
echo "🧹 To clean up incident:"
echo "  rm -rf '$DEMO_DIR'"
echo "  kill $PAYMENT_PID $DB_LOAD_PID 2>/dev/null"
echo ""
echo "⏰ Simulators will auto-cleanup in 10 minutes"
