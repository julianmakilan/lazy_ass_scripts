const tasks = [
    "Initializing heuristic data parsers...",
    "Syncing distributed ledger shards...",
    "Optimizing recursive buffer allocations...",
    "Verifying checksum for secondary kernel modules...",
    "Re-routing asynchronous packet streams...",
    "Compiling hot-fix for legacy API middleware...",
    "Garbage collection initiated: 452MB reclaimed.",
    "Injecting dependency hooks into root namespace...",
    "Patching vulnerability in encryption layer 4...",
    "Resolving circular dependencies in build tree...",
    "Executing pre-flight stress test on UI thread...",
    "Mapping virtual memory addresses to physical blocks...",
    "Deploying containerized micro-services to local node...",
    "Minifying CSS assets for production environment...",
    "Scrubbing metadata from temporary log files...",
    "Regenerating cryptographic salts for auth-token...",
    "Auditing socket connections for latency spikes...",
    "Normalizing relational database schemas...",
    "Bypassing cache-miss on redundant file descriptors...",
    "Setting up flux capacitors for for recursive calls...",
    "Building dependency graph..."
];

// Terminal Color Codes
const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";
const BRIGHT = "\x1b[1m";

let count = 0;

async function startInfiniteBuild() {
    console.log(`${RED}${BRIGHT}SYSTEM MONITOR ACTIVE - PRESS CTRL+C TO ABORT${RESET}\n`);

    while (true) {
        const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
        const delay = Math.floor(Math.random() * 1700) + 300;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const timestamp = new Date().toLocaleTimeString();
        
        console.log(`[${timestamp}] ${GREEN}RUNNING: ${randomTask}${RESET}`);
       
        if (Math.random() > 0.8) {
            console.log(`[${timestamp}] ${BLUE} >> Module optimization complete.${RESET}`);
        }

        count++;
        process.stdout.write(`${BLUE}${BRIGHT}Tasks compiled at runtime: ${count}${RESET}\r`);
    }
}

startInfiniteBuild();

// run in terminal with node for maximum productivity
