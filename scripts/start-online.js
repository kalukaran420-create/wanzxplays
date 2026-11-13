const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname, '..');
const CLIENT_DIST = path.join(ROOT_DIR, 'client', 'dist', 'index.html');
const SERVER_DIST = path.join(ROOT_DIR, 'server', 'dist', 'index.js');
const PORT = process.env.PORT || 5000;

function logStep(msg) {
  console.log(`\x1b[36m[PulseCord Setup]\x1b[0m ${msg}`);
}

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        // Skip virtual network adapters if possible
        const lname = name.toLowerCase();
        if (!lname.includes('virtual') && !lname.includes('vethernet') && !lname.includes('hotspot')) {
          return net.address;
        }
      }
    }
  }
  // Fallback to any IPv4 non-internal
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

function checkHealth(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(port, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkHealth(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function startCloudflareTunnel(port) {
  return new Promise((resolve, reject) => {
    try {
      const { bin } = require('cloudflared');
      const tunnelProc = spawn(bin, ['tunnel', '--url', `http://localhost:${port}`]);
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          try { tunnelProc.kill(); } catch {}
          reject(new Error('Cloudflare tunnel startup timed out'));
        }
      }, 30000);

      const onData = (data) => {
        const text = data.toString();
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/i);
        if (match && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({
            url: match[0],
            process: tunnelProc,
            type: 'Cloudflare Tunnel (Direct HTTPS, zero configuration)',
          });
        }
      };

      tunnelProc.stdout.on('data', onData);
      tunnelProc.stderr.on('data', onData);

      tunnelProc.on('error', (err) => {
        if (!resolved) {
          clearTimeout(timeout);
          reject(err);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function startLocaltunnel(port) {
  const localtunnel = require('localtunnel');
  const tunnel = await localtunnel({ port });
  let publicIp = '';
  try {
    const res = await fetch('https://api.ipify.org');
    publicIp = await res.text();
  } catch {}
  return {
    url: tunnel.url,
    process: {
      kill: () => tunnel.close(),
    },
    type: 'Localtunnel',
    password: publicIp,
  };
}

async function main() {
  console.clear?.();
  console.log(`\n\x1b[35m====================================================================\x1b[0m`);
  console.log(`\x1b[1m\x1b[32m           ⚡ STARTING PULSECORD FOR ONLINE COMMUNICATIONS          \x1b[0m`);
  console.log(`\x1b[35m====================================================================\x1b[0m\n`);

  // 1. Build check
  if (!fs.existsSync(CLIENT_DIST) || !fs.existsSync(SERVER_DIST)) {
    logStep('Building client and server (this only takes a few seconds)...');
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
  }

  // 2. Start server
  logStep(`Starting backend server on port ${PORT}...`);
  const serverProc = spawn('node', [SERVER_DIST], {
    cwd: ROOT_DIR,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  serverProc.stdout.on('data', () => {}); // silence standard startup banner to avoid clutter

  const isUp = await waitForServer(PORT);
  if (!isUp) {
    console.error('\x1b[31mFailed to start PulseCord server. Please check the logs.\x1b[0m');
    process.exit(1);
  }
  logStep('Server is healthy and ready to accept connections.');

  // 3. Establish public tunnel
  logStep('Establishing secure online HTTPS tunnel for multi-device access...');
  let tunnelInfo = null;

  try {
    tunnelInfo = await startCloudflareTunnel(PORT);
  } catch (cfErr) {
    logStep(`Cloudflare tunnel fallback: ${cfErr.message}`);
    logStep('Attempting Localtunnel fallback...');
    try {
      tunnelInfo = await startLocaltunnel(PORT);
    } catch (ltErr) {
      console.warn('\x1b[33mWarning: Could not start external tunnel. Local network will still work!\x1b[0m', ltErr.message);
    }
  }

  const lanIp = getLanIp();

  // 4. Print Dashboard
  console.log(`\n\x1b[32m====================================================================\x1b[0m`);
  console.log(`\x1b[1m\x1b[32m🎉 PULSECORD IS LIVE & READY FOR DIFFERENT DEVICES TO COMMUNICATE!\x1b[0m`);
  console.log(`\x1b[32m====================================================================\x1b[0m\n`);

  if (tunnelInfo) {
    console.log(`\x1b[1m\x1b[36m🌐 1. GLOBAL ONLINE LINK (Any device anywhere in the world):\x1b[0m`);
    console.log(`   👉 \x1b[1m\x1b[33m${tunnelInfo.url}\x1b[0m`);
    console.log(`   • Open this URL on your phone (Safari/Chrome), iPad, or friend's PC.`);
    console.log(`   • Works over 4G/5G mobile cellular data or any external Wi-Fi.`);
    console.log(`   • Full HTTPS active: Microphone & WebRTC voice channels enabled!`);
    if (tunnelInfo.password) {
      console.log(`   • Tunnel Password (if prompted by Localtunnel): \x1b[1m${tunnelInfo.password}\x1b[0m`);
    }
    console.log('');
  }

  console.log(`\x1b[1m\x1b[36m📱 2. LOCAL WI-FI LINK (Devices on your same home/office Wi-Fi):\x1b[0m`);
  console.log(`   👉 \x1b[1m\x1b[33mhttp://${lanIp}:${PORT}\x1b[0m`);
  console.log(`   • Instant access for any device on your Wi-Fi network.`);
  console.log('');

  console.log(`\x1b[1m\x1b[36m💻 3. THIS COMPUTER:\x1b[0m`);
  console.log(`   👉 \x1b[1m\x1b[33mhttp://localhost:${PORT}\x1b[0m`);
  console.log('');

  console.log(`\x1b[1m\x1b[35m🔑 PRE-SEEDED TEST ACCOUNTS (Login & chat between devices):\x1b[0m`);
  console.log(`   ┌────────────────────┬─────────────┬───────────────────────────┐`);
  console.log(`   │ Email              │ Password    │ Description               │`);
  console.log(`   ├────────────────────┼─────────────┼───────────────────────────┤`);
  console.log(`   │ alex@pulsecord.io  │ password123 │ Owner of "Developers Hub" │`);
  console.log(`   │ sarah@pulsecord.io │ password123 │ Owner of "Gaming Lounge"  │`);
  console.log(`   │ bob@pulsecord.io   │ password123 │ Community Member          │`);
  console.log(`   └────────────────────┴─────────────┴───────────────────────────┘`);
  console.log(`   (You can also click "Register" on any device to make a new user!)\n`);

  console.log(`\x1b[37m💡 TIP FOR TESTING REAL-TIME COMMUNICATIONS:\x1b[0m`);
  console.log(`   1. Open the Global Online Link on your phone (e.g. log in as Sarah).`);
  console.log(`   2. Open http://localhost:${PORT} on your PC (log in as Alex).`);
  console.log(`   3. Send messages, emojis, files, or join the 🔊 voice channel!`);
  console.log(`\n\x1b[90mPress Ctrl+C to stop PulseCord and close the tunnel.\x1b[0m\n`);

  // Cleanup on exit
  const cleanup = () => {
    console.log('\n\x1b[33mShutting down PulseCord server and tunnel...\x1b[0m');
    try { tunnelInfo?.process?.kill(); } catch {}
    try { serverProc.kill(); } catch {}
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

main().catch((err) => {
  console.error('\x1b[31mFatal error starting PulseCord:\x1b[0m', err);
  process.exit(1);
});
