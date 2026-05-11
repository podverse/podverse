import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface BundleReport {
  timestamp: string;
  reportName: string;
  appTarget?: string; // 'web' or 'management-web'
  serverBundlePath?: string;
  clientBundlePath?: string;
  serverBundleSize?: number;
  clientBundleSize?: number;
  serverStatsPath?: string;
  clientStatsPath?: string;
  serverChunkSummary?: BundleChunkSummary;
  clientChunkSummary?: BundleChunkSummary;
}

export interface ChunkSummaryItem {
  name: string;
  size: number;
  files: string[];
}

export interface BundleChunkSummary {
  totalChunks: number;
  totalAssets: number;
  totalAssetSize: number;
  topChunks: ChunkSummaryItem[];
}

export class BundleReportManager {
  private reportsDir: string;

  constructor(appSubdir?: string) {
    const baseDir = path.join(__dirname, '../reports');
    this.reportsDir = appSubdir ? path.join(baseDir, appSubdir) : baseDir;
    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  sanitizeReportName(reportName: string): string {
    // Sanitize report name to be filesystem-safe
    return reportName.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  getReportPath(reportName: string, type: 'server' | 'client' | 'json' = 'json'): string {
    const sanitized = this.sanitizeReportName(reportName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = type === 'json' ? 'json' : 'html';
    return path.join(this.reportsDir, `bundle-report-${sanitized}-${timestamp}.${extension}`);
  }

  getAllReports(): string[] {
    if (!fs.existsSync(this.reportsDir)) {
      return [];
    }

    try {
      const files = fs.readdirSync(this.reportsDir);
      const reports: string[] = [];

      for (const file of files) {
        if (file.startsWith('bundle-report-') && file.endsWith('.json')) {
          // Extract report name from filename: bundle-report-{name}-{timestamp}.json
          const match = file.match(/^bundle-report-(.+?)-[\d-TZ]+\.json$/);
          if (match) {
            const reportName = match[1];
            if (!reports.includes(reportName)) {
              reports.push(reportName);
            }
          }
        }
      }

      return reports.sort();
    } catch (error) {
      console.error('Error reading reports directory:', error);
      return [];
    }
  }

  saveReport(report: BundleReport): void {
    const reportPath = this.getReportPath(report.reportName, 'json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  saveHtmlReport(reportName: string, htmlContent: string, type: 'server' | 'client'): string {
    const reportPath = this.getReportPath(reportName, type);
    fs.writeFileSync(reportPath, htmlContent);
    return reportPath;
  }

  saveStatsReport(reportName: string, jsonContent: string, type: 'server' | 'client'): string {
    const sanitized = this.sanitizeReportName(reportName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(
      this.reportsDir,
      `bundle-report-${sanitized}-${timestamp}-${type}-stats.json`
    );
    fs.writeFileSync(reportPath, jsonContent);
    return reportPath;
  }

  loadReport(reportName: string): BundleReport | null {
    // Find the most recent report with this name
    if (!fs.existsSync(this.reportsDir)) {
      return null;
    }

    try {
      const files = fs.readdirSync(this.reportsDir);
      const matchingFiles = files
        .filter(
          (file) =>
            file.startsWith(`bundle-report-${this.sanitizeReportName(reportName)}-`) &&
            file.endsWith('.json')
        )
        .sort()
        .reverse(); // Most recent first

      if (matchingFiles.length === 0) {
        return null;
      }

      const reportPath = path.join(this.reportsDir, matchingFiles[0]);
      const content = fs.readFileSync(reportPath, 'utf-8');
      return JSON.parse(content) as BundleReport;
    } catch (error) {
      console.error(`Error loading report ${reportName}:`, error);
      return null;
    }
  }
}
