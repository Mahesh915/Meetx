import React, { useContext, useState } from 'react';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import { Button, IconButton, TextField, Snackbar, Alert, Tooltip } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LogoutIcon from '@mui/icons-material/Logout';
import { AuthContext } from '../contexts/AuthContext';

// Generate a random meeting code like "abc-defg-hij"
const generateCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${seg(3)}-${seg(4)}-${seg(3)}`;
};

function HomeComponent() {
    const navigate = useNavigate();
    const { addToUserHistory } = useContext(AuthContext);

    const [meetingCode, setMeetingCode] = useState('');
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState('');
    const [copied, setCopied]           = useState(false);

    const handleJoin = async () => {
        const code = meetingCode.trim();
        if (!code) {
            setError('Please enter a meeting code.');
            return;
        }
        setLoading(true);
        try {
            await addToUserHistory(code);
        } catch {
            // History save failure is non-critical — still let them join
        }
        navigate(`/${code}`);
    };

    const handleNewMeeting = async () => {
        const code = generateCode();
        setLoading(true);
        try {
            await addToUserHistory(code);
        } catch { /* non-critical */ }
        navigate(`/${code}`);
    };

    const handleCopy = () => {
        if (!meetingCode.trim()) return;
        navigator.clipboard.writeText(`${window.location.origin}/${meetingCode.trim()}`);
        setCopied(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/auth');
    };

    return (
        <div className="homeRoot">
            {/* ── Nav ── */}
            <nav className="homeNav">
                <div className="homeNavBrand">
                    <VideoCallIcon sx={{ fontSize: 28, color: '#58a6ff' }} />
                    <span>MeetX</span>
                </div>
                <div className="homeNavActions">
                    <Tooltip title="Meeting History">
                        <IconButton onClick={() => navigate('/history')} sx={{ color: '#8b949e' }}>
                            <RestoreIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Logout">
                        <IconButton onClick={handleLogout} sx={{ color: '#8b949e' }}>
                            <LogoutIcon />
                        </IconButton>
                    </Tooltip>
                </div>
            </nav>

            {/* ── Main ── */}
            <main className="homeMain">
                <div className="homeLeft">
                    <h1 className="homeHeadline">
                        Video calls made<br />
                        <span className="homeAccent">simple & reliable</span>
                    </h1>
                    <p className="homeSubtitle">
                        Connect with anyone, anywhere. No downloads needed.
                    </p>

                    {/* Join existing */}
                    <div className="homeJoinRow">
                        <TextField
                            placeholder="Enter meeting code"
                            variant="outlined"
                            size="small"
                            value={meetingCode}
                            onChange={e => setMeetingCode(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleJoin()}
                            inputProps={{ maxLength: 50 }}
                            sx={{
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                    color: '#e6edf3',
                                    background: '#161b22',
                                    '& fieldset': { borderColor: '#30363d' },
                                    '&:hover fieldset': { borderColor: '#58a6ff' },
                                    '&.Mui-focused fieldset': { borderColor: '#58a6ff' },
                                },
                                '& input::placeholder': { color: '#8b949e' },
                            }}
                        />
                        {meetingCode.trim() && (
                            <Tooltip title="Copy meeting link">
                                <IconButton onClick={handleCopy} sx={{ color: '#8b949e' }}>
                                    <ContentCopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Button
                            variant="outlined"
                            onClick={handleJoin}
                            disabled={loading || !meetingCode.trim()}
                            sx={{
                                borderColor: '#58a6ff',
                                color: '#58a6ff',
                                '&:hover': { borderColor: '#79b8ff', background: 'rgba(88,166,255,0.08)' },
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Join
                        </Button>
                    </div>

                    <div className="homeDivider">
                        <span>or</span>
                    </div>

                    {/* New meeting */}
                    <Button
                        variant="contained"
                        startIcon={<VideoCallIcon />}
                        onClick={handleNewMeeting}
                        disabled={loading}
                        fullWidth
                        sx={{
                            background: 'linear-gradient(135deg, #1976d2, #58a6ff)',
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: 600,
                            '&:hover': { background: 'linear-gradient(135deg, #1565c0, #4a9fd4)' },
                        }}
                    >
                        {loading ? 'Starting…' : 'Start New Meeting'}
                    </Button>
                </div>

                <div className="homeRight">
                    <img src="/logo3.png" alt="MeetX video call illustration" />
                </div>
            </main>

            {/* Snackbars */}
            <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
            </Snackbar>
            <Snackbar open={copied} autoHideDuration={2000} onClose={() => setCopied(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity="success" onClose={() => setCopied(false)}>Link copied!</Alert>
            </Snackbar>
        </div>
    );
}

export default withAuth(HomeComponent);
