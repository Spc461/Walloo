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

// ─── YouTube Cloud Bypass Args ───────────────────────────────
// The 'android' client is the most reliable bypass of YouTube's bot detection.
// '--no-check-certificate' fixes SSL issues on some cloud hosts.
const BYPASS_ARGS = [
    '--no-check-certificate',
    '--extractor-args', 'youtube:player_client=android',
    '--user-agent', 'com.google.android.youtube/17.36.4 (Linux; U; Android 12; GB) gzip',
];

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
    res.send('✅ WALOO Media Server is running!');
});

// ─── GET /api/info ───────────────────────────────────────────
app.get('/api/info', (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const args = [
        ...BYPASS_ARGS,
        '-j',
        '--no-playlist',
        url
    ];

    console.log('[info] Running:', YTDLP, args.join(' '));
    const proc = spawn(YTDLP, args);

    let out = '', err = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });

    proc.on('error', e => {
        console.error('[info] spawn error:', e.message);
        if (!res.headersSent)
            res.status(500).json({ error: 'Could not start yt-dlp. Server configuration error.' });
    });

    proc.on('close', code => {
        console.log('[info] yt-dlp exited with code', code);
        if (code !== 0) {
            console.error('[info] stderr:', err.slice(-800));
            // Extract the most readable error line
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
            console.error('[info] JSON parse error:', e.message);
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
        ...BYPASS_ARGS,
        '--ffmpeg-location', FFMPEG,
        '-f', format || 'best',
        '--merge-output-format', fileExt,
        '--no-playlist',
        '-o', tmpFile,
        url
    ];

    console.log('[download] Running:', YTDLP, args.join(' '));
    const proc = spawn(YTDLP, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    proc.stdout.on('data', d => process.stdout.write(d));
    proc.stderr.on('data', d => process.stderr.write(d));

    proc.on('error', e => {
        console.error('[download] spawn error:', e.message);
        if (!res.headersSent) res.status(500).json({ error: 'Download failed to start.' });
    });

    proc.on('close', code => {
        console.log('[download] yt-dlp exited with code', code);
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
