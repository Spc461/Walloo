const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ───────────────────────────────────────────────────
app.use(cors());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.header('Access-Control-Expose-Headers', 'Content-Disposition');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});
app.use(express.json());

// ─── Paths ──────────────────────────────────────────────────
const IS_WIN = process.platform === 'win32';
const YTDLP = IS_WIN
    ? path.join(__dirname, '..', 'bin', 'yt-dlp.exe')
    : 'yt-dlp';
const FFMPEG = IS_WIN
    ? path.join(__dirname, '..', 'bin', 'ffmpeg_temp', 'ffmpeg-master-latest-win64-gpl', 'bin', 'ffmpeg.exe')
    : 'ffmpeg';
const TMPDIR = os.tmpdir();

// ─── YouTube Cookie Setup ────────────────────────────────────
// Write the YOUTUBE_COOKIES env variable to a file so yt-dlp can use it.
// On Render: set Environment Variable YOUTUBE_COOKIES = content of cookies.txt
const COOKIES_FILE = path.join(TMPDIR, 'yt_cookies.txt');
let cookieArgs = [];

if (process.env.YOUTUBE_COOKIES) {
    try {
        fs.writeFileSync(COOKIES_FILE, process.env.YOUTUBE_COOKIES, 'utf8');
        cookieArgs = ['--cookies', COOKIES_FILE];
        console.log('✅ YouTube cookies loaded from environment variable.');
    } catch (e) {
        console.warn('⚠️  Failed to write cookies file:', e.message);
    }
} else {
    console.warn('⚠️  YOUTUBE_COOKIES env var not set. Downloads may be blocked by bot detection.');
}

// ─── Smart Bypass Engine ─────────────────────────────────────
function getSmartArgs(url) {
    const isYT = /youtube\.com|youtu\.be/.test(url);
    const isIG = /instagram\.com/.test(url);

    let args = [
        '--no-check-certificate',
        '--prefer-free-formats',
        '--add-header', 'Accept-Language:en-US,en;q=0.9',
    ];

    if (isYT) {
        // ios client is currently most reliable for skipping login without cookies
        args.push('--extractor-args', 'youtube:player-client=ios,web');
        args.push('--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
    } else if (isIG) {
        // Instagram requires specific mobile headers to avoid blocking
        args.push('--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
    } else {
        // Generic modern browser UA for everything else
        args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    }

    // Add cookies if available
    if (cookieArgs.length > 0) args.push(...cookieArgs);

    return args;
}

// ─── Fixed 4 quality options ─────────────────────────────────
const FIXED_FORMATS = [
    {
        format_id: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
        label: 'Best Quality',
        ext: 'mp4',
        type: 'video'
    },
    {
        format_id: 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]/best',
        label: '1080p HD',
        ext: 'mp4',
        type: 'video'
    },
    {
        format_id: 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]/best',
        label: '720p',
        ext: 'mp4',
        type: 'video'
    },
    {
        format_id: 'bestaudio[ext=m4a]/bestaudio/best',
        label: 'Audio Only',
        ext: 'm4a',
        type: 'audio'
    }
];

// ─── Health Check ────────────────────────────────────────────
app.get('/', (req, res) => {
    const cookieStatus = cookieArgs.length > 0 ? '✅ Cookies: Loaded' : '⚠️ Cookies: Not set';
    res.send(`✅ WALOO Media Server is running! | ${cookieStatus}`);
});

// ─── GET /api/info ───────────────────────────────────────────
app.get('/api/info', (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const args = [
        ...getSmartArgs(url),
        '-j',
        '--no-playlist',
        url
    ];

    console.log('[info] Running yt-dlp for:', url);
    const proc = spawn(YTDLP, args);

    let out = '', err = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });

    proc.on('error', e => {
        console.error('[info] spawn error:', e.message);
        if (!res.headersSent)
            res.status(500).json({ error: 'Server error: Could not start download process.' });
    });

    proc.on('close', code => {
        if (code !== 0) {
            console.error('[info] yt-dlp error:', err.slice(-600));
            const lines = err.split('\n').filter(l => l.trim());
            const errorLine = lines.find(l => l.includes('ERROR:')) || lines[lines.length - 1] || 'Unknown error';
            return res.status(500).json({ error: errorLine.replace('ERROR: ', '').trim() });
        }

        try {
            const info = JSON.parse(out);
            res.json({
                title: info.title,
                thumbnail: info.thumbnail,
                duration: info.duration,
                uploader: info.uploader || info.channel || '',
                formats: FIXED_FORMATS
            });
        } catch (e) {
            res.status(500).json({ error: 'Could not read video data.' });
        }
    });
});

// ─── GET /api/download ───────────────────────────────────────
app.get('/api/download', (req, res) => {
    const { url, format, ext, label } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const fileExt = (ext || 'mp4').replace(/[^a-z0-9]/gi, '');
    const safeLabel = (label || 'video')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .substring(0, 80);
    const tmpFile = path.join(TMPDIR, `spc_${Date.now()}.${fileExt}`);

    const args = [
        ...getSmartArgs(url),
        '--ffmpeg-location', FFMPEG,
        '-f', format || 'best',
        '--merge-output-format', fileExt,
        '--no-playlist',
        '-o', tmpFile,
        url
    ];

    console.log('[download] Downloading:', url, 'format:', format);
    const proc = spawn(YTDLP, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    proc.stdout.on('data', d => process.stdout.write(d));
    proc.stderr.on('data', d => process.stderr.write(d));

    proc.on('error', e => {
        console.error('[download] spawn error:', e.message);
        if (!res.headersSent) res.status(500).json({ error: 'Download failed to start.' });
    });

    proc.on('close', code => {
        if (code !== 0 || !fs.existsSync(tmpFile)) {
            if (!res.headersSent) return res.status(500).json({ error: 'Download failed. Try a different quality.' });
            return;
        }
        const filename = `${safeLabel}.${fileExt}`;
        res.download(tmpFile, filename, err => {
            fs.unlink(tmpFile, () => { });
            if (err && !res.headersSent) res.status(500).json({ error: 'File send failed.' });
        });
    });

    req.on('close', () => proc.kill());
});

app.listen(PORT, () =>
    console.log(`✅  WALOO Media Server  →  http://localhost:${PORT}`)
);
