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
}

// ─── Smart Bypass Engine ─────────────────────────────────────
function getSmartArgs(url) {
    const isYT = /youtube\.com|youtu\.be/.test(url);
    const isIG = /instagram\.com/.test(url);

    let args = [
        '--no-check-certificate',
        '--add-header', 'Accept-Language:en-US,en;q=0.9',
    ];

    if (isYT) {
        args.push('--extractor-args', 'youtube:player-client=ios,web');
        args.push('--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
    } else if (isIG) {
        args.push('--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
    } else {
        args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    }

    if (cookieArgs.length > 0) args.push(...cookieArgs);
    return args;
}

// ─── Format Processor ────────────────────────────────────────
// Filters raw yt-dlp JSON into clean, UI-friendly options
function processFormats(raw) {
    const formats = [];
    const seenHeights = new Set();

    // 1. Add High-res Video (Requires merging)
    // We look for standard resolutions
    const targets = [2160, 1440, 1080, 720, 480, 360];

    targets.forEach(h => {
        // Find best MP4-compatible video at this height
        const v = raw.formats.find(f => f.height === h && (f.ext === 'mp4' || f.vcodec !== 'none') && f.acodec === 'none');
        if (v && !seenHeights.has(h)) {
            formats.push({
                format_id: `${v.format_id}+bestaudio[ext=m4a]/bestvideo+bestaudio/best`,
                label: `${h}p ${h >= 720 ? 'HD' : ''}`,
                ext: 'mp4',
                type: 'video',
                note: v.format_note || ''
            });
            seenHeights.add(h);
        }
    });

    // 2. Add Audio Only (MP3/M4A)
    formats.push({
        format_id: 'bestaudio[ext=m4a]/bestaudio/best',
        label: 'Best Audio (M4A/MP3)',
        ext: 'm4a',
        type: 'audio',
        note: 'High quality'
    });

    return formats;
}

// ─── Health Check ────────────────────────────────────────────
app.get('/', (req, res) => {
    res.send(`✅ WALOO Professional API is running!`);
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

    console.log('[info] Fetching metadata for:', url);
    const proc = spawn(YTDLP, args);

    let out = '', err = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });

    proc.on('error', e => {
        console.error('[info] spawn error:', e.message);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to start extractor.' });
    });

    proc.on('close', code => {
        if (code !== 0) {
            console.error('[info] yt-dlp error:', err.slice(-500));
            return res.status(500).json({ error: 'YouTube Blocked: Bot detection active.' });
        }

        try {
            const rawInfo = JSON.parse(out);
            const cleanFormats = processFormats(rawInfo);

            res.json({
                title: rawInfo.title,
                thumbnail: rawInfo.thumbnail,
                duration: rawInfo.duration,
                uploader: rawInfo.uploader || rawInfo.channel || '',
                formats: cleanFormats,
                is_playlist: rawInfo._type === 'playlist'
            });
        } catch (e) {
            res.status(500).json({ error: 'Internal Error: Could not parse metadata.' });
        }
    });
});

// ─── GET /api/download ───────────────────────────────────────
app.get('/api/download', (req, res) => {
    const { url, format, ext, label } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const fileExt = (ext || 'mp4').replace(/[^a-z0-9]/gi, '');
    const safeLabel = (label || 'video').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').substring(0, 80);
    const tmpFile = path.join(TMPDIR, `waloo_${Date.now()}.${fileExt}`);

    const args = [
        ...getSmartArgs(url),
        '--ffmpeg-location', FFMPEG,
        '-f', format || 'best',
        '--merge-output-format', fileExt,
        '--no-playlist',
        '-o', tmpFile,
        url
    ];

    console.log('[download] Starting:', url);
    const proc = spawn(YTDLP, args);

    proc.stdout.on('data', d => process.stdout.write(d));
    proc.stderr.on('data', d => process.stderr.write(d));

    proc.on('close', code => {
        if (code !== 0 || !fs.existsSync(tmpFile)) {
            if (!res.headersSent) return res.status(500).json({ error: 'Download failed.' });
            return;
        }

        const filename = `${safeLabel}.${fileExt}`;
        res.download(tmpFile, filename, err => {
            fs.unlink(tmpFile, () => { });
        });
    });

    req.on('close', () => proc.kill());
});

app.listen(PORT, () =>
    console.log(`✅  WALOO API  →  http://localhost:${PORT}`)
);
