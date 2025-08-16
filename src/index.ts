import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as os from "os";
import * as fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Configuration schema
export const configSchema = z.object({
  debug: z.boolean().default(false).describe("Enable debug logging"),
  enableSystemInfo: z.boolean().default(true).describe("Enable system information collection"),
  enableLogs: z.boolean().default(true).describe("Enable log collection"),
  enableNetwork: z.boolean().default(true).describe("Enable network diagnostics"),
  enablePerformance: z.boolean().default(true).describe("Enable performance monitoring"),
});

interface SystemInfo {
  platform: string;
  arch: string;
  release: string;
  hostname: string;
  uptime: number;
  totalMemory: number;
  freeMemory: number;
  cpuCount: number;
  cpuModel: string;
  loadAverage: number[];
}

interface DiskInfo {
  filesystem: string;
  size: string;
  used: string;
  available: string;
  usePercentage: string;
  mountPoint: string;
}

// Utility functions for system diagnostics
async function getSystemInfo(): Promise<SystemInfo> {
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

async function getDiskInfo(): Promise<DiskInfo[]> {
  try {
    const platform = os.platform();
    let command: string;
    
    if (platform === 'win32') {
      command = 'wmic logicaldisk get size,freespace,caption';
    } else {
      command = 'df -h';
    }
    
    const { stdout } = await execAsync(command);
    
    if (platform === 'win32') {
      // Parse Windows output
      const lines = stdout.split('\n').filter(line => line.trim());
      const diskInfo: DiskInfo[] = [];
      
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
      // Parse Unix/Linux output
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

async function getProcessInfo(): Promise<any[]> {
  try {
    const platform = os.platform();
    let command: string;
    
    if (platform === 'win32') {
      command = 'tasklist /fo csv | findstr /v "Image Name"';
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

export default function createStatelessServer({
  config,
}: {
  config: z.infer<typeof configSchema>;
}) {
  const server = new McpServer({
    name: "System Diagnostics MCP Server",
    version: "1.0.0",
  });

  // System Information Tool
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
              text: `# System Information Report\n\n## System Details\n- **Platform**: ${result.system.platform}\n- **Architecture**: ${result.system.arch}\n- **Hostname**: ${result.system.hostname}\n- **Uptime**: ${result.system.uptimeFormatted}\n- **CPU**: ${result.system.cpuModel} (${result.system.cpuCount} cores)\n- **Memory**: ${Math.round(result.system.totalMemory / (1024**3))}GB total, ${Math.round(result.system.freeMemory / (1024**3))}GB free (${result.system.memoryUsagePercentage}% used)\n- **Load Average**: ${result.system.loadAverage.map(l => l.toFixed(2)).join(', ')}\n\n## Storage Information\n${result.storage.map(disk => `- **${disk.filesystem}**: ${disk.size} total, ${disk.used} used, ${disk.available} available (${disk.usePercentage} used) - ${disk.mountPoint}`).join('\n')}\n\n## Top Processes\n${result.topProcesses.slice(0, 5).map((proc: any) => `- **${proc.name || proc.command}** (PID: ${proc.pid}) - CPU: ${proc.cpu || 'N/A'}%, Memory: ${proc.memory}${proc.memory && !proc.memory.includes('%') ? 'KB' : ''}`).join('\n')}` 
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

  return server.server;
}
