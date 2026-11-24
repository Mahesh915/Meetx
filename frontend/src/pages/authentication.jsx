import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar, Alert, CircularProgress } from '@mui/material';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#58a6ff' },
        background: { default: '#0d1117', paper: '#161b22' },
    },
});

export default function Authentication() {
    const [username, setUsername]     = React.useState('');
    const [password, setPassword]     = React.useState('');
    const [name, setName]             = React.useState('');
    const [error, setError]           = React.useState('');
    const [successMsg, setSuccessMsg] = React.useState('');
    const [formState, setFormState]   = React.useState(0); // 0 = sign in, 1 = sign up
    const [loading, setLoading]       = React.useState(false);
    const [open, setOpen]             = React.useState(false);

    const { handleRegister, handleLogin } = React.useContext(AuthContext);

    const handleAuth = async () => {
        if (loading) return;
        setError('');

        // Basic client-side validation
        if (!username.trim() || !password) {
            setError('Username and password are required.');
            return;
        }
        if (formState === 1 && !name.trim()) {
            setError('Full name is required.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            if (formState === 0) {
                await handleLogin(username.trim(), password);
                // handleLogin redirects on success, so we only reach here on error
            } else {
                const result = await handleRegister(name.trim(), username.trim(), password);
                setSuccessMsg(result || 'Account created! Please sign in.');
                setOpen(true);
                setName('');
                setUsername('');
                setPassword('');
                setFormState(0);
            }
        } catch (err) {
            const msg = err?.response?.data?.message || 'Something went wrong. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleAuth();
    };

    const switchForm = (state) => {
        setFormState(state);
        setError('');
        setName('');
        setUsername('');
        setPassword('');
    };

    return (
        <ThemeProvider theme={darkTheme}>
            <Box sx={{
                minHeight: '100vh',
                display: 'flex',
                background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
            }}>
                {/* Left panel — branding (hidden on mobile) */}
                <Box sx={{
                    display: { xs: 'none', md: 'flex' },
                    flex: 1,
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #1976d2 100%)',
                    padding: 6,
                    gap: 3,
                }}>
                    <VideoCallIcon sx={{ fontSize: 80, color: 'white', opacity: 0.9 }} />
                    <Box sx={{ textAlign: 'center' }}>
                        <h1 style={{ color: 'white', fontSize: '2.5rem', margin: 0, fontWeight: 700 }}>
                            MeetX
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', marginTop: 8 }}>
                            Professional video conferencing<br />for everyone
                        </p>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        {['HD Video & Audio', 'Screen Sharing', 'Real-time Chat', 'No downloads needed'].map(f => (
                            <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}>{f}</span>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Right panel — form */}
                <Box sx={{
                    flex: { xs: 1, md: '0 0 480px' },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: { xs: 3, sm: 6 },
                    background: '#161b22',
                }}>
                    {/* Mobile logo */}
                    <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, mb: 4 }}>
                        <VideoCallIcon sx={{ fontSize: 36, color: '#58a6ff' }} />
                        <span style={{ color: '#e6edf3', fontSize: '1.5rem', fontWeight: 700 }}>MeetX</span>
                    </Box>

                    <Avatar sx={{ mb: 2, bgcolor: '#1976d2', width: 52, height: 52 }}>
                        <LockOutlinedIcon />
                    </Avatar>

                    <h2 style={{ color: '#e6edf3', margin: '0 0 24px', fontSize: '1.5rem', fontWeight: 600 }}>
                        {formState === 0 ? 'Welcome back' : 'Create account'}
                    </h2>

                    {/* Toggle tabs */}
                    <Box sx={{
                        display: 'flex',
                        background: '#0d1117',
                        borderRadius: '8px',
                        padding: '4px',
                        mb: 3,
                        width: '100%',
                        maxWidth: 360,
                    }}>
                        {['Sign In', 'Sign Up'].map((label, i) => (
                            <Button
                                key={label}
                                fullWidth
                                onClick={() => switchForm(i)}
                                sx={{
                                    borderRadius: '6px',
                                    background: formState === i ? '#1976d2' : 'transparent',
                                    color: formState === i ? '#fff' : '#8b949e',
                                    fontWeight: formState === i ? 600 : 400,
                                    transition: 'all 0.2s',
                                    '&:hover': { background: formState === i ? '#1565c0' : '#21262d' },
                                }}
                            >
                                {label}
                            </Button>
                        ))}
                    </Box>

                    {/* Form fields */}
                    <Box sx={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {formState === 1 && (
                            <TextField
                                label="Full Name"
                                fullWidth
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus={formState === 1}
                                inputProps={{ maxLength: 100 }}
                                sx={fieldSx}
                            />
                        )}
                        <TextField
                            label="Username"
                            fullWidth
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus={formState === 0}
                            autoComplete="username"
                            inputProps={{ maxLength: 30 }}
                            sx={fieldSx}
                        />
                        <TextField
                            label="Password"
                            type="password"
                            fullWidth
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoComplete={formState === 0 ? 'current-password' : 'new-password'}
                            inputProps={{ maxLength: 100 }}
                            sx={fieldSx}
                        />

                        {error && (
                            <Alert severity="error" sx={{ borderRadius: '8px' }}>
                                {error}
                            </Alert>
                        )}

                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleAuth}
                            disabled={loading}
                            sx={{
                                mt: 1,
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: 600,
                                background: loading ? '#21262d' : 'linear-gradient(135deg, #1976d2, #58a6ff)',
                                '&:hover': { background: 'linear-gradient(135deg, #1565c0, #4a9fd4)' },
                                '&:disabled': { color: '#8b949e' },
                            }}
                        >
                            {loading
                                ? <CircularProgress size={22} sx={{ color: '#58a6ff' }} />
                                : (formState === 0 ? 'Sign In' : 'Create Account')
                            }
                        </Button>
                    </Box>
                </Box>
            </Box>

            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="success" onClose={() => setOpen(false)}>
                    {successMsg}
                </Alert>
            </Snackbar>
        </ThemeProvider>
    );
}

// Shared MUI TextField dark styling
const fieldSx = {
    '& .MuiOutlinedInput-root': {
        color: '#e6edf3',
        '& fieldset': { borderColor: '#30363d' },
        '&:hover fieldset': { borderColor: '#58a6ff' },
        '&.Mui-focused fieldset': { borderColor: '#58a6ff' },
    },
    '& .MuiInputLabel-root': { color: '#8b949e' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#58a6ff' },
};
