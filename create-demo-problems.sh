#!/bin/bash

echo "🎭 Creating Demo Problems for Hackathon Presentation"
echo "===================================================="
echo ""

# Create a temporary directory for demo files
DEMO_DIR="$HOME/demo_system_problems"
mkdir -p "$DEMO_DIR"

echo "1. 💾 Creating Disk Space Problem (Safe)"
echo "----------------------------------------"
# Create large temporary files to simulate disk usage
mkdir -p "$DEMO_DIR/fake_logs"
mkdir -p "$DEMO_DIR/fake_cache"

# Create fake log files (100MB each)
echo "Creating fake system logs..."
for i in {1..3}; do
    head -c 100M < /dev/zero > "$DEMO_DIR/fake_logs/system_log_$i.log"
done

# Create fake cache files (50MB each)
echo "Creating fake cache files..."
for i in {1..5}; do
    head -c 50M < /dev/zero > "$DEMO_DIR/fake_cache/cache_file_$i.tmp"
done

echo "✅ Created ~550MB of demo 'problem' files in $DEMO_DIR"
echo ""

echo "2. 🧠 Creating Memory Pressure (Safe)"
echo "-------------------------------------"
echo "Starting memory-intensive demo processes..."

# Create a Node.js script that consumes memory safely
cat > "$DEMO_DIR/memory_hog.js" << 'EOF'
// Safe memory consumer for demo
const arrays = [];
const targetMB = 200; // Consume 200MB
const chunkSize = 1024 * 1024; // 1MB chunks

console.log(`Demo: Consuming ${targetMB}MB of memory safely...`);

for (let i = 0; i < targetMB; i++) {
    arrays.push(new Array(chunkSize / 4).fill(i)); // Fill with numbers
}

console.log(`Demo: Memory allocated. Process PID: ${process.pid}`);
console.log('Demo: Will automatically exit in 5 minutes...');

// Auto-cleanup after 5 minutes
setTimeout(() => {
    console.log('Demo: Cleaning up memory...');
    process.exit(0);
}, 5 * 60 * 1000);

// Keep process alive
setInterval(() => {
    console.log(`Demo: Still running... Memory usage: ~${targetMB}MB`);
}, 30000);
EOF

# Start the memory hog in background
node "$DEMO_DIR/memory_hog.js" &
MEMORY_PID=$!
echo "✅ Started memory-intensive process (PID: $MEMORY_PID)"
echo ""

echo "3. 🔄 Creating CPU Load (Safe)"
echo "------------------------------"
# Create a CPU-intensive but controlled process
cat > "$DEMO_DIR/cpu_hog.js" << 'EOF'
// Safe CPU consumer for demo
console.log(`Demo: Creating moderate CPU load... PID: ${process.pid}`);
console.log('Demo: Will automatically exit in 5 minutes...');

let counter = 0;
const startTime = Date.now();

function cpuWork() {
    // Do some CPU work but yield periodically
    for (let i = 0; i < 100000; i++) {
        counter += Math.sqrt(i);
    }
    
    // Yield to prevent system freeze
    setTimeout(cpuWork, 10);
    
    // Auto-cleanup after 5 minutes
    if (Date.now() - startTime > 5 * 60 * 1000) {
        console.log('Demo: CPU work complete, exiting...');
        process.exit(0);
    }
}

cpuWork();

// Status updates
setInterval(() => {
    console.log(`Demo: CPU work ongoing... Counter: ${counter}`);
}, 30000);
EOF

# Start CPU hog in background
node "$DEMO_DIR/cpu_hog.js" &
CPU_PID=$!
echo "✅ Started CPU-intensive process (PID: $CPU_PID)"
echo ""

echo "4. 📊 Creating Process Clutter"
echo "------------------------------"
# Start a few harmless background processes
for i in {1..3}; do
    sleep 300 &  # 5-minute sleepers
    echo "Started demo sleep process: $!"
done

echo "✅ Started additional background processes"
echo ""

echo "🎯 Demo Problems Created Successfully!"
echo "====================================="
echo ""
echo "📁 Files created in: $DEMO_DIR"
echo "🧠 Memory hog PID: $MEMORY_PID"
echo "🔄 CPU hog PID: $CPU_PID"
echo ""
echo "🚀 Now run your MCP tools to detect and solve these problems:"
echo ""
echo "1. detect_problems  - Will find high memory, CPU, and processes"
echo "2. find_solutions   - Will match solutions to detected problems"
echo "3. apply_solution   - Will clean up the demo problems"
echo ""
echo "🧹 To manually clean up demo problems:"
echo "  rm -rf '$DEMO_DIR'"
echo "  kill $MEMORY_PID $CPU_PID 2>/dev/null"
echo "  killall sleep 2>/dev/null"
echo ""
echo "⏰ Demo processes will auto-cleanup in 5 minutes"
