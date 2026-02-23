import React, { useState } from 'react';
import {
    Download, Link2, AlertCircle, Loader2, Video, Music,
    Instagram, X, Check, Zap, Globe,
    Server, Gauge, HeadphonesIcon, Code2, Key, ChevronRight
} from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

/* Colors from user's WALOO image */
const C = {
    bg: '#0a0a0a',
    surface: '#111111',
    surfaceHigh: '#181818',
    border: 'rgba(255,255,255,0.06)',
    borderHover: 'rgba(34,197,94,0.3)',
    green: '#22C55E',
    greenDim: 'rgba(34,197,94,0.08)',
    greenBorder: 'rgba(34,197,94,0.25)',
    text: '#ffffff',
    textMid: '#888888',
    textDim: '#444444',
};

/* ── Discord Icon ── */
const DiscordIcon = () => (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
        <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 14.09 14.09 0 0 0 1.226-1.963.075.075 0 0 0-.041-.104 13.2 13.2 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.094.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.027zM8.02 15.278c-1.182 0-2.157-1.07-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.31-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.07-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.31-.946 2.38-2.157 2.38z" />
    </svg>
);

/* ── Logo ── */
const WalooLogo = () => {
    const [imgOk, setImgOk] = useState(true);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {imgOk ? (
                /* Shows the WALOO photo — place your image at client/public/logo.png */
                <img
                    src="/logo.png"
                    alt="WALOO;"
                    onError={() => setImgOk(false)}
                    style={{
                        width: 36, height: 36, borderRadius: 8,
                        objectFit: 'cover', objectPosition: 'center 30%',
                        border: `1px solid ${C.border}`,
                    }}
                />
            ) : (
                /* Fallback SVG — matches the bold WALOO photo aesthetic */
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <rect width="36" height="36" rx="8" fill="#141414" />
                    <rect width="36" height="36" rx="8" fill={C.green} fillOpacity="0.12" />
                    <text
                        x="18" y="24"
                        textAnchor="middle"
                        fontSize="15"
                        fontWeight="900"
                        fontFamily="Inter, system-ui, sans-serif"
                        letterSpacing="-1"
                        fill="#ffffff"
                    >W;</text>
                </svg>
            )}
            <span style={{ fontSize: 18, fontWeight: 900, color: C.text, letterSpacing: '-0.04em', fontFamily: 'inherit' }}>
                WALOO;
            </span>
        </div>
    );
};

/* ── API Plans ── */
const PLANS = [
    {
        name: 'Starter', price: '$9', period: '/mo', limit: '500 req / day',
        features: ['Info endpoint', '720p downloads', 'YouTube & socials', 'Email support'],
        highlight: false,
    },
    {
        name: 'Pro', price: '$29', period: '/mo', limit: '5,000 req / day',
        features: ['Info + download endpoints', '4K downloads', '1000+ sites', 'Private mode', 'Priority support'],
        highlight: true,
    },
    {
        name: 'Business', price: '$79', period: '/mo', limit: 'Unlimited',
        features: ['Everything in Pro', 'Custom rate limits', 'Dedicated server', 'White-label', '24/7 support'],
        highlight: false,
    },
];

const FEATURES = [
    { icon: Zap, title: 'Fast extraction', desc: 'Video metadata in under 1 s' },
    { icon: Globe, title: '1000+ sites', desc: 'YouTube, Telegram, TikTok, Udemy…' },
    { icon: Globe, title: 'Global access', desc: 'Download from 1000+ sites instantly' },
    { icon: Code2, title: 'Simple REST', desc: 'Two clean endpoints, JSON responses' },
    { icon: Gauge, title: '99.9% uptime', desc: 'Hosted on fast, reliable servers' },
    { icon: HeadphonesIcon, title: 'Dev support', desc: 'Full docs + Discord from WALOO/SPC' },
];

