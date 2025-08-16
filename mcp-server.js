#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";

const execAsync = promisify(exec);

// Configuration schema
const configSchema = z.object({
  debug: z.boolean().default(false),
  enableSystemInfo: z.boolean().default(true),
  enableLogs: z.boolean().default(true),
  enableNetwork: z.boolean().default(true),
  enablePerformance: z.boolean().default(true),
  enableProblemDetection: z.boolean().default(true),
});

// Problem detection rules and thresholds
const PROBLEM_THRESHOLDS = {
  memory: {
    high_usage: 85, // % memory usage
    very_high_usage: 95,
  },
  cpu: {
    high_load: 80, // % CPU usage over load average
    sustained_load: 70, // % for sustained periods
  },
  disk: {
    high_usage: 90, // % disk usage
    very_high_usage: 95,
    low_free_space: 5, // GB remaining
  },
  processes: {
    memory_hog: 20, // % of total memory used by single process
    cpu_hog: 50, // % CPU used by single process
  },
  uptime: {
    needs_restart: 30 * 24 * 3600, // 30 days in seconds
  },
};

// Solution Database Schema and Management
const SOLUTION_DB_PATH = './solutions_database.json';

// Initialize solution database with some example solutions
const DEFAULT_SOLUTIONS = [
  {
    id: 'memory_critical_solution_1',
    problem_patterns: ['memory_critical', 'memory_high'],
    title: 'Free Up Memory - Close Resource-Heavy Applications',
    description: 'Close unnecessary applications and browser tabs to free up memory',
    solution_type: 'process_management',
    commands: [
      {
        platform: 'darwin',
        command: 'osascript -e "tell application \\"Google Chrome\\" to close every tab of every window"',
        description: 'Close all Chrome tabs',
        risk_level: 'low'
      },
      {
        platform: 'darwin', 
        command: 'killall -STOP "Google Chrome Helper"',
        description: 'Suspend Chrome helper processes',
        risk_level: 'medium'
      }
    ],
    system_requirements: {
      platforms: ['darwin', 'linux', 'win32'],
      min_memory_gb: 0,
      requires_admin: false
    },
    success_rate: 0.85,
    application_count: 42,
    success_count: 36,
    last_updated: '2024-08-16T18:00:00Z',
    version: '1.2.0',
    keywords: ['memory', 'chrome', 'browser', 'cleanup'],
    created_by: 'system',
    notes: 'Works well for browser-related memory issues'
  },
  {
    id: 'disk_critical_solution_1',
    problem_patterns: ['disk_critical_*', 'disk_high_*'],
    title: 'Clean Temporary Files and Cache',
    description: 'Remove temporary files, cache, and logs to free up disk space',
    solution_type: 'cleanup',
    commands: [
      {
        platform: 'darwin',
        command: 'sudo rm -rf /private/var/log/asl/*.asl',
        description: 'Clear system logs',
        risk_level: 'low'
      },
      {
        platform: 'darwin',
        command: 'rm -rf ~/Library/Caches/*',
        description: 'Clear user cache',
        risk_level: 'low'
      },
      {
        platform: 'linux',
        command: 'sudo apt-get clean && sudo apt-get autoremove',
        description: 'Clean package cache',
        risk_level: 'low'
      }
    ],
    system_requirements: {
      platforms: ['darwin', 'linux'],
      min_memory_gb: 0,
      requires_admin: true
    },
    success_rate: 0.92,
    application_count: 28,
    success_count: 26,
    last_updated: '2024-08-16T18:00:00Z',
    version: '1.1.0',
    keywords: ['disk', 'cleanup', 'cache', 'temporary'],
    created_by: 'system',
    notes: 'Effective for most disk space issues'
  },
  {
    id: 'cpu_high_load_solution_1',
    problem_patterns: ['cpu_high_load', 'process_cpu_hog_*'],
    title: 'Reduce CPU Load - Process Management',
    description: 'Identify and manage high-CPU processes',
    solution_type: 'process_management',
    commands: [
      {
        platform: 'darwin',
        command: 'sudo renice +10 -p {process_pid}',
        description: 'Lower process priority',
        risk_level: 'medium'
      },
      {
        platform: 'linux',
        command: 'sudo renice +10 -p {process_pid}',
        description: 'Lower process priority', 
        risk_level: 'medium'
      }
    ],
    system_requirements: {
      platforms: ['darwin', 'linux'],
      min_memory_gb: 0,
      requires_admin: true
    },
    success_rate: 0.78,
    application_count: 15,
    success_count: 12,
    last_updated: '2024-08-16T18:00:00Z',
    version: '1.0.0',
    keywords: ['cpu', 'process', 'priority', 'performance'],
    created_by: 'system',
    notes: 'Requires process PID to be substituted'
  },
  {
    id: 'demo_cleanup_solution',
    problem_patterns: ['memory_critical', 'memory_high', 'cpu_high_load', 'process_cpu_hog_*', 'process_memory_hog_*'],
    title: 'Clean Demo Problems (Hackathon Demo)',
    description: 'Clean up artificial problems created for hackathon demonstration',
    solution_type: 'demo_cleanup',
    commands: [
      {
        platform: 'darwin',
        command: 'rm -rf ~/demo_system_problems',
        description: 'Remove demo problem files',
        risk_level: 'low'
      },
      {
        platform: 'darwin',
        command: 'pkill -f "memory_hog.js cpu_hog.js"',
        description: 'Stop demo processes',
        risk_level: 'low'
      },
      {
        platform: 'linux',
        command: 'rm -rf ~/demo_system_problems',
        description: 'Remove demo problem files',
        risk_level: 'low'
      },
      {
        platform: 'linux',
        command: 'pkill -f "memory_hog.js cpu_hog.js"',
        description: 'Stop demo processes',
        risk_level: 'low'
      }
    ],
    system_requirements: {
      platforms: ['darwin', 'linux'],
      min_memory_gb: 0,
      requires_admin: false
    },
    success_rate: 1.0,
    application_count: 0,
    success_count: 0,
    last_updated: '2024-08-16T19:00:00Z',
    version: '1.0.0',
    keywords: ['demo', 'cleanup', 'hackathon', 'memory', 'cpu', 'process'],
    created_by: 'system',
    notes: 'Demo solution for hackathon presentation - cleans up artificial problems'
  },
  {
    id: 'security_incident_response',
    problem_patterns: ['security_breach_detected', 'malware_communication_detected'],
    title: 'Security Incident Response - Immediate Threat Containment',
    description: 'Comprehensive security incident response including threat isolation and evidence preservation',
    solution_type: 'security_response',
    commands: [
      {
        platform: 'darwin',
        command: 'sudo pfctl -f /etc/pf.conf && sudo pfctl -e',
        description: 'Activate firewall and block suspicious connections',
        risk_level: 'medium'
      },
      {
        platform: 'darwin',
        command: 'sudo dscl . -passwd /Users/admin $(openssl rand -base64 12)',
        description: 'Reset compromised admin password',
        risk_level: 'high'
      },
      {
        platform: 'linux',
        command: 'sudo iptables -A OUTPUT -d 45.142.122.33 -j DROP',
        description: 'Block malicious IP addresses',
        risk_level: 'medium'
      }
    ],
    system_requirements: {
      platforms: ['darwin', 'linux'],
      min_memory_gb: 0,
      requires_admin: true
    },
    success_rate: 0.94,
    application_count: 67,
    success_count: 63,
    last_updated: '2024-08-16T20:00:00Z',
    version: '2.1.0',
    keywords: ['security', 'incident', 'response', 'firewall', 'isolation', 'breach'],
    created_by: 'security_team',
    notes: 'Critical security response - isolates threats and preserves evidence for forensics'
  },
  {
    id: 'payment_service_recovery',
    problem_patterns: ['payment_service_degradation', 'database_performance_degradation'],
    title: 'Payment Service Recovery - Database & Connection Pool Optimization',
    description: 'Restore payment service functionality by optimizing database connections and clearing bottlenecks',
    solution_type: 'service_recovery',
    commands: [
      {
        platform: 'darwin',
        command: 'pkill -f "memory_leak_simulator"; pkill -f "database_load_simulator"',
        description: 'Stop resource-intensive simulation processes',
        risk_level: 'low'
      },
      {
        platform: 'darwin',
        command: 'echo "OPTIMIZE TABLE customer_transactions;" | mysql -u admin -p banking_db',
        description: 'Optimize corrupted database tables',
        risk_level: 'medium'
      },
      {
        platform: 'linux',
        command: 'systemctl restart payment-service && systemctl restart database-pool',
        description: 'Restart payment services and connection pools',
        risk_level: 'medium'
      }
    ],
    system_requirements: {
      platforms: ['darwin', 'linux'],
      min_memory_gb: 4,
      requires_admin: true
    },
    success_rate: 0.91,
    application_count: 43,
    success_count: 39,
    last_updated: '2024-08-16T20:00:00Z',
    version: '1.8.0',
    keywords: ['payment', 'service', 'database', 'recovery', 'optimization', 'revenue'],
    created_by: 'platform_team',
    notes: 'Critical for revenue protection - restores payment processing capability'
  },
  {
    id: 'api_service_scaling',
    problem_patterns: ['api_service_overload'],
    title: 'API Service Scaling - Rate Limit & Circuit Breaker Recovery',
    description: 'Scale API services and reset rate limits to restore partner connectivity',
    solution_type: 'scaling',
    commands: [
      {
        platform: 'darwin',
        command: 'redis-cli FLUSHDB && redis-cli SET rate_limit_reset "$(date +%s)"',
        description: 'Reset API rate limiting counters',
        risk_level: 'low'
      },
      {
        platform: 'darwin',
        command: 'curl -X POST http://localhost:8080/admin/circuit-breaker/reset',
        description: 'Reset circuit breakers for partner APIs',
        risk_level: 'low'
      }
    ],
    system_requirements: {
      platforms: ['darwin', 'linux'],
      min_memory_gb: 2,
      requires_admin: false
    },
    success_rate: 0.88,
    application_count: 29,
    success_count: 25,
    last_updated: '2024-08-16T20:00:00Z',
    version: '1.3.0',
    keywords: ['api', 'scaling', 'rate_limit', 'circuit_breaker', 'partners'],
    created_by: 'api_team',
    notes: 'Restores partner connectivity and prevents service degradation'
  },
  {
    id: 'data_integrity_restoration',
    problem_patterns: ['data_integrity_risk'],
    title: 'Data Integrity Restoration - Backup Recovery & Corruption Repair',
    description: 'Restore data integrity through backup recovery and database repair procedures',
    solution_type: 'data_recovery',
    commands: [
      {
        platform: 'darwin',
        command: 'rm -rf ~/banking_incident_demo/database/customer_db.log.corrupt',
        description: 'Clear corrupted database logs',
        risk_level: 'low'
      },
      {
        platform: 'linux',
        command: 'mysqldump -u backup -p banking_db > /backup/emergency_backup_$(date +%Y%m%d).sql',
        description: 'Create emergency database backup',
        risk_level: 'low'
      }
    ],
    system_requirements: {
      platforms: ['darwin', 'linux'],
      min_memory_gb: 8,
      requires_admin: true
    },
    success_rate: 0.96,
    application_count: 18,
    success_count: 17,
    last_updated: '2024-08-16T20:00:00Z',
    version: '1.5.0',
    keywords: ['data', 'integrity', 'backup', 'recovery', 'corruption', 'compliance'],
    created_by: 'data_team',
    notes: 'Critical for compliance and data protection - prevents data loss'
  },
  {
    id: 'banking_incident_cleanup',
    problem_patterns: ['incident_simulation_active', 'security_breach_detected', 'payment_service_degradation', 'data_integrity_risk'],
    title: 'Complete Banking Incident Cleanup & System Restoration',
    description: 'Comprehensive cleanup of banking incident simulation and full system restoration',
    solution_type: 'incident_cleanup',
    commands: [
      {
        platform: 'darwin',
        command: 'rm -rf ~/banking_incident_demo',
        description: 'Remove all incident simulation files',
        risk_level: 'low'
      },
      {
        platform: 'darwin',
        command: 'pkill -f "memory_leak_simulator"; pkill -f "database_load_simulator"',
        description: 'Terminate all simulation processes',
        risk_level: 'low'
      },
      {
        platform: 'linux',
        command: 'systemctl restart security-monitoring && systemctl restart payment-gateway',
        description: 'Restart critical banking services',
        risk_level: 'medium'
      }
    ],
    system_requirements: {
      platforms: ['darwin', 'linux'],
      min_memory_gb: 0,
      requires_admin: false
    },
    success_rate: 1.0,
    application_count: 0,
    success_count: 0,
    last_updated: '2024-08-16T20:00:00Z',
    version: '1.0.0',
    keywords: ['banking', 'incident', 'cleanup', 'restoration', 'security', 'payment', 'demo'],
    created_by: 'system',
    notes: 'Complete incident response cleanup - restores all banking services to normal operation'
  }
];

