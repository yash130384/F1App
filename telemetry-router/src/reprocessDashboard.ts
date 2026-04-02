import readline from 'readline';

export type FileStatus = 'pending' | 'processing' | 'done' | 'error';

interface QueueItem {
    name: string;
    status: FileStatus;
    progress: number;
    error?: string;
}

const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgBlue: '\x1b[44m'
};

/**
 * Ein spezielles Dashboard für die Nachverarbeitung von BIN-Dateien.
 * Zeigt eine Queue, den aktuellen Fortschritt und ein Fehler-Log am unteren Rand.
 */
export class ReprocessDashboard {
    private queue: QueueItem[] = [];
    private logs: string[] = [];
    private maxLogs: number = 10;
    private startTime: number = Date.now();
    private title: string;

    constructor(files: string[], title: string = 'BIN IMPORT MANAGER') {
        this.title = title;
        this.queue = files.map(f => ({
            name: f,
            status: 'pending',
            progress: 0
        }));
    }

    public start() {
        // Initialer Render
        this.render();
    }

    public setStatus(fileName: string, status: FileStatus, error?: string) {
        const item = this.queue.find(q => q.name === fileName);
        if (item) {
            item.status = status;
            if (error) item.error = error;
        }
        this.render();
    }

    public updateProgress(fileName: string, progress: number) {
        const item = this.queue.find(q => q.name === fileName);
        if (item) {
            item.progress = progress;
        }
        this.render();
    }

    public log(message: string, type: 'info' | 'error' | 'success' = 'info') {
        const icons = {
            info: `${COLORS.blue}ℹ️${COLORS.reset}`,
            error: `${COLORS.red}❌${COLORS.reset}`,
            success: `${COLORS.green}✅${COLORS.reset}`
        };
        const timestamp = `${COLORS.dim}${new Date().toLocaleTimeString()}${COLORS.reset}`;
        this.logs.push(`[${timestamp}] ${icons[type]} ${message}`);
        
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        this.render();
    }

    private render() {
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);

        const width = Math.min(process.stdout.columns || 100, 120);
        const separator = `${COLORS.magenta}${COLORS.bright}═${COLORS.reset}`.repeat(width);
        const thinSeparator = `${COLORS.dim}─${COLORS.reset}`.repeat(width);

        // Header
        process.stdout.write(`${separator}\n`);
        process.stdout.write(` ${COLORS.bright}${COLORS.bgBlue} 🏎  F1 TELEMETRY ${COLORS.reset} | ${COLORS.cyan}${this.title}${COLORS.reset} | Laufzeit: ${COLORS.yellow}${this.getElapsed()}${COLORS.reset}\n`);
        process.stdout.write(`${separator}\n\n`);

        // Queue Section
        process.stdout.write(` ${COLORS.bright}📋 QUEUE ZUSTAND:${COLORS.reset}\n`);
        this.queue.forEach((item, index) => {
            const statusIcon = this.getStatusIcon(item.status);
            const progress = Math.round(item.progress);
            const progressBar = this.getProgressBar(progress, 30, item.status);
            
            let displayName = item.name;
            if (displayName.length > 40) displayName = '...' + displayName.slice(-37);
            
            const color = item.status === 'processing' ? COLORS.bright : (item.status === 'done' ? COLORS.dim : COLORS.reset);
            const line = ` ${color}${index + 1}.${COLORS.reset} ${statusIcon} ${color}${displayName.padEnd(42)}${COLORS.reset} [${progressBar}] ${COLORS.bright}${progress.toString().padStart(3)}%${COLORS.reset}\n`;
            process.stdout.write(line);
        });

        process.stdout.write(`\n${thinSeparator}\n`);

        // Log Section
        process.stdout.write(` ${COLORS.bright}ログ LOG & ERRORS:${COLORS.reset}\n`);
        if (this.logs.length === 0) {
            process.stdout.write(` ${COLORS.dim}(Warte auf Aktivitäten...)${COLORS.reset}\n`);
        } else {
            this.logs.forEach(log => process.stdout.write(` ${log}\n`));
        }

        // Leerzeilen auffüllen
        for (let i = this.logs.length; i < this.maxLogs; i++) {
            process.stdout.write('\n');
        }

        process.stdout.write(`${separator}\n`);
        process.stdout.write(` ${COLORS.dim}Drücken Sie${COLORS.reset} ${COLORS.red}Strg+C${COLORS.reset} ${COLORS.dim}zum Abbrechen.${COLORS.reset}\n`);
    }

    private getStatusIcon(status: FileStatus): string {
        switch (status) {
            case 'pending': return `${COLORS.dim}⏳${COLORS.reset}`;
            case 'processing': return `${COLORS.yellow}⚙️ ${COLORS.reset}`;
            case 'done': return `${COLORS.green}✅${COLORS.reset}`;
            case 'error': return `${COLORS.red}❌${COLORS.reset}`;
            default: return '❓';
        }
    }

    private getProgressBar(progress: number, width: number, status: FileStatus): string {
        const filledWidth = Math.floor((progress / 100) * width);
        const emptyWidth = width - filledWidth;
        
        let char = '█';
        let color = COLORS.dim;
        
        if (status === 'processing') color = COLORS.cyan;
        if (status === 'done') color = COLORS.green;
        if (status === 'error') color = COLORS.red;

        return `${color}${char.repeat(filledWidth)}${COLORS.reset}${COLORS.dim}${'░'.repeat(emptyWidth)}${COLORS.reset}`;
    }

    private getElapsed(): string {
        const seconds = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    }
}