/* ── API Modal ── */
function ApiModal({ onClose }) {
    return (
        <div
            onClick={e => e.target === e.currentTarget && onClose()}
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
        >
            <div style={{
                width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto',
                background: '#111', borderRadius: 20, border: `1px solid ${C.greenBorder}`,
                boxShadow: `0 0 60px rgba(34,197,94,0.08), 0 32px 80px rgba(0,0,0,0.6)`,
            }}>
                {/* Header */}
                <div style={{
                    padding: '22px 28px', borderBottom: `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    position: 'sticky', top: 0, background: '#111', zIndex: 10,
                }}>
                    <div>
                        <p style={{ fontSize: 10, fontWeight: 800, color: C.green, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                            WALOO; API
                        </p>
                        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: 0 }}>
                            API Access & Pricing
                        </h2>
                    </div>
                    <button onClick={onClose} style={{
                        width: 36, height: 36, borderRadius: 10,
                        border: `1px solid ${C.border}`, background: 'transparent',
                        cursor: 'pointer', color: C.textDim,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <X size={16} />
                    </button>
                </div>

                <div style={{ padding: '28px' }}>
                    {/* What is it */}
                    <section style={{ marginBottom: 32 }}>
                        <p style={{ fontSize: 11, fontWeight: 800, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>What Is the API?</p>
                        <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.75, maxWidth: 580, marginBottom: 16 }}>
                            The WALOO; Media API is the engine behind this downloader.
                            Any developer can call it to extract video metadata and stream downloads from 1,000+ sites.
                            Plug it into your Telegram bot, website, mobile app, or automation script.
                        </p>
                        <div style={{
                            background: '#0a0a0a', borderRadius: 12,
                            border: `1px solid ${C.border}`,
                            padding: '16px 20px', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.9,
                        }}>
                            <div><span style={{ color: C.green }}>GET</span> <span style={{ color: '#ccc' }}>/api/info?url=https://youtube.com/watch?v=...</span></div>
                            <div style={{ color: C.textDim, fontSize: 11 }}>→ title, thumbnail, duration, available quality options</div>
                            <br />
                            <div><span style={{ color: C.green }}>GET</span> <span style={{ color: '#ccc' }}>/api/download?url=...&amp;format=best&amp;ext=mp4</span></div>
                            <div style={{ color: C.textDim, fontSize: 11 }}>→ streams the video/audio file directly</div>
                        </div>
                    </section>

                    {/* Features */}
                    <section style={{ marginBottom: 32 }}>
                        <p style={{ fontSize: 11, fontWeight: 800, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Features</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
                                <div key={i} style={{
                                    padding: '14px 16px', borderRadius: 12,
                                    border: `1px solid ${C.border}`, background: C.surfaceHigh,
                                }}>
                                    <div style={{
                                        width: 30, height: 30, borderRadius: 8, background: C.greenDim,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: C.green, marginBottom: 10,
                                    }}>
                                        <Icon size={14} />
                                    </div>
                                    <p style={{ fontWeight: 800, color: '#e0e0e0', fontSize: 13, margin: '0 0 3px' }}>{title}</p>
                                    <p style={{ fontSize: 12, color: C.textDim, lineHeight: 1.5, margin: 0 }}>{desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Pricing */}
                    <section style={{ marginBottom: 32 }}>
                        <p style={{ fontSize: 11, fontWeight: 800, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Pricing</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                            {PLANS.map((p, i) => (
                                <div key={i} style={{
                                    padding: '20px', borderRadius: 14,
                                    border: p.highlight ? `1px solid ${C.greenBorder}` : `1px solid ${C.border}`,
                                    background: p.highlight ? C.greenDim : C.surfaceHigh,
                                    position: 'relative',
                                }}>
                                    {p.highlight && (
                                        <span style={{
                                            position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                                            background: C.green, color: '#000', fontSize: 9, fontWeight: 900,
                                            padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap',
                                        }}>Most Popular</span>
                                    )}
                                    <p style={{ fontWeight: 700, color: '#ccc', fontSize: 13, margin: '0 0 2px' }}>{p.name}</p>
                                    <p style={{ fontSize: 11, color: C.textDim, margin: '0 0 14px' }}>{p.limit}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
                                        <span style={{ fontSize: 32, fontWeight: 900, color: p.highlight ? C.green : C.text, letterSpacing: '-0.03em' }}>{p.price}</span>
                                        <span style={{ fontSize: 12, color: C.textDim }}>{p.period}</span>
                                    </div>
                                    <ul style={{ padding: 0, margin: '0 0 16px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {p.features.map((f, j) => (
                                            <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: C.textMid }}>
                                                <Check size={12} style={{ color: C.green, flexShrink: 0 }} /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <a href="https://instagram.com/spc.gpt" target="_blank" rel="noopener noreferrer"
                                        style={{
                                            display: 'block', textAlign: 'center', padding: '10px', borderRadius: 10,
                                            fontSize: 12, fontWeight: 800, textDecoration: 'none',
                                            ...(p.highlight
                                                ? { background: C.green, color: '#000' }
                                                : { border: `1px solid ${C.border}`, color: C.textMid }),
                                        }}>
                                        Contact to Buy
                                    </a>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* CTAs */}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a href="https://instagram.com/spc.gpt" target="_blank" rel="noopener noreferrer"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 7,
                                padding: '11px 22px', borderRadius: 12, textDecoration: 'none',
                                background: C.green, color: '#000', fontSize: 13, fontWeight: 800,
                            }}>
                            <Instagram size={14} /> @spc.gpt
                        </a>
                        <a href="https://discord.com/users/sspc_" target="_blank" rel="noopener noreferrer"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 7,
                                padding: '11px 22px', borderRadius: 12, textDecoration: 'none',
                                border: `1px solid ${C.border}`, color: C.textMid, fontSize: 13, fontWeight: 800,
                            }}>
                            <DiscordIcon /> sspc_
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ══════════ Main App ══════════ */
export default function App() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [info, setInfo] = useState(null);
    const [error, setError] = useState('');
    const [downloading, setDownloading] = useState('');
    const [apiOpen, setApiOpen] = useState(false);

    const doFetch = async () => {
        const u = url.trim();
        if (!u) return;
        setLoading(true); setError(''); setInfo(null);
        try {
            const r = await axios.get(`${API_BASE}/api/info`, {
                params: { url: u }
            });
            setInfo(r.data);
        } catch (e) {
            console.error('[Fetch Error]', e);
            if (!e.response) {
                // No response = request didn't even reach the server
                if (window.location.hostname !== 'localhost' && API_BASE.includes('localhost')) {
                    setError(`Environment Variable missing! The app is trying to hit ${API_BASE} which doesn't exist in the cloud. Set VITE_API_BASE on Netlify.`);
                } else {
                    setError(`Network Error: Browser blocked the request to ${API_BASE}. This is usually an Ad-blocker, Firewall, or a CORS/SSL mismatch. Try disabling your Ad-blocker or opening in Incognito.`);
                }
            } else {
                setError(e.response?.data?.error || 'Could not fetch video info. Check the link and try again.');
            }
        } finally { setLoading(false); }
    };

    const doDownload = (fmt) => {
        setDownloading(fmt.format_id);
        const p = new URLSearchParams({
            url,
            format: fmt.format_id,
            ext: fmt.ext,
            label: fmt.label
        }).toString();

        // Ensure API_BASE is absolute. If it's a proxy (/api), browser handles it.
        // If it's localhost or a domain, we need the full URL.
        const downloadUrl = API_BASE.startsWith('http')
            ? `${API_BASE}/api/download?${p}`
            : `${window.location.origin}${API_BASE}/api/download?${p}`;

        window.location.href = downloadUrl;
        setTimeout(() => setDownloading(''), 5000);
    };

    const dur = (s) => s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '';

    const inputBorderStyle = { borderColor: C.border };

    return (
        <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", position: 'relative' }}>
            {apiOpen && <ApiModal onClose={() => setApiOpen(false)} />}

            {/* ── Blurred background image ── */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
                backgroundImage: 'url(/logo.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center 20%',
                filter: 'blur(28px) brightness(0.18) saturate(1.4)',
                transform: 'scale(1.08)', /* hide blur edges */
            }} />
            {/* ── Green gradient overlay ── */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.13) 0%, rgba(10,10,10,0.85) 60%, rgba(10,10,10,0.97) 100%)',
            }} />

            {/* ── Navbar ── */}
            <nav style={{
                position: 'sticky', top: 0, zIndex: 40,
                background: 'rgba(10,10,10,0.75)', backdropFilter: 'blur(20px)',
                borderBottom: `1px solid ${C.border}`,
                height: 56, padding: '0 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <WalooLogo />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <a href="https://instagram.com/spc.gpt" target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, fontWeight: 700, color: C.textDim, textDecoration: 'none', padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}` }}>
                        @spc.gpt
                    </a>
                    <button onClick={() => setApiOpen(true)} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: C.green, color: '#000', fontSize: 12, fontWeight: 800,
                    }}>
                        <Key size={12} /> Buy API
                    </button>
                </div>
            </nav>

            {/* ── Main ── */}
            <main style={{ maxWidth: 560, margin: '0 auto', padding: '64px 20px 80px', position: 'relative', zIndex: 1 }}>

                {/* Hero text */}
                <div style={{ marginBottom: 40, textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: 44, fontWeight: 900, color: C.text,
                        letterSpacing: '-0.04em', lineHeight: 1.05, margin: '0 0 10px',
                    }}>
                        Download anything.
                    </h1>
                    <p style={{ fontSize: 15, color: C.textDim, fontWeight: 500, margin: 0 }}>
                        YouTube, Telegram, Udemy, TikTok — and 1,000+ more sites.
                    </p>
                </div>

                {/* ── Card ── */}
                <div style={{
                    background: C.surface, borderRadius: 18,
                    border: `1px solid ${C.border}`, overflow: 'hidden',
                }}>
                    {/* URL input row */}
                    <div style={{ padding: '14px 14px 0', display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Link2 size={15} style={{ position: 'absolute', left: 13, color: C.textDim, pointerEvents: 'none' }} />
                            <input
                                type="text"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && doFetch()}
                                placeholder="Paste a video URL..."
                                style={{
                                    width: '100%', padding: '12px 14px 12px 36px',
                                    background: C.bg, border: `1px solid ${C.border}`,
                                    borderRadius: 12, fontSize: 14, color: C.text,
                                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                                    transition: 'border-color 0.15s',
                                }}
                                onFocus={e => e.target.style.borderColor = C.greenBorder}
                                onBlur={e => e.target.style.borderColor = C.border}
                            />
                        </div>
                        <button
                            onClick={doFetch}
                            disabled={loading || !url.trim()}
                            style={{
                                flexShrink: 0, padding: '12px 18px', borderRadius: 12, border: 'none',
                                background: !url.trim() || loading ? '#1a1a1a' : C.green,
                                color: !url.trim() || loading ? C.textDim : '#000',
                                fontSize: 13, fontWeight: 800,
                                cursor: !url.trim() || loading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: 5,
                                transition: 'all 0.15s',
                            }}>
                            {loading
                                ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                                : <><span>Fetch</span><ChevronRight size={14} /></>}
                        </button>
                    </div>

                    {/* Main input wrapper padding */}
                    <div style={{ padding: '0 0 14px' }}></div>

                    {/* Divider */}
                    {(error || info) && <div style={{ borderTop: `1px solid ${C.border}`, margin: '0 14px' }} />}

                    {/* Error */}
                    {error && (
                        <div style={{
                            margin: '14px 14px 0',
                            padding: '12px 14px', borderRadius: 12,
                            background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
                            display: 'flex', gap: 10,
                        }}>
                            <AlertCircle size={14} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                            <div>
                                <p style={{ margin: 0, fontSize: 13, color: '#f87171', fontWeight: 600 }}>{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Video info */}
                    {info && (
                        <div style={{ padding: '14px' }}>
                            {/* Preview row */}
                            <div style={{
                                display: 'flex', gap: 12, padding: 12, borderRadius: 12,
                                background: C.bg, border: `1px solid ${C.border}`, marginBottom: 14,
                            }}>
                                <div style={{ flexShrink: 0, width: 96, borderRadius: 8, overflow: 'hidden', background: '#222', position: 'relative' }}>
                                    <img src={info.thumbnail} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                                    {info.duration && (
                                        <span style={{
                                            position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.85)',
                                            borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 700, color: '#fff',
                                        }}>
                                            {dur(info.duration)}
                                        </span>
                                    )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{
                                        margin: '0 0 5px', fontSize: 13, fontWeight: 700, color: '#ddd', lineHeight: 1.4,
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                    }}>
                                        {info.title}
                                    </p>
                                    {info.uploader && (
                                        <p style={{ margin: 0, fontSize: 11, color: C.textDim, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Globe size={10} /> {info.uploader}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Quality buttons */}
                            <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                Select quality
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {info.formats.map((f, i) => {
                                    const active = downloading === f.format_id;
                                    return (
                                        <button key={i} onClick={() => doDownload(f)}
                                            disabled={!!downloading}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                padding: '11px 14px', borderRadius: 12,
                                                border: `1px solid ${active ? C.greenBorder : C.border}`,
                                                background: active ? C.greenDim : C.bg,
                                                cursor: downloading ? 'not-allowed' : 'pointer',
                                                opacity: downloading && !active ? 0.35 : 1,
                                                transition: 'all 0.15s', width: '100%', textAlign: 'left',
                                            }}
                                            onMouseEnter={e => { if (!downloading) e.currentTarget.style.borderColor = C.greenBorder; }}
                                            onMouseLeave={e => { if (!active && !downloading) e.currentTarget.style.borderColor = C.border; }}
                                        >
                                            <div style={{
                                                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                                background: active ? C.greenDim : 'rgba(255,255,255,0.04)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: active ? C.green : C.textDim,
                                            }}>
                                                {active
                                                    ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                                    : f.type === 'audio' ? <Music size={13} /> : <Video size={13} />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: active ? C.green : '#d0d0d0' }}>{f.label}</p>
                                                    {f.note && <span style={{ fontSize: 9, color: C.textDim, background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', fontWeight: 700 }}>{f.note}</span>}
                                                </div>
                                                <p style={{ margin: 0, fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>.{f.ext}</p>
                                            </div>
                                            <Download size={13} style={{ color: C.textDim, flexShrink: 0 }} />
                                        </button>
                                    );
                                })}
                            </div>
                            <p style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: C.textDim, fontWeight: 600 }}>
                                Your browser downloads the file directly.
                            </p>
                        </div>
                    )}
                </div>

                {/* Supported sites */}
                <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 7 }}>
                    {['YouTube', 'Telegram', 'Instagram', 'TikTok', 'Udemy', 'Twitter/X', 'Vimeo', '+ 1000 more'].map(s => (
                        <span key={s} style={{
                            padding: '5px 12px', borderRadius: 20,
                            border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)',
                            fontSize: 11, fontWeight: 600, color: C.textDim,
                        }}>{s}</span>
                    ))}
                </div>
            </main>

            {/* Footer */}
            <footer style={{ textAlign: 'center', padding: '20px 0', borderTop: `1px solid ${C.border}` }}>
                <p style={{ margin: 0, fontSize: 11, color: '#2a2a2a', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    WALOO; &nbsp;·&nbsp; Made by SPC &nbsp;·&nbsp; @spc.gpt
                </p>
            </footer>

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
        input::placeholder { color: #2a2a2a; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }
      `}</style>
        </div>
    );
}