// Solution Database Functions
async function initializeSolutionDatabase() {
  try {
    // Check if database exists
    await fs.access(SOLUTION_DB_PATH);
  } catch (error) {
    // Database doesn't exist, create it with default solutions
    console.error('Creating new solution database with default solutions');
    await saveSolutionDatabase(DEFAULT_SOLUTIONS);
  }
}

async function loadSolutionDatabase() {
  try {
    const data = await fs.readFile(SOLUTION_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading solution database:', error);
    return DEFAULT_SOLUTIONS;
  }
}

async function saveSolutionDatabase(solutions) {
  try {
    await fs.writeFile(SOLUTION_DB_PATH, JSON.stringify(solutions, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving solution database:', error);
    return false;
  }
}

// Find solutions matching a problem
function findMatchingSolutions(problemId, problemKeywords, systemContext, solutions) {
  const matches = [];
  
  solutions.forEach(solution => {
    let score = 0;
    let reasons = [];
    
    // Check if problem pattern matches
    const patternMatch = solution.problem_patterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(problemId);
      }
      return pattern === problemId;
    });
    
    if (patternMatch) {
      score += 50;
      reasons.push('Problem pattern match');
    }
    
    // Check keyword overlap
    const keywordOverlap = solution.keywords.filter(keyword => 
      problemKeywords.includes(keyword)
    );
    
    if (keywordOverlap.length > 0) {
      score += keywordOverlap.length * 10;
      reasons.push(`Keywords: ${keywordOverlap.join(', ')}`);
    }
    
    // Check platform compatibility
    if (solution.system_requirements.platforms.includes(systemContext.platform)) {
      score += 20;
      reasons.push('Platform compatible');
    }
    
    // Check memory requirements
    if (solution.system_requirements.min_memory_gb <= systemContext.total_memory_gb) {
      score += 10;
      reasons.push('Memory requirements met');
    }
    
    if (score > 30) { // Minimum threshold for relevance
      matches.push({
        solution,
        score,
        reasons,
        success_rate: solution.success_rate,
        compatibility: score / 90 // Normalize to 0-1
      });
    }
  });
  
  // Sort by score (highest first)
  return matches.sort((a, b) => b.score - a.score);
}

// Update solution success rate
async function updateSolutionSuccess(solutionId, wasSuccessful) {
  const solutions = await loadSolutionDatabase();
  const solution = solutions.find(s => s.id === solutionId);
  
  if (solution) {
    solution.application_count += 1;
    if (wasSuccessful) {
      solution.success_count += 1;
    }
    solution.success_rate = solution.success_count / solution.application_count;
    solution.last_updated = new Date().toISOString();
    
    await saveSolutionDatabase(solutions);
    return solution;
  }
  
  return null;
}

