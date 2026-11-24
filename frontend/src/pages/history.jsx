import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import withAuth from '../utils/withAuth';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HistoryIcon from '@mui/icons-material/History';
import { IconButton, Tooltip, Snackbar, Alert } from '@mui/material';

function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState('');
    const [copied, setCopied]     = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;
        const fetch = async () => {
            try {
                const history = await getHistoryOfUser();
                if (!cancelled) setMeetings(Array.isArray(history) ? history : []);
            } catch {
                if (!cancelled) setError('Failed to load history. Please try again.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetch();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatTime = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleCopy = (code) => {
        navigator.clipboard.writeText(`${window.location.origin}/${code}`);
        setCopied(true);
    };

    return (
        <div style={s.root}>
            {/* ── Header ── */}
            <div style={s.header}>
                <Tooltip title="Back to Home">
                    <IconButton onClick={() => navigate('/home')} sx={{ color: '#8b949e' }}>
                        <ArrowBackIcon />
                    </IconButton>
                </Tooltip>
                <div style={s.headerTitle}>
                    <HistoryIcon sx={{ color: '#58a6ff' }} />
                    <h2 style={s.title}>Meeting History</h2>
                </div>
            </div>

            {/* ── Content ── */}
            <div style={s.content}>
                {loading && (
                    <div style={s.center}>
                        <div style={s.spinner} />
                        <p style={{ color: '#8b949e', marginTop: 12 }}>Loading history…</p>
                    </div>
                )}

                {!loading && error && (
                    <div style={s.errorBox}>⚠ {error}</div>
                )}

                {!loading && !error && meetings.length === 0 && (
                    <div style={s.empty}>
                        <VideoCallIcon sx={{ fontSize: 64, color: '#30363d' }} />
                        <h3 style={{ color: '#e6edf3', margin: '12px 0 4px' }}>No meetings yet</h3>
                        <p style={{ color: '#8b949e', margin: 0 }}>
                            Your past meetings will appear here.
                        </p>
                        <button style={s.emptyBtn} onClick={() => navigate('/home')}>
                            Start a Meeting
                        </button>
                    </div>
                )}

                {!loading && meetings.map((m) => (
                    <div key={m._id || m.meetingCode + m.date} style={s.card}>
                        <div style={s.cardLeft}>
                            <VideoCallIcon sx={{ color: '#58a6ff', fontSize: 28, flexShrink: 0 }} />
                            <div>
                                <div style={s.cardCode}>{m.meetingCode}</div>
                                <div style={s.cardDate}>
                                    {formatDate(m.date)} · {formatTime(m.date)}
                                </div>
                            </div>
                        </div>
                        <div style={s.cardActions}>
                            <Tooltip title="Copy meeting link">
                                <IconButton
                                    size="small"
                                    onClick={() => handleCopy(m.meetingCode)}
                                    sx={{ color: '#8b949e', '&:hover': { color: '#58a6ff' } }}
                                >
                                    <ContentCopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Rejoin meeting">
                                <IconButton
                                    size="small"
                                    onClick={() => navigate(`/${m.meetingCode}`)}
                                    sx={{ color: '#8b949e', '&:hover': { color: '#58a6ff' } }}
                                >
                                    <OpenInNewIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </div>
                    </div>
                ))}
            </div>

            <Snackbar open={copied} autoHideDuration={2000} onClose={() => setCopied(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity="success" onClose={() => setCopied(false)}>Link copied!</Alert>
            </Snackbar>
        </div>
    );
}

const s = {
    root: {
        minHeight: '100vh',
        background: '#0d1117',
        color: '#e6edf3',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '16px 24px',
        borderBottom: '1px solid #21262d',
        background: '#161b22',
        position: 'sticky',
        top: 0,
        zIndex: 10,
    },
    headerTitle: { display: 'flex', alignItems: 'center', gap: 8 },
    title: { margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#e6edf3' },
    content: { maxWidth: 680, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 12 },
    center: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0' },
    spinner: {
        width: 36, height: 36, border: '3px solid #21262d',
        borderTop: '3px solid #58a6ff', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    errorBox: {
        background: '#3b1515', border: '1px solid #f85149', borderRadius: 8,
        color: '#f85149', padding: '12px 16px', fontSize: '0.9rem',
    },
    empty: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', padding: '60px 0',
    },
    emptyBtn: {
        marginTop: 20,
        background: 'linear-gradient(135deg, #1976d2, #58a6ff)',
        border: 'none', color: '#fff', fontWeight: 600, fontSize: '0.95rem',
        cursor: 'pointer', padding: '10px 24px', borderRadius: 8,
    },
    card: {
        background: '#161b22', border: '1px solid #21262d', borderRadius: 10,
        padding: '14px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 12,
        transition: 'border-color 0.2s',
    },
    cardLeft: { display: 'flex', alignItems: 'center', gap: 12 },
    cardCode: { fontWeight: 600, fontSize: '0.95rem', color: '#e6edf3', fontFamily: 'monospace' },
    cardDate: { fontSize: '0.78rem', color: '#8b949e', marginTop: 2 },
    cardActions: { display: 'flex', gap: 4 },
};

// Inject spinner keyframes once
if (typeof document !== 'undefined' && !document.getElementById('spin-kf')) {
    const style = document.createElement('style');
    style.id = 'spin-kf';
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
}

export default withAuth(History);
