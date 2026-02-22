const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: '*',
    exposedHeaders: ['Content-Disposition']
}));
app.use(express.json());

const IS_WIN = process.platform === 'win32';
const YTDLP = IS_WIN
    ? path.join(__dirname, '..', 'bin', 'yt-dlp.exe')
    : 'yt-dlp';
const FFMPEG = IS_WIN
    ? path.join(__dirname, '..', 'bin', 'ffmpeg_temp', 'ffmpeg-master-latest-win64-gpl', 'bin', 'ffmpeg.exe')
    : 'ffmpeg';
const TMPDIR = os.tmpdir();

function cookieArgs(privateMode, browser) {
    return privateMode === 'true' ? ['--cookies-from-browser', browser || 'chrome'] : [];
}

// ─── Fixed 4 clean format options ───────────────────────────
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

// ─── GET /api/info ───────────────────────────────────────────
app.get('/api/info', (req, res) => {
    const { url, privateMode, browser } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const args = ['-j', '--no-playlist', ...cookieArgs(privateMode, browser), url];
    const proc = spawn(YTDLP, args);

    let out = '', err = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });

    proc.on('close', code => {
        if (code !== 0) {
            const isPrivate = /sign in|private|login|members only/i.test(err);
            return res.status(500).json({
                error: isPrivate
                    ? 'This video is private. Enable Private Mode and pick the browser you\'re logged in with.'
                    : 'Could not fetch video info. Check the URL and try again.'
            });
        }
        try {
            const info = JSON.parse(out);
            // Always return the same 4 clean choices
            res.json({
                title: info.title,
                thumbnail: info.thumbnail,
                duration: info.duration,
                uploader: info.uploader || info.channel || '',
                formats: FIXED_FORMATS
            });
        } catch {
            res.status(500).json({ error: 'Could not read video data.' });
        }
    });
});

// ─── GET /api/download ───────────────────────────────────────
// Downloads to a temp file, then streams it to the browser.
// Browser shows a native Save / Download dialog.
app.get('/api/download', (req, res) => {
    const { url, format, ext, label, privateMode, browser } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const fileExt = (ext || 'mp4').replace(/[^a-z0-9]/gi, '');
    const safeLabel = (label || 'video').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').substring(0, 80);
    const tmpFile = path.join(TMPDIR, `spc_${Date.now()}.${fileExt}`);

    const args = [
        '--ffmpeg-location', FFMPEG,
        '-f', format || 'best',
        '--merge-output-format', fileExt,
        '--no-playlist',
        '-o', tmpFile,
        ...cookieArgs(privateMode, browser),
        url
    ];

    console.log('[download] yt-dlp', args.join(' '));

    const proc = spawn(YTDLP, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    proc.stdout.on('data', d => process.stdout.write(d));
    proc.stderr.on('data', d => process.stderr.write(d));

    proc.on('error', err => {
        console.error('[spawn error]', err);
        if (!res.headersSent) res.status(500).json({ error: 'Download failed to start.' });
    });

    proc.on('close', code => {
        if (code !== 0 || !fs.existsSync(tmpFile)) {
            if (!res.headersSent) return res.status(500).json({ error: 'yt-dlp failed.' });
            return;
        }
        // Stream file to browser as an attachment (triggers Save dialog)
        const filename = `${safeLabel}.${fileExt}`;
        res.download(tmpFile, filename, err => {
            fs.unlink(tmpFile, () => { }); // clean up temp file
            if (err && !res.headersSent) res.status(500).json({ error: 'File send failed.' });
        });
    });

    req.on('close', () => proc.kill());
});

app.listen(PORT, () =>
    console.log(`✅  SPC Media Server  →  http://localhost:${PORT}`)
);