// Add new solution to database
async function addSolution(newSolution) {
  const solutions = await loadSolutionDatabase();
  
  // Generate ID if not provided
  if (!newSolution.id) {
    newSolution.id = `solution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Set defaults
  newSolution.success_rate = newSolution.success_rate || 0.5;
  newSolution.application_count = newSolution.application_count || 0;
  newSolution.success_count = newSolution.success_count || 0;
  newSolution.created_by = newSolution.created_by || 'user';
  newSolution.last_updated = new Date().toISOString();
  newSolution.version = newSolution.version || '1.0.0';
  
  solutions.push(newSolution);
  await saveSolutionDatabase(solutions);
  return newSolution;
}

// System diagnostics functions
async function getSystemInfo() {
  const cpus = os.cpus();
  return {
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    hostname: os.hostname(),
    uptime: os.uptime(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpuCount: cpus.length,
    cpuModel: cpus[0]?.model || "Unknown",
    loadAverage: os.loadavg(),
  };
}

async function getDiskInfo() {
  try {
    const platform = os.platform();
    let command;
    
    if (platform === 'win32') {
      command = 'wmic logicaldisk get size,freespace,caption';
    } else {
      command = 'df -h';
    }
    
    const { stdout } = await execAsync(command);
    
    if (platform === 'win32') {
      const lines = stdout.split('\n').filter(line => line.trim());
      const diskInfo = [];
      
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length >= 3) {
          const freeSpace = parseInt(parts[1]) || 0;
          const totalSize = parseInt(parts[2]) || 0;
          const used = totalSize - freeSpace;
          const usePercentage = totalSize > 0 ? Math.round((used / totalSize) * 100) : 0;
          
          diskInfo.push({
            filesystem: parts[0],
            size: `${Math.round(totalSize / (1024**3))}G`,
            used: `${Math.round(used / (1024**3))}G`,
            available: `${Math.round(freeSpace / (1024**3))}G`,
            usePercentage: `${usePercentage}%`,
            mountPoint: parts[0],
          });
        }
      }
      return diskInfo;
    } else {
      const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Filesystem'));
      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          filesystem: parts[0] || 'Unknown',
          size: parts[1] || '0',
          used: parts[2] || '0',
          available: parts[3] || '0',
          usePercentage: parts[4] || '0%',
          mountPoint: parts[5] || 'Unknown',
        };
      });
    }
  } catch (error) {
    console.error('Error getting disk info:', error);
    return [];
  }
}

async function getProcessInfo() {
  try {
    const platform = os.platform();
    let command;
    
    if (platform === 'win32') {
      command = 'tasklist /fo csv | findstr /v "Image Name"';
    } else if (platform === 'darwin') {
      command = 'ps aux | sort -nr -k 3 | head -10';
    } else {
      command = 'ps aux --sort=-%cpu | head -10';
    }
    
    const { stdout } = await execAsync(command);
    
    if (platform === 'win32') {
      const lines = stdout.split('\n').filter(line => line.trim());
      return lines.slice(0, 10).map(line => {
        const parts = line.split(',').map(part => part.replace(/"/g, ''));
        return {
          name: parts[0] || 'Unknown',
          pid: parts[1] || 'Unknown',
          memory: parts[4] || 'Unknown',
        };
      });
    } else {
      const lines = stdout.split('\n').filter(line => line.trim()).slice(1);
      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          user: parts[0] || 'Unknown',
          pid: parts[1] || 'Unknown',
          cpu: parts[2] || '0',
          memory: parts[3] || '0',
          command: parts.slice(10).join(' ') || 'Unknown',
        };
      });
    }
  } catch (error) {
    console.error('Error getting process info:', error);
    return [];
  }
}

// Advanced Problem Detection Engine
async function detectProblems(systemData) {
  const problems = [];
  const { system, storage, topProcesses } = systemData;
  
  // Check for advanced banking incident scenarios
  await detectSecurityThreats(problems);
  await detectServiceDegradation(problems, systemData);
  await detectBusinessCriticalIssues(problems, systemData);

  // Memory Problems
  if (system.memoryUsagePercentage >= PROBLEM_THRESHOLDS.memory.very_high_usage) {
    problems.push({
      id: 'memory_critical',
      type: 'performance',
      severity: 'critical',
      title: 'Critical Memory Usage',
      description: `Memory usage is critically high at ${system.memoryUsagePercentage}%`,
      context: {
        current_usage: system.memoryUsagePercentage,
        total_memory: Math.round(system.totalMemory / (1024**3)),
        free_memory: Math.round(system.freeMemory / (1024**3)),
        threshold: PROBLEM_THRESHOLDS.memory.very_high_usage,
      },
      keywords: ['memory', 'high_usage', 'performance', 'critical'],
    });
  } else if (system.memoryUsagePercentage >= PROBLEM_THRESHOLDS.memory.high_usage) {
    problems.push({
      id: 'memory_high',
      type: 'performance',
      severity: 'warning',
      title: 'High Memory Usage',
      description: `Memory usage is high at ${system.memoryUsagePercentage}%`,
      context: {
        current_usage: system.memoryUsagePercentage,
        total_memory: Math.round(system.totalMemory / (1024**3)),
        free_memory: Math.round(system.freeMemory / (1024**3)),
        threshold: PROBLEM_THRESHOLDS.memory.high_usage,
      },
      keywords: ['memory', 'high_usage', 'performance'],
    });
  }

  // CPU Load Problems
  const avgLoad = system.loadAverage[0]; // 1-minute load average
  const loadPercentage = (avgLoad / system.cpuCount) * 100;
  
  if (loadPercentage >= PROBLEM_THRESHOLDS.cpu.high_load) {
    problems.push({
      id: 'cpu_high_load',
      type: 'performance',
      severity: loadPercentage >= 100 ? 'critical' : 'warning',
      title: 'High CPU Load',
      description: `CPU load average is high: ${avgLoad.toFixed(2)} (${loadPercentage.toFixed(1)}% of capacity)`,
      context: {
        load_average: system.loadAverage,
        load_percentage: loadPercentage,
        cpu_count: system.cpuCount,
        threshold: PROBLEM_THRESHOLDS.cpu.high_load,
      },
      keywords: ['cpu', 'load', 'performance', 'high_usage'],
    });
  }

  // Disk Space Problems
  storage.forEach((disk, index) => {
    const usageMatch = disk.usePercentage.match(/(\d+)%/);
    if (usageMatch) {
      const usage = parseInt(usageMatch[1]);
      
      if (usage >= PROBLEM_THRESHOLDS.disk.very_high_usage) {
        problems.push({
          id: `disk_critical_${index}`,
          type: 'storage',
          severity: 'critical',
          title: 'Critical Disk Space',
          description: `Disk ${disk.filesystem} is critically full at ${usage}%`,
          context: {
            filesystem: disk.filesystem,
            usage_percentage: usage,
            total_size: disk.size,
            available: disk.available,
            mount_point: disk.mountPoint,
            threshold: PROBLEM_THRESHOLDS.disk.very_high_usage,
          },
          keywords: ['disk', 'storage', 'full', 'critical', 'space'],
        });
      } else if (usage >= PROBLEM_THRESHOLDS.disk.high_usage) {
        problems.push({
          id: `disk_high_${index}`,
          type: 'storage',
          severity: 'warning',
          title: 'Low Disk Space',
          description: `Disk ${disk.filesystem} is running low on space at ${usage}%`,
          context: {
            filesystem: disk.filesystem,
            usage_percentage: usage,
            total_size: disk.size,
            available: disk.available,
            mount_point: disk.mountPoint,
            threshold: PROBLEM_THRESHOLDS.disk.high_usage,
          },
          keywords: ['disk', 'storage', 'low_space', 'warning'],
        });
      }
    }
  });

  // Process Problems (Resource Hogs)
  topProcesses.forEach((proc, index) => {
    if (index < 5) { // Only check top 5 processes
      const cpuUsage = parseFloat(proc.cpu) || 0;
      const memoryUsage = parseFloat(proc.memory) || 0;
      
      if (cpuUsage >= PROBLEM_THRESHOLDS.processes.cpu_hog) {
        problems.push({
          id: `process_cpu_hog_${proc.pid}`,
          type: 'performance',
          severity: 'warning',
          title: 'CPU-Intensive Process',
          description: `Process ${proc.command || proc.name} (PID: ${proc.pid}) is using ${cpuUsage}% CPU`,
          context: {
            process_name: proc.command || proc.name,
            pid: proc.pid,
            cpu_usage: cpuUsage,
            memory_usage: memoryUsage,
            user: proc.user,
            threshold: PROBLEM_THRESHOLDS.processes.cpu_hog,
          },
          keywords: ['process', 'cpu', 'high_usage', 'performance'],
        });
      }
      
      // For memory, we need to calculate percentage of total system memory
      if (memoryUsage > 0) {
        const memoryGB = system.totalMemory / (1024**3);
        const processMemoryPercentage = (memoryUsage / 1024 / 1024) / memoryGB * 100;
        
        if (processMemoryPercentage >= PROBLEM_THRESHOLDS.processes.memory_hog) {
          problems.push({
            id: `process_memory_hog_${proc.pid}`,
            type: 'performance',
            severity: 'warning',
            title: 'Memory-Intensive Process',
            description: `Process ${proc.command || proc.name} (PID: ${proc.pid}) is using ${processMemoryPercentage.toFixed(1)}% of system memory`,
            context: {
              process_name: proc.command || proc.name,
              pid: proc.pid,
              cpu_usage: cpuUsage,
              memory_usage: memoryUsage,
              memory_percentage: processMemoryPercentage,
              user: proc.user,
              threshold: PROBLEM_THRESHOLDS.processes.memory_hog,
            },
            keywords: ['process', 'memory', 'high_usage', 'performance'],
          });
        }
      }
    }
  });

  // Uptime Problems (System needs restart)
  if (system.uptime >= PROBLEM_THRESHOLDS.uptime.needs_restart) {
    const uptimeDays = Math.floor(system.uptime / (24 * 3600));
    problems.push({
      id: 'uptime_long',
      type: 'maintenance',
      severity: 'info',
      title: 'Long System Uptime',
      description: `System has been running for ${uptimeDays} days without restart`,
      context: {
        uptime_seconds: system.uptime,
        uptime_days: uptimeDays,
        uptime_formatted: system.uptimeFormatted,
        threshold_days: PROBLEM_THRESHOLDS.uptime.needs_restart / (24 * 3600),
      },
      keywords: ['uptime', 'restart', 'maintenance', 'stability'],
    });
  }

  return problems;
}

// Advanced Detection Functions
async function detectSecurityThreats(problems) {
  try {
    const demoDir = `${process.env.HOME}/banking_incident_demo`;
    
    // Check for security logs
    try {
      const networkLog = await fs.readFile(`${demoDir}/logs/network_monitor.log`, 'utf8');
      const authLog = await fs.readFile(`${demoDir}/logs/auth_failures.log`, 'utf8');
      
      const suspiciousConnections = (networkLog.match(/ALERT.*Suspicious outbound connection/g) || []).length;
      const failedLogins = (authLog.match(/AUTH_FAIL/g) || []).length;
      const privilegeEscalation = (networkLog.match(/Privilege escalation attempt/g) || []).length;
      
      if (suspiciousConnections > 0 || failedLogins > 5 || privilegeEscalation > 0) {
        problems.push({
          id: 'security_breach_detected',
          type: 'security',
          severity: 'critical',
          title: 'Security Breach Detected',
          description: `Multiple security threats detected: ${suspiciousConnections} suspicious connections, ${failedLogins} failed logins, ${privilegeEscalation} privilege escalation attempts`,
          context: {
            suspicious_connections: suspiciousConnections,
            failed_logins: failedLogins,
            privilege_escalation: privilegeEscalation,
            threat_level: 'high',
            requires_immediate_action: true
          },
          keywords: ['security', 'breach', 'authentication', 'network', 'critical'],
        });
      }
      
      if (networkLog.includes('malware C&C domains')) {
        problems.push({
          id: 'malware_communication_detected',
          type: 'security',
          severity: 'critical',
          title: 'Malware Communication Detected',
          description: 'System attempting to communicate with known malware command and control servers',
          context: {
            threat_type: 'malware_c2',
            risk_level: 'critical',
            requires_isolation: true
          },
          keywords: ['malware', 'c2', 'communication', 'threat', 'isolation'],
        });
      }
      
    } catch (error) {
      // Security logs not found - no advanced threats detected
    }
    
  } catch (error) {
    console.error('Error detecting security threats:', error);
  }
}

async function detectServiceDegradation(problems, systemData) {
  try {
    const demoDir = `${process.env.HOME}/banking_incident_demo`;
    
    // Check for service issues
    try {
      const paymentLog = await fs.readFile(`${demoDir}/services/payment_service.log`, 'utf8');
      const apiLog = await fs.readFile(`${demoDir}/services/api_gateway.log`, 'utf8');
      
      const dbConnectionIssues = (paymentLog.match(/Database connection pool exhausted/g) || []).length;
      const transactionTimeouts = (paymentLog.match(/Transaction timeout/g) || []).length;
      const apiRateLimits = (apiLog.match(/API rate limit exceeded/g) || []).length;
      const circuitBreakers = (apiLog.match(/Circuit breaker OPEN/g) || []).length;
      
      if (dbConnectionIssues > 0 || transactionTimeouts > 0) {
        problems.push({
          id: 'payment_service_degradation',
          type: 'service',
          severity: 'critical',
          title: 'Payment Service Degradation',
          description: `Payment processing severely impacted: ${dbConnectionIssues} connection pool exhaustions, ${transactionTimeouts} transaction timeouts`,
          context: {
            db_connection_issues: dbConnectionIssues,
            transaction_timeouts: transactionTimeouts,
            service_impact: 'high',
            revenue_impact: true,
            requires_immediate_attention: true
          },
          keywords: ['payment', 'database', 'timeout', 'service', 'revenue'],
        });
      }
      
      if (apiRateLimits > 0 || circuitBreakers > 0) {
        problems.push({
          id: 'api_service_overload',
          type: 'service',
          severity: 'warning',
          title: 'API Service Overload',
          description: `API services under stress: ${apiRateLimits} rate limit violations, ${circuitBreakers} circuit breakers triggered`,
          context: {
            rate_limit_violations: apiRateLimits,
            circuit_breakers_open: circuitBreakers,
            partner_impact: true,
            customer_impact: 'moderate'
          },
          keywords: ['api', 'rate_limit', 'circuit_breaker', 'overload', 'partners'],
        });
      }
      
    } catch (error) {
      // Service logs not found - no service degradation detected
    }
    
  } catch (error) {
    console.error('Error detecting service degradation:', error);
  }
}

async function detectBusinessCriticalIssues(problems, systemData) {
  try {
    const demoDir = `${process.env.HOME}/banking_incident_demo`;
    
    // Check for database issues
    try {
      const dbLog = await fs.readFile(`${demoDir}/database/customer_db.log`, 'utf8');
      
      const slowQueries = (dbLog.match(/Slow query detected/g) || []).length;
      const deadlocks = (dbLog.match(/Deadlock detected/g) || []).length;
      const corruption = (dbLog.match(/Table corruption detected/g) || []).length;
      const backupFailures = (dbLog.match(/Backup process failed/g) || []).length;
      
      if (corruption > 0 || backupFailures > 0) {
        problems.push({
          id: 'data_integrity_risk',
          type: 'data',
          severity: 'critical',
          title: 'Data Integrity Risk',
          description: `Critical data issues detected: ${corruption} corrupted tables, ${backupFailures} backup failures`,
          context: {
            corrupted_tables: corruption,
            backup_failures: backupFailures,
            data_loss_risk: 'high',
            compliance_impact: true,
            requires_immediate_action: true
          },
          keywords: ['database', 'corruption', 'backup', 'data_integrity', 'compliance'],
        });
      }
      
      if (slowQueries > 2 || deadlocks > 0) {
        problems.push({
          id: 'database_performance_degradation',
          type: 'performance',
          severity: 'warning',
          title: 'Database Performance Degradation',
          description: `Database performance issues: ${slowQueries} slow queries, ${deadlocks} deadlocks detected`,
          context: {
            slow_queries: slowQueries,
            deadlocks: deadlocks,
            performance_impact: 'moderate',
            customer_experience_impact: true
          },
          keywords: ['database', 'performance', 'slow_queries', 'deadlock', 'optimization'],
        });
      }
      
    } catch (error) {
      // Database logs not found - no database issues detected
    }
    
    // Check for running incident simulation processes
    try {
      const { stdout } = await execAsync('pgrep -f "memory_leak_simulator\\|database_load_simulator"');
      if (stdout.trim()) {
        const processes = stdout.trim().split('\n');
        problems.push({
          id: 'incident_simulation_active',
          type: 'simulation',
          severity: 'info',
          title: 'Banking Incident Simulation Active',
          description: `Active incident simulation detected: ${processes.length} simulation processes running`,
          context: {
            simulation_processes: processes.length,
            simulation_type: 'banking_incident',
            demo_mode: true
          },
          keywords: ['simulation', 'demo', 'banking', 'incident', 'training'],
        });
      }
    } catch (error) {
      // No simulation processes found
    }
    
    // Check for custom integration failure problem
    try {
      const customDir = `${process.env.HOME}/custom_banking_problem`;
      const integrationLog = await fs.readFile(`${customDir}/logs/integration_failure.log`, 'utf8');
      const configFile = await fs.readFile(`${customDir}/config/integration_config.xml`, 'utf8');
      
      const apiFailures = (integrationLog.match(/ThirdPartyAPI.*failed/g) || []).length;
      const criticalErrors = (integrationLog.match(/CRITICAL/g) || []).length;
      const sslErrors = (configFile.match(/SSL_ERROR/g) || []).length;
      const authFailures = (configFile.match(/AUTH_FAILED/g) || []).length;
      
      if (apiFailures > 0 || criticalErrors > 0) {
        problems.push({
          id: 'third_party_integration_ssl_failure',
          type: 'integration',
          severity: 'critical',
          title: 'Third-Party Integration SSL & API Failure',
          description: `Critical third-party integration failure: ${apiFailures} API failures, ${criticalErrors} critical errors, ${sslErrors} SSL issues, ${authFailures} auth failures`,
          context: {
            api_failures: apiFailures,
            critical_errors: criticalErrors,
            ssl_errors: sslErrors,
            auth_failures: authFailures,
            affected_systems: ['payment_gateway_v3', 'cobol_mainframe', 'credit_check_api', 'regulatory_api'],
            business_impact: 'high',
            compliance_risk: true,
            message_queue_overflow: true
          },
          keywords: ['ssl', 'certificate', 'api', 'integration', 'cobol', 'third_party', 'authentication'],
        });
      }
      
    } catch (error) {
      // Custom integration problem not found
    }
    
  } catch (error) {
    console.error('Error detecting business critical issues:', error);
  }
}

// Generate AI-friendly problem summary
function generateProblemSummary(problems, systemData) {
  if (problems.length === 0) {
    return {
      status: 'healthy',
      summary: 'No significant problems detected. System is running normally.',
      problem_count: 0,
      problems: [],
    };
  }

  const criticalProblems = problems.filter(p => p.severity === 'critical');
  const warningProblems = problems.filter(p => p.severity === 'warning');
  const infoProblems = problems.filter(p => p.severity === 'info');

  let status = 'healthy';
  if (criticalProblems.length > 0) {
    status = 'critical';
  } else if (warningProblems.length > 0) {
    status = 'warning';
  } else if (infoProblems.length > 0) {
    status = 'info';
  }

  const summary = `Detected ${problems.length} issue(s): ${criticalProblems.length} critical, ${warningProblems.length} warnings, ${infoProblems.length} informational.`;

  return {
    status,
    summary,
    problem_count: problems.length,
    problems: problems.map(p => ({
      id: p.id,
      type: p.type,
      severity: p.severity,
      title: p.title,
      description: p.description,
      keywords: p.keywords,
      context: p.context,
    })),
    system_context: {
      platform: systemData.system.platform,
      arch: systemData.system.arch,
      cpu_model: systemData.system.cpuModel,
      total_memory_gb: Math.round(systemData.system.totalMemory / (1024**3)),
      hostname: systemData.system.hostname,
    },
    timestamp: new Date().toISOString(),
  };
}

async function main() {
  try {
    // Default configuration
    const config = {
      debug: false,
      enableSystemInfo: true,
      enableLogs: true,
      enableNetwork: true,
      enablePerformance: true,
      enableProblemDetection: true,
    };

    // Initialize solution database
    await initializeSolutionDatabase();

    // Create the server
    const server = new McpServer({
      name: "System Diagnostics MCP Server",
      version: "1.0.0",
    });

    // Add the system info tool
    server.tool(
      "get_system_info",
      "Get comprehensive system information including OS, hardware, memory, and CPU details",
      {},
      async () => {
        if (!config.enableSystemInfo) {
          return {
            content: [{ type: "text", text: "System information collection is disabled in configuration" }],
          };
        }

        try {
          const systemInfo = await getSystemInfo();
          const diskInfo = await getDiskInfo();
          const processInfo = await getProcessInfo();

          const result = {
            timestamp: new Date().toISOString(),
            system: {
              ...systemInfo,
              memoryUsagePercentage: Math.round(((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory) * 100),
              uptimeFormatted: `${Math.floor(systemInfo.uptime / 3600)}h ${Math.floor((systemInfo.uptime % 3600) / 60)}m`,
            },
            storage: diskInfo,
            topProcesses: processInfo,
          };

          return {
            content: [
              { 
                type: "text", 
                text: `# System Information Report\n\n## System Details\n- **Platform**: ${result.system.platform}\n- **Architecture**: ${result.system.arch}\n- **Hostname**: ${result.system.hostname}\n- **Uptime**: ${result.system.uptimeFormatted}\n- **CPU**: ${result.system.cpuModel} (${result.system.cpuCount} cores)\n- **Memory**: ${Math.round(result.system.totalMemory / (1024**3))}GB total, ${Math.round(result.system.freeMemory / (1024**3))}GB free (${result.system.memoryUsagePercentage}% used)\n- **Load Average**: ${result.system.loadAverage.map(l => l.toFixed(2)).join(', ')}\n\n## Storage Information\n${result.storage.map(disk => `- **${disk.filesystem}**: ${disk.size} total, ${disk.used} used, ${disk.available} available (${disk.usePercentage} used) - ${disk.mountPoint}`).join('\n')}\n\n## Top Processes\n${result.topProcesses.slice(0, 5).map((proc) => `- **${proc.name || proc.command}** (PID: ${proc.pid}) - CPU: ${proc.cpu || 'N/A'}%, Memory: ${proc.memory}${proc.memory && !proc.memory.includes('%') ? 'KB' : ''}`).join('\n')}` 
              },
              {
                type: "text",
                text: `\n\n**Raw JSON Data:**\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``
              }
            ],
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error collecting system information: ${error}` }],
          };
        }
      }
    );

    // Problem Detection Tool
    server.tool(
      "detect_problems",
      "Analyze system data to detect performance issues, resource problems, and maintenance needs",
      {},
      async () => {
        if (!config.enableProblemDetection) {
          return {
            content: [{ type: "text", text: "Problem detection is disabled in configuration" }],
          };
        }

        try {
          // First collect system data
          const systemInfo = await getSystemInfo();
          const diskInfo = await getDiskInfo();
          const processInfo = await getProcessInfo();

          const systemData = {
            timestamp: new Date().toISOString(),
            system: {
              ...systemInfo,
              memoryUsagePercentage: Math.round(((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory) * 100),
              uptimeFormatted: `${Math.floor(systemInfo.uptime / 3600)}h ${Math.floor((systemInfo.uptime % 3600) / 60)}m`,
            },
            storage: diskInfo,
            topProcesses: processInfo,
          };

          // Detect problems
          const problems = await detectProblems(systemData);
          const problemSummary = generateProblemSummary(problems, systemData);

          // Format output for both human and AI consumption
          let humanReadable = `# System Problem Analysis\n\n`;
          humanReadable += `**Status**: ${problemSummary.status.toUpperCase()}\n`;
          humanReadable += `**Summary**: ${problemSummary.summary}\n\n`;

          if (problems.length === 0) {
            humanReadable += `✅ **All Clear!** No significant issues detected.\n\n`;
            humanReadable += `Your system appears to be running normally with:\n`;
            humanReadable += `- Memory usage: ${systemData.system.memoryUsagePercentage}%\n`;
            humanReadable += `- CPU load: ${(systemData.system.loadAverage[0] / systemData.system.cpuCount * 100).toFixed(1)}%\n`;
            humanReadable += `- Disk space: Available across all drives\n`;
          } else {
            humanReadable += `## Detected Issues:\n\n`;
            
            const criticalProblems = problems.filter(p => p.severity === 'critical');
            const warningProblems = problems.filter(p => p.severity === 'warning');
            const infoProblems = problems.filter(p => p.severity === 'info');

            if (criticalProblems.length > 0) {
              humanReadable += `### 🚨 Critical Issues (${criticalProblems.length}):\n`;
              criticalProblems.forEach(problem => {
                humanReadable += `- **${problem.title}**: ${problem.description}\n`;
              });
              humanReadable += `\n`;
            }

            if (warningProblems.length > 0) {
              humanReadable += `### ⚠️ Warnings (${warningProblems.length}):\n`;
              warningProblems.forEach(problem => {
                humanReadable += `- **${problem.title}**: ${problem.description}\n`;
              });
              humanReadable += `\n`;
            }

            if (infoProblems.length > 0) {
              humanReadable += `### ℹ️ Information (${infoProblems.length}):\n`;
              infoProblems.forEach(problem => {
                humanReadable += `- **${problem.title}**: ${problem.description}\n`;
              });
              humanReadable += `\n`;
            }

            humanReadable += `## Next Steps:\n`;
            humanReadable += `1. Review critical issues first\n`;
            humanReadable += `2. Use the solution database to find fixes\n`;
            humanReadable += `3. Apply recommended solutions\n`;
            humanReadable += `4. Monitor system performance\n`;
          }

          return {
            content: [
              { 
                type: "text", 
                text: humanReadable
              },
              {
                type: "text",
                text: `\n\n**AI-Ready Problem Data:**\n\`\`\`json\n${JSON.stringify(problemSummary, null, 2)}\n\`\`\``
              }
            ],
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error detecting problems: ${error}` }],
          };
        }
      }
    );

    // Find Solutions Tool
    server.tool(
      "find_solutions",
      "Find solutions for detected problems from the solution database",
      {
        problem_id: z.string().describe("Problem ID to find solutions for"),
        problem_keywords: z.array(z.string()).optional().describe("Problem keywords for better matching"),
      },
      async ({ problem_id, problem_keywords = [] }) => {
        try {
          // Get system context
          const systemInfo = await getSystemInfo();
          const systemContext = {
            platform: systemInfo.platform,
            arch: systemInfo.arch,
            cpu_model: systemInfo.cpuModel,
            total_memory_gb: Math.round(systemInfo.totalMemory / (1024**3)),
            hostname: systemInfo.hostname,
          };

          // Load solutions and find matches
          const solutions = await loadSolutionDatabase();
          const matches = findMatchingSolutions(problem_id, problem_keywords, systemContext, solutions);

          if (matches.length === 0) {
            return {
              content: [{
                type: "text",
                text: `# No Solutions Found\n\n❌ **No solutions found for problem:** ${problem_id}\n\n**Searched for:**\n- Problem ID: ${problem_id}\n- Keywords: ${problem_keywords.join(', ') || 'None provided'}\n- Platform: ${systemContext.platform}\n\n🎫 **Recommended Action:**\nThis appears to be a new or uncommon problem that isn't in our solution database yet.\n\n**Would you like me to create a support ticket?**\nI can create a support ticket with all the system context and problem details. The support team will:\n1. Investigate the issue\n2. Develop a solution\n3. Add it to the knowledge base\n4. Future similar problems will be auto-resolved\n\n**To create a support ticket, use:**\n\`create_support_ticket\` with:\n- problem_id: "${problem_id}"\n- problem_description: "[Describe the issue in detail]"\n- urgency: "critical" (or high/medium/low)\n\n💡 **This is how the system learns and improves over time!**`
              }]
            };
          }

          // Format human-readable output
          let output = `# Solutions Found for Problem: ${problem_id}\n\n`;
          output += `**Found ${matches.length} matching solution(s)**\n\n`;

          matches.forEach((match, index) => {
            const solution = match.solution;
            output += `## ${index + 1}. ${solution.title}\n`;
            output += `**Success Rate:** ${(solution.success_rate * 100).toFixed(1)}% (${solution.success_count}/${solution.application_count} applications)\n`;
            output += `**Compatibility:** ${(match.compatibility * 100).toFixed(1)}%\n`;
            output += `**Description:** ${solution.description}\n`;
            output += `**Solution Type:** ${solution.solution_type}\n`;
            output += `**Version:** ${solution.version}\n`;
            output += `**Match Reasons:** ${match.reasons.join(', ')}\n`;
            
            // Show platform-specific commands
            const platformCommands = solution.commands.filter(cmd => cmd.platform === systemContext.platform);
            if (platformCommands.length > 0) {
              output += `**Commands for ${systemContext.platform}:**\n`;
              platformCommands.forEach(cmd => {
                output += `- ${cmd.description} (Risk: ${cmd.risk_level})\n`;
                output += `  \`${cmd.command}\`\n`;
              });
            }

            if (solution.system_requirements.requires_admin) {
              output += `⚠️ **Requires administrator privileges**\n`;
            }

            if (solution.notes) {
              output += `**Notes:** ${solution.notes}\n`;
            }
            
            output += `\n`;
          });

          return {
            content: [
              { type: "text", text: output },
              {
                type: "text",
                text: `\n\n**AI-Ready Solution Data:**\n\`\`\`json\n${JSON.stringify({
                  problem_id,
                  matches_found: matches.length,
                  solutions: matches.map(m => ({
                    id: m.solution.id,
                    title: m.solution.title,
                    success_rate: m.solution.success_rate,
                    compatibility_score: m.compatibility,
                    platform_compatible: m.solution.system_requirements.platforms.includes(systemContext.platform),
                    requires_admin: m.solution.system_requirements.requires_admin,
                    commands: m.solution.commands.filter(cmd => cmd.platform === systemContext.platform)
                  })),
                  system_context: systemContext
                }, null, 2)}\n\`\`\``
              }
            ]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error finding solutions: ${error}` }],
          };
        }
      }
    );

    // Add Solution Tool
    server.tool(
      "add_solution",
      "Add a new solution to the database",
      {
        title: z.string().describe("Solution title"),
        description: z.string().describe("Solution description"),
        problem_patterns: z.array(z.string()).describe("Problem patterns this solution addresses"),
        solution_type: z.string().describe("Type of solution (e.g., process_management, cleanup, configuration)"),
        commands: z.array(z.object({
          platform: z.string().describe("Platform (darwin, linux, win32)"),
          command: z.string().describe("Command to execute"),
          description: z.string().describe("What this command does"),
          risk_level: z.string().describe("Risk level (low, medium, high)")
        })).describe("Commands to execute"),
        keywords: z.array(z.string()).describe("Keywords for matching"),
        platforms: z.array(z.string()).describe("Supported platforms"),
        requires_admin: z.boolean().optional().describe("Whether admin privileges are required"),
        notes: z.string().optional().describe("Additional notes")
      },
      async ({ title, description, problem_patterns, solution_type, commands, keywords, platforms, requires_admin = false, notes }) => {
        try {
          const newSolution = {
            title,
            description,
            problem_patterns,
            solution_type,
            commands,
            keywords,
            system_requirements: {
              platforms,
              min_memory_gb: 0,
              requires_admin
            },
            notes: notes || ''
          };

          const addedSolution = await addSolution(newSolution);
          
          return {
            content: [{
              type: "text",
              text: `# Solution Added Successfully\n\n✅ **New solution added to database**\n\n**ID:** ${addedSolution.id}\n**Title:** ${addedSolution.title}\n**Problem Patterns:** ${addedSolution.problem_patterns.join(', ')}\n**Platforms:** ${addedSolution.system_requirements.platforms.join(', ')}\n**Commands:** ${addedSolution.commands.length}\n**Version:** ${addedSolution.version}\n\nThe solution is now available for matching against detected problems.`
            }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error adding solution: ${error}` }],
          };
        }
      }
    );

    // List Solutions Tool
    server.tool(
      "list_solutions",
      "List all solutions in the database with their success rates",
      {},
      async () => {
        try {
          const solutions = await loadSolutionDatabase();
          
          let output = `# Solution Database\n\n`;
          output += `**Total Solutions:** ${solutions.length}\n\n`;
          
          solutions.forEach((solution, index) => {
            output += `## ${index + 1}. ${solution.title}\n`;
            output += `**ID:** ${solution.id}\n`;
            output += `**Success Rate:** ${(solution.success_rate * 100).toFixed(1)}% (${solution.success_count}/${solution.application_count})\n`;
            output += `**Problem Patterns:** ${solution.problem_patterns.join(', ')}\n`;
            output += `**Platforms:** ${solution.system_requirements.platforms.join(', ')}\n`;
            output += `**Type:** ${solution.solution_type}\n`;
            output += `**Version:** ${solution.version}\n`;
            output += `**Last Updated:** ${solution.last_updated}\n`;
            output += `**Keywords:** ${solution.keywords.join(', ')}\n`;
            if (solution.notes) {
              output += `**Notes:** ${solution.notes}\n`;
            }
            output += `\n`;
          });

          return {
            content: [
              { type: "text", text: output },
              {
                type: "text",
                text: `\n\n**Database Summary:**\n\`\`\`json\n${JSON.stringify({
                  total_solutions: solutions.length,
                  solution_types: [...new Set(solutions.map(s => s.solution_type))],
                  supported_platforms: [...new Set(solutions.flatMap(s => s.system_requirements.platforms))],
                  average_success_rate: solutions.reduce((sum, s) => sum + s.success_rate, 0) / solutions.length,
                  total_applications: solutions.reduce((sum, s) => sum + s.application_count, 0)
                }, null, 2)}\n\`\`\``
              }
            ]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error listing solutions: ${error}` }],
          };
        }
      }
    );

    // Apply Solution Tool
    server.tool(
      "apply_solution",
      "Apply a solution to fix a detected problem",
      {
        solution_id: z.string().describe("ID of the solution to apply"),
        problem_context: z.object({}).optional().describe("Problem context for variable substitution"),
        dry_run: z.boolean().optional().describe("If true, show what would be executed without running"),
      },
      async ({ solution_id, problem_context = {}, dry_run = false }) => {
        try {
          const solutions = await loadSolutionDatabase();
          const solution = solutions.find(s => s.id === solution_id);
          
          if (!solution) {
            return {
              content: [{
                type: "text",
                text: `❌ **Solution not found:** ${solution_id}\n\nUse the \`list_solutions\` tool to see available solutions.`
              }]
            };
          }

          // Get system context
          const systemInfo = await getSystemInfo();
          const platformCommands = solution.commands.filter(cmd => cmd.platform === systemInfo.platform);
          
          if (platformCommands.length === 0) {
            return {
              content: [{
                type: "text",
                text: `❌ **No compatible commands found**\n\nSolution "${solution.title}" has no commands for platform: ${systemInfo.platform}\n\nSupported platforms: ${solution.system_requirements.platforms.join(', ')}`
              }]
            };
          }

          let output = `# ${dry_run ? 'Dry Run: ' : ''}Applying Solution: ${solution.title}\n\n`;
          output += `**Solution ID:** ${solution_id}\n`;
          output += `**Description:** ${solution.description}\n`;
          output += `**Success Rate:** ${(solution.success_rate * 100).toFixed(1)}%\n`;
          output += `**Platform:** ${systemInfo.platform}\n\n`;

          const results = [];
          
          for (const cmd of platformCommands) {
            let command = cmd.command;
            
            // Substitute variables in command (basic implementation)
            if (problem_context.process_pid) {
              command = command.replace('{process_pid}', problem_context.process_pid);
            }
            
            output += `## Command: ${cmd.description}\n`;
            output += `**Risk Level:** ${cmd.risk_level}\n`;
            output += `**Command:** \`${command}\`\n\n`;
            
            if (dry_run) {
              output += `🔍 **Dry Run:** Would execute above command\n\n`;
              results.push({
                command: command,
                description: cmd.description,
                risk_level: cmd.risk_level,
                status: 'dry_run',
                output: 'Command not executed (dry run mode)'
              });
            } else {
              try {
                output += `⚡ **Executing...**\n`;
                
                // Special handling for demo cleanup commands
                if (solution_id.includes('demo_cleanup') || command.includes('demo_system_problems')) {
                  // Safe demo cleanup commands
                  const { stdout, stderr } = await execAsync(command);
                  output += `✅ **Success!**\n`;
                  if (stdout) output += `Output: ${stdout.trim()}\n`;
                  if (stderr) output += `Warnings: ${stderr.trim()}\n`;
                  
                  results.push({
                    command: command,
                    description: cmd.description,
                    risk_level: cmd.risk_level,
                    status: 'success',
                    output: stdout || 'Command completed successfully',
                    stderr: stderr || null
                  });
                } else if (cmd.risk_level === 'low' && !command.includes('sudo')) {
                  // Execute low-risk commands that don't require sudo
                  const { stdout, stderr } = await execAsync(command);
                  output += `✅ **Success!**\n`;
                  if (stdout) output += `Output: ${stdout.trim()}\n`;
                  if (stderr) output += `Warnings: ${stderr.trim()}\n`;
                  
                  results.push({
                    command: command,
                    description: cmd.description,
                    risk_level: cmd.risk_level,
                    status: 'success',
                    output: stdout || 'Command completed successfully',
                    stderr: stderr || null
                  });
                } else {
                  // For high-risk or sudo commands, show what would be done
                  output += `⚠️ **Requires manual execution** (${cmd.risk_level} risk or requires admin privileges)\n`;
                  output += `Please run manually: \`${command}\`\n`;
                  
                  results.push({
                    command: command,
                    description: cmd.description,
                    risk_level: cmd.risk_level,
                    status: 'manual_required',
                    output: 'Command requires manual execution due to risk level or privileges'
                  });
                }
              } catch (error) {
                output += `❌ **Error:** ${error.message}\n`;
                results.push({
                  command: command,
                  description: cmd.description,
                  risk_level: cmd.risk_level,
                  status: 'error',
                  output: error.message
                });
              }
            }
            output += `\n`;
          }

          // If not dry run and we had successful executions, we could update success rate
          // (This would be implemented in a real system)
          if (!dry_run) {
            const successCount = results.filter(r => r.status === 'success').length;
            const totalCount = results.length;
            
            if (successCount > 0) {
              output += `## Solution Application Summary\n`;
              output += `**Commands Executed:** ${successCount}/${totalCount}\n`;
              output += `**Overall Status:** ${successCount === totalCount ? '✅ Complete Success' : '⚠️ Partial Success'}\n\n`;
              
              output += `💡 **Next Steps:**\n`;
              output += `1. Run \`detect_problems\` again to verify the fix\n`;
              output += `2. Monitor system performance\n`;
              output += `3. Check if the original problem is resolved\n`;
            }
          }

          return {
            content: [
              { type: "text", text: output },
              {
                type: "text",
                text: `\n\n**Execution Results:**\n\`\`\`json\n${JSON.stringify({
                  solution_id,
                  solution_title: solution.title,
                  dry_run,
                  platform: systemInfo.platform,
                  commands_executed: results.length,
                  successful_commands: results.filter(r => r.status === 'success').length,
                  results: results
                }, null, 2)}\n\`\`\``
              }
            ]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error applying solution: ${error}` }],
          };
        }
      }
    );

    // Clean Demo Problems Tool (for hackathon demo)
    server.tool(
      "clean_demo_problems",
      "Clean up demo problems created for hackathon presentation",
      {},
      async () => {
        try {
          let output = `# Cleaning Demo Problems\n\n`;
          const results = [];

          // Clean up demo files
          const demoDir = `${process.env.HOME}/demo_system_problems`;
          try {
            await execAsync(`rm -rf "${demoDir}"`);
            output += `✅ **Removed demo files:** ${demoDir}\n`;
            results.push({ action: 'remove_files', status: 'success' });
          } catch (error) {
            output += `⚠️ **Demo files:** ${error.message}\n`;
            results.push({ action: 'remove_files', status: 'error', error: error.message });
          }

          // Kill demo processes
          try {
            await execAsync(`pkill -f "memory_hog.js"`);
            output += `✅ **Stopped memory demo processes**\n`;
            results.push({ action: 'kill_memory_hogs', status: 'success' });
          } catch (error) {
            output += `ℹ️ **Memory processes:** Already stopped or not found\n`;
            results.push({ action: 'kill_memory_hogs', status: 'not_found' });
          }

          try {
            await execAsync(`pkill -f "cpu_hog.js"`);
            output += `✅ **Stopped CPU demo processes**\n`;
            results.push({ action: 'kill_cpu_hogs', status: 'success' });
          } catch (error) {
            output += `ℹ️ **CPU processes:** Already stopped or not found\n`;
            results.push({ action: 'kill_cpu_hogs', status: 'not_found' });
          }

          // Clean up sleep processes (be careful not to kill system sleeps)
          try {
            const { stdout } = await execAsync(`pgrep -f "sleep 300"`);
            if (stdout.trim()) {
              await execAsync(`pkill -f "sleep 300"`);
              output += `✅ **Stopped demo sleep processes**\n`;
              results.push({ action: 'kill_demo_sleeps', status: 'success' });
            } else {
              output += `ℹ️ **Sleep processes:** None found\n`;
              results.push({ action: 'kill_demo_sleeps', status: 'not_found' });
            }
          } catch (error) {
            output += `ℹ️ **Sleep processes:** ${error.message}\n`;
            results.push({ action: 'kill_demo_sleeps', status: 'error', error: error.message });
          }

          output += `\n🎯 **Demo cleanup complete!**\n`;
          output += `\nYou can now run \`detect_problems\` to verify the issues are resolved.\n`;

          return {
            content: [
              { type: "text", text: output },
              {
                type: "text",
                text: `\n\n**Cleanup Results:**\n\`\`\`json\n${JSON.stringify({
                  timestamp: new Date().toISOString(),
                  actions_attempted: results.length,
                  successful_actions: results.filter(r => r.status === 'success').length,
                  results: results
                }, null, 2)}\n\`\`\``
              }
            ]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error cleaning demo problems: ${error}` }],
          };
        }
      }
    );

    // Create Support Ticket Tool
    server.tool(
      "create_support_ticket",
      "Create a support ticket for problems not found in the solution database",
      {
        problem_id: z.string().describe("ID of the problem needing support"),
        problem_description: z.string().describe("Detailed description of the problem"),
        system_context: z.object({}).optional().describe("System context for the problem"),
        urgency: z.enum(['low', 'medium', 'high', 'critical']).optional().describe("Urgency level"),
      },
      async ({ problem_id, problem_description, system_context = {}, urgency = 'medium' }) => {
        try {
          // Simulate creating a support ticket
          const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
          
          // Get system info for context
          const systemInfo = await getSystemInfo();
          
          const ticket = {
            id: ticketId,
            problem_id: problem_id,
            title: `System Issue: ${problem_description.substring(0, 50)}...`,
            description: problem_description,
            status: 'open',
            urgency: urgency,
            created_at: new Date().toISOString(),
            system_context: {
              platform: systemInfo.platform,
              arch: systemInfo.arch,
              hostname: systemInfo.hostname,
              memory_gb: Math.round(systemInfo.totalMemory / (1024**3)),
              cpu_count: systemInfo.cpuCount,
              ...system_context
            },
            assigned_team: urgency === 'critical' ? 'incident_response' : 
                          problem_id.includes('security') ? 'security_team' :
                          problem_id.includes('payment') ? 'platform_team' :
                          problem_id.includes('api') ? 'api_team' : 'general_support',
            estimated_response_time: urgency === 'critical' ? '15 minutes' :
                                   urgency === 'high' ? '2 hours' :
                                   urgency === 'medium' ? '24 hours' : '72 hours'
          };

          // Simulate saving ticket (in real system, this would go to ticketing system)
          const ticketsDir = './support_tickets';
          try {
            await fs.mkdir(ticketsDir, { recursive: true });
            await fs.writeFile(`${ticketsDir}/${ticketId}.json`, JSON.stringify(ticket, null, 2));
          } catch (error) {
            console.error('Error saving support ticket:', error);
          }

          let output = `# Support Ticket Created\n\n`;
          output += `🎫 **Ticket ID:** ${ticketId}\n`;
          output += `🔍 **Problem:** ${problem_description}\n`;
          output += `⚡ **Urgency:** ${urgency.toUpperCase()}\n`;
          output += `👥 **Assigned Team:** ${ticket.assigned_team.replace('_', ' ').toUpperCase()}\n`;
          output += `⏱️ **Estimated Response:** ${ticket.estimated_response_time}\n`;
          output += `📅 **Created:** ${new Date().toLocaleString()}\n\n`;
          
          output += `## System Context Included:\n`;
          output += `- **Platform:** ${systemInfo.platform}\n`;
          output += `- **Architecture:** ${systemInfo.arch}\n`;
          output += `- **Hostname:** ${systemInfo.hostname}\n`;
          output += `- **Memory:** ${Math.round(systemInfo.totalMemory / (1024**3))}GB\n`;
          output += `- **CPU Cores:** ${systemInfo.cpuCount}\n\n`;
          
          output += `## Next Steps:\n`;
          output += `1. Support team will investigate the issue\n`;
          output += `2. You'll receive updates via the ticket system\n`;
          output += `3. Once resolved, the solution will be added to the database\n`;
          output += `4. Future similar problems will be auto-resolved\n\n`;
          
          output += `💡 **Pro Tip:** Use \`check_ticket_status\` with ticket ID to get updates.`;

          return {
            content: [
              { type: "text", text: output },
              {
                type: "text",
                text: `\n\n**Ticket Data:**\n\`\`\`json\n${JSON.stringify(ticket, null, 2)}\n\`\`\``
              }
            ]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error creating support ticket: ${error}` }],
          };
        }
      }
    );

    // Check Ticket Status Tool
    server.tool(
      "check_ticket_status",
      "Check the status of a support ticket and get updates",
      {
        ticket_id: z.string().describe("Support ticket ID to check"),
      },
      async ({ ticket_id }) => {
        try {
          // Simulate checking ticket status
          const ticketPath = `./support_tickets/${ticket_id}.json`;
          
          try {
            const ticketData = await fs.readFile(ticketPath, 'utf8');
            const ticket = JSON.parse(ticketData);
            
            // Simulate ticket progress (in real system, this would query the ticketing system)
            const now = new Date();
            const createdAt = new Date(ticket.created_at);
            const minutesElapsed = Math.floor((now - createdAt) / (1000 * 60));
            
            // Simulate ticket updates based on time elapsed
            let status = ticket.status;
            let updates = [];
            
            if (minutesElapsed > 1) {
              status = 'in_progress';
              updates.push({
                timestamp: new Date(createdAt.getTime() + 2 * 60 * 1000).toISOString(),
                message: `Ticket assigned to ${ticket.assigned_team}`,
                author: 'system'
              });
            }
            
            if (minutesElapsed > 2) {
              updates.push({
                timestamp: new Date(createdAt.getTime() + 3 * 60 * 1000).toISOString(),
                message: 'Investigation started. Analyzing system logs and reproducing issue.',
                author: ticket.assigned_team
              });
            }
            
            if (minutesElapsed > 3) {
              status = 'resolved';
              updates.push({
                timestamp: new Date(createdAt.getTime() + 4 * 60 * 1000).toISOString(),
                message: 'Root cause identified. Solution developed and tested.',
                author: ticket.assigned_team
              });
              
              updates.push({
                timestamp: new Date(createdAt.getTime() + 5 * 60 * 1000).toISOString(),
                message: 'Solution added to knowledge base. Ticket resolved.',
                author: 'system'
              });
            }

            let output = `# Support Ticket Status\n\n`;
            output += `🎫 **Ticket ID:** ${ticket_id}\n`;
            output += `📋 **Status:** ${status.toUpperCase()}\n`;
            output += `🔍 **Problem:** ${ticket.description}\n`;
            output += `👥 **Assigned Team:** ${ticket.assigned_team.replace('_', ' ').toUpperCase()}\n`;
            output += `📅 **Created:** ${new Date(ticket.created_at).toLocaleString()}\n`;
            output += `⏱️ **Last Updated:** ${updates.length > 0 ? new Date(updates[updates.length - 1].timestamp).toLocaleString() : 'No updates yet'}\n\n`;
            
            if (updates.length > 0) {
              output += `## Recent Updates:\n`;
              updates.forEach((update, index) => {
                output += `${index + 1}. **${new Date(update.timestamp).toLocaleString()}** (${update.author})\n`;
                output += `   ${update.message}\n\n`;
              });
            }
            
            if (status === 'resolved') {
              output += `## ✅ Resolution Available!\n`;
              output += `The support team has resolved this issue and added a solution to the database.\n`;
              output += `You can now use \`find_solutions\` to get the new solution for this problem.\n\n`;
              output += `**Next Steps:**\n`;
              output += `1. Use \`find_solutions\` with problem_id: "${ticket.problem_id}"\n`;
              output += `2. Apply the new solution\n`;
              output += `3. The solution will have updated success rates based on this resolution\n`;
            }

            return {
              content: [
                { type: "text", text: output },
                {
                  type: "text",
                  text: `\n\n**Ticket Details:**\n\`\`\`json\n${JSON.stringify({
                    ...ticket,
                    current_status: status,
                    updates: updates,
                    minutes_elapsed: minutesElapsed
                  }, null, 2)}\n\`\`\``
                }
              ]
            };
            
          } catch (error) {
            return {
              content: [{
                type: "text",
                text: `❌ **Ticket not found:** ${ticket_id}\n\nPlease check the ticket ID or use \`create_support_ticket\` to create a new ticket.`
              }]
            };
          }
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error checking ticket status: ${error}` }],
          };
        }
      }
    );

    // Simulate Support Resolution Tool (for demo)
    server.tool(
      "simulate_support_resolution",
      "Simulate support team resolving a ticket and adding solution to database (Demo only)",
      {
        ticket_id: z.string().describe("Support ticket ID to resolve"),
        solution_title: z.string().describe("Title of the solution"),
        solution_commands: z.array(z.string()).describe("Commands to resolve the problem"),
      },
      async ({ ticket_id, solution_title, solution_commands }) => {
        try {
          // Load the ticket
          const ticketPath = `./support_tickets/${ticket_id}.json`;
          const ticketData = await fs.readFile(ticketPath, 'utf8');
          const ticket = JSON.parse(ticketData);
          
          // Create a new solution based on the ticket
          const newSolution = {
            title: solution_title,
            description: `Solution for: ${ticket.description}`,
            problem_patterns: [ticket.problem_id],
            solution_type: 'support_resolution',
            commands: solution_commands.map(cmd => ({
              platform: 'darwin',
              command: cmd,
              description: `Support team resolution: ${cmd}`,
              risk_level: 'low'
            })),
            keywords: ticket.problem_id.split('_'),
            platforms: ['darwin', 'linux'],
            requires_admin: false,
            notes: `Solution created by ${ticket.assigned_team} for ticket ${ticket_id}`
          };

          // Add the solution to the database
          const addedSolution = await addSolution(newSolution);
          
          let output = `# 🎉 Support Ticket Resolved!\n\n`;
          output += `🎫 **Ticket ID:** ${ticket_id}\n`;
          output += `✅ **Status:** RESOLVED\n`;
          output += `💡 **Solution Created:** ${solution_title}\n`;
          output += `🆔 **Solution ID:** ${addedSolution.id}\n`;
          output += `📅 **Resolved:** ${new Date().toLocaleString()}\n\n`;
          
          output += `## 🔧 Solution Details:\n`;
          output += `- **Title:** ${addedSolution.title}\n`;
          output += `- **Commands:** ${solution_commands.length} resolution steps\n`;
          output += `- **Success Rate:** Starting at 50% (will improve with usage)\n`;
          output += `- **Version:** ${addedSolution.version}\n\n`;
          
          output += `## 📚 Knowledge Base Updated!\n`;
          output += `This solution is now available in the database for:\n`;
          output += `- Automatic problem matching\n`;
          output += `- Future similar incidents\n`;
          output += `- One-click resolution\n\n`;
          
          output += `## 🚀 Next Steps:\n`;
          output += `1. Use \`find_solutions\` to see the new solution\n`;
          output += `2. Apply the solution to resolve the current problem\n`;
          output += `3. The system learns from this resolution for future incidents\n`;

          return {
            content: [
              { type: "text", text: output },
              {
                type: "text",
                text: `\n\n**Resolution Summary:**\n\`\`\`json\n${JSON.stringify({
                  ticket_id: ticket_id,
                  original_problem: ticket.problem_id,
                  solution_id: addedSolution.id,
                  resolution_time: new Date().toISOString(),
                  commands_count: solution_commands.length,
                  knowledge_base_updated: true
                }, null, 2)}\n\`\`\``
              }
            ]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error simulating support resolution: ${error}` }],
          };
        }
      }
    );

    // View Solutions Database Tool
    server.tool(
      "view_solutions_database",
      "View the complete solutions database with all available solutions and their success rates",
      {},
      async () => {
        try {
          const solutions = await loadSolutionDatabase();
          
          let output = `# 📚 Complete Solutions Database\n\n`;
          output += `**Database Status:** ${solutions.length} solutions available\n`;
          output += `**Last Updated:** ${new Date().toLocaleString()}\n\n`;
          
          // Group by solution type
          const solutionTypes = {};
          solutions.forEach(solution => {
            if (!solutionTypes[solution.solution_type]) {
              solutionTypes[solution.solution_type] = [];
            }
            solutionTypes[solution.solution_type].push(solution);
          });
          
          Object.keys(solutionTypes).forEach(type => {
            output += `## ${type.replace('_', ' ').toUpperCase()} Solutions\n\n`;
            
            solutionTypes[type].forEach((solution, index) => {
              output += `### ${index + 1}. ${solution.title}\n`;
              output += `- **ID:** \`${solution.id}\`\n`;
              output += `- **Success Rate:** ${(solution.success_rate * 100).toFixed(1)}% (${solution.success_count}/${solution.application_count} applications)\n`;
              output += `- **Version:** ${solution.version}\n`;
              output += `- **Platforms:** ${solution.system_requirements.platforms.join(', ')}\n`;
              output += `- **Problem Patterns:** ${solution.problem_patterns.join(', ')}\n`;
              output += `- **Keywords:** ${solution.keywords.join(', ')}\n`;
              output += `- **Created By:** ${solution.created_by}\n`;
              if (solution.notes) {
                output += `- **Notes:** ${solution.notes}\n`;
              }
              output += `\n`;
            });
          });

          return {
            content: [
              { type: "text", text: output },
              {
                type: "text",
                text: `\n\n**Database Analytics:**\n\`\`\`json\n${JSON.stringify({
                  total_solutions: solutions.length,
                  solution_types: Object.keys(solutionTypes),
                  average_success_rate: (solutions.reduce((sum, s) => sum + s.success_rate, 0) / solutions.length * 100).toFixed(1) + '%',
                  total_applications: solutions.reduce((sum, s) => sum + s.application_count, 0),
                  total_successful: solutions.reduce((sum, s) => sum + s.success_count, 0),
                  platforms_supported: [...new Set(solutions.flatMap(s => s.system_requirements.platforms))],
                  newest_solution: solutions.sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated))[0].title,
                  highest_success_rate: Math.max(...solutions.map(s => s.success_rate)) * 100 + '%'
                }, null, 2)}\n\`\`\``
              }
            ]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error viewing solutions database: ${error}` }],
          };
        }
      }
    );

    // Reset Demo Environment Tool
    server.tool(
      "reset_demo_environment",
      "Reset the demo environment to initial state for repeated demonstrations",
      {},
      async () => {
        try {
          let output = `# 🔄 Resetting Demo Environment\n\n`;
          const results = [];

          // Clean up any existing demo files
          try {
            await execAsync('rm -rf ~/banking_incident_demo');
            output += `✅ **Cleaned banking incident files**\n`;
            results.push({ action: 'clean_banking_incident', status: 'success' });
          } catch (error) {
            output += `ℹ️ **Banking incident files:** Already clean\n`;
            results.push({ action: 'clean_banking_incident', status: 'already_clean' });
          }

          try {
            await execAsync('rm -rf ~/demo_system_problems');
            output += `✅ **Cleaned demo system problems**\n`;
            results.push({ action: 'clean_demo_problems', status: 'success' });
          } catch (error) {
            output += `ℹ️ **Demo system problems:** Already clean\n`;
            results.push({ action: 'clean_demo_problems', status: 'already_clean' });
          }

          // Kill any remaining simulator processes
          try {
            await execAsync('pkill -f "memory_leak_simulator"; pkill -f "database_load_simulator"; pkill -f "memory_hog.js"; pkill -f "cpu_hog.js"');
            output += `✅ **Stopped all simulator processes**\n`;
            results.push({ action: 'kill_simulators', status: 'success' });
          } catch (error) {
            output += `ℹ️ **Simulator processes:** None running\n`;
            results.push({ action: 'kill_simulators', status: 'none_found' });
          }

          // Clean up support tickets
          try {
            await execAsync('rm -rf ./support_tickets');
            output += `✅ **Cleared support ticket history**\n`;
            results.push({ action: 'clean_tickets', status: 'success' });
          } catch (error) {
            output += `ℹ️ **Support tickets:** Already clean\n`;
            results.push({ action: 'clean_tickets', status: 'already_clean' });
          }

          // Reset solution database to defaults (optional)
          try {
            await fs.unlink('./solutions_database.json');
            output += `✅ **Reset solution database to defaults**\n`;
            results.push({ action: 'reset_database', status: 'success' });
          } catch (error) {
            output += `ℹ️ **Solution database:** Using existing version\n`;
            results.push({ action: 'reset_database', status: 'existing' });
          }

          output += `\n🎯 **Demo Environment Reset Complete!**\n\n`;
          output += `## Ready for Fresh Demo:\n`;
          output += `1. Run \`./create-banking-incident.sh\` to create problems\n`;
          output += `2. Use \`detect_problems\` to find issues\n`;
          output += `3. Use \`find_solutions\` to get fixes\n`;
          output += `4. Use \`apply_solution\` to resolve problems\n`;
          output += `5. Use \`view_solutions_database\` to see the knowledge base\n\n`;
          output += `🚀 **The system is ready for your next hackathon presentation!**`;

          return {
            content: [
              { type: "text", text: output },
              {
                type: "text",
                text: `\n\n**Reset Summary:**\n\`\`\`json\n${JSON.stringify({
                  timestamp: new Date().toISOString(),
                  actions_completed: results.length,
                  successful_actions: results.filter(r => r.status === 'success').length,
                  demo_ready: true,
                  results: results
                }, null, 2)}\n\`\`\``
              }
            ]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error resetting demo environment: ${error}` }],
          };
        }
      }
    );
    
    // Create stdio transport
    const transport = new StdioServerTransport();
    
    // Connect server to transport
    await server.connect(transport);
    
    // Log that server is ready (to stderr so it doesn't interfere with MCP protocol)
    console.error("System Diagnostics MCP Server ready and listening on stdio");
    
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
