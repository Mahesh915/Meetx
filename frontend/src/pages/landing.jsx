import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import GroupsIcon from '@mui/icons-material/Groups';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';

export default function LandingPage() {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' && window.innerWidth <= 640
    );

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth <= 640);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    const features = [
        { icon: <VideoCallIcon sx={{ fontSize: 36, color: '#58a6ff' }} />, title: 'HD Video & Audio', desc: 'Crystal clear video calls with noise suppression.' },
        { icon: <SecurityIcon sx={{ fontSize: 36, color: '#58a6ff' }} />, title: 'Secure & Private', desc: 'End-to-end encrypted peer-to-peer connections.' },
        { icon: <SpeedIcon sx={{ fontSize: 36, color: '#58a6ff' }} />, title: 'No Downloads', desc: 'Works directly in your browser. Instant access.' },
        { icon: <GroupsIcon sx={{ fontSize: 36, color: '#58a6ff' }} />, title: 'Group Meetings', desc: 'Host meetings with multiple participants easily.' },
        { icon: <ChatBubbleIcon sx={{ fontSize: 36, color: '#58a6ff' }} />, title: 'Live Chat', desc: 'Send messages during your meeting in real time.' },
        { icon: <VideoCallIcon sx={{ fontSize: 36, color: '#58a6ff' }} />, title: 'Screen Sharing', desc: 'Share your screen with one click.' },
    ];

    return (
        <div style={styles.root}>
            {/* ── Navbar ── */}
            <nav style={styles.nav}>
                <div style={styles.navBrand}>
                    <VideoCallIcon sx={{ fontSize: 28, color: '#58a6ff' }} />
                    <span style={styles.navBrandText}>MeetX</span>
                </div>

                {/* Desktop nav links */}
                {!isMobile && (
                    <div style={styles.navLinks}>
                        <button style={styles.navLink} onClick={() => navigate('/auth')}>Sign In</button>
                        <button style={styles.navBtn} onClick={() => navigate('/auth')}>Get Started</button>
                    </div>
                )}

                {/* Mobile hamburger */}
                {isMobile && (
                    <button style={styles.hamburger} onClick={() => setMenuOpen(o => !o)}>
                        {menuOpen ? <CloseIcon sx={{ color: '#e6edf3' }} /> : <MenuIcon sx={{ color: '#e6edf3' }} />}
                    </button>
                )}
            </nav>

            {/* Mobile menu */}
            {menuOpen && (
                <div style={styles.mobileMenu}>
                    <button style={styles.mobileMenuLink} onClick={() => navigate('/auth')}>Sign In</button>
                    <button style={styles.mobileMenuBtn} onClick={() => navigate('/auth')}>Get Started Free</button>
                </div>
            )}

            {/* ── Hero ── */}
            <section style={styles.hero}>
                <div style={styles.heroBadge}>✦ Free to use, no downloads required</div>
                <h1 style={styles.heroTitle}>
                    Video meetings for<br />
                    <span style={styles.heroAccent}>everyone</span>
                </h1>
                <p style={styles.heroSubtitle}>
                    Connect face-to-face with crystal-clear video and audio.<br />
                    No sign-up needed to join as a guest.
                </p>
                <div style={styles.heroActions}>
                    <button style={styles.heroBtnPrimary} onClick={() => navigate('/auth')}>
                        Start a Meeting
                    </button>
                    <button style={styles.heroBtnSecondary} onClick={() => navigate('/aljk23')}>
                        Join as Guest
                    </button>
                </div>
            </section>

            {/* ── Features ── */}
            <section style={styles.features}>
                <h2 style={styles.featuresTitle}>Everything you need for great meetings</h2>
                <div style={styles.featuresGrid}>
                    {features.map(f => (
                        <div key={f.title} style={styles.featureCard}>
                            {f.icon}
                            <h3 style={styles.featureCardTitle}>{f.title}</h3>
                            <p style={styles.featureCardDesc}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ── */}
            <section style={styles.cta}>
                <h2 style={styles.ctaTitle}>Ready to get started?</h2>
                <p style={styles.ctaSubtitle}>Join thousands of people already using MeetX</p>
                <button style={styles.heroBtnPrimary} onClick={() => navigate('/auth')}>
                    Create Free Account
                </button>
            </section>

            {/* ── Footer ── */}
            <footer style={styles.footer}>
                <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>
                    © 2024 MeetX · Built with ❤️
                </span>
            </footer>
        </div>
    );
}

const styles = {
    root: {
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
        color: '#e6edf3',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    nav: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        borderBottom: '1px solid #21262d',
        position: 'sticky',
        top: 0,
        background: 'rgba(13,17,23,0.95)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
    },
    navBrand: { display: 'flex', alignItems: 'center', gap: 8 },
    navBrandText: { fontSize: '1.3rem', fontWeight: 700, color: '#e6edf3' },
    navLinks: { display: 'flex', alignItems: 'center', gap: 16 },
    navLink: {
        background: 'none', border: 'none', color: '#8b949e', fontSize: '0.95rem',
        cursor: 'pointer', padding: '8px 12px', borderRadius: 6,
        transition: 'color 0.2s',
    },
    navBtn: {
        background: 'linear-gradient(135deg, #1976d2, #58a6ff)',
        border: 'none', color: '#fff', fontSize: '0.95rem', fontWeight: 600,
        cursor: 'pointer', padding: '8px 20px', borderRadius: 8,
        transition: 'opacity 0.2s',
    },
    hamburger: {
        display: 'flex',
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 4, alignItems: 'center',
    },
    mobileMenu: {
        display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 24px',
        background: '#161b22', borderBottom: '1px solid #21262d',
    },
    mobileMenuLink: {
        background: 'none', border: '1px solid #30363d', color: '#e6edf3',
        fontSize: '1rem', cursor: 'pointer', padding: '10px 16px', borderRadius: 8,
        textAlign: 'left',
    },
    mobileMenuBtn: {
        background: 'linear-gradient(135deg, #1976d2, #58a6ff)',
        border: 'none', color: '#fff', fontSize: '1rem', fontWeight: 600,
        cursor: 'pointer', padding: '10px 16px', borderRadius: 8, textAlign: 'left',
    },
    hero: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', padding: '80px 24px 60px',
        gap: 20,
    },
    heroBadge: {
        background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.3)',
        color: '#58a6ff', padding: '6px 16px', borderRadius: 20, fontSize: '0.85rem',
    },
    heroTitle: {
        fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 800,
        lineHeight: 1.15, margin: 0, color: '#e6edf3',
    },
    heroAccent: {
        background: 'linear-gradient(135deg, #58a6ff, #1976d2)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    },
    heroSubtitle: {
        fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: '#8b949e',
        lineHeight: 1.6, margin: 0, maxWidth: 500,
    },
    heroActions: { display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 },
    heroBtnPrimary: {
        background: 'linear-gradient(135deg, #1976d2, #58a6ff)',
        border: 'none', color: '#fff', fontSize: '1.05rem', fontWeight: 600,
        cursor: 'pointer', padding: '14px 32px', borderRadius: 10,
        transition: 'transform 0.15s, opacity 0.15s',
    },
    heroBtnSecondary: {
        background: 'transparent', border: '1px solid #30363d', color: '#e6edf3',
        fontSize: '1.05rem', fontWeight: 500, cursor: 'pointer',
        padding: '14px 32px', borderRadius: 10,
        transition: 'border-color 0.2s, background 0.2s',
    },
    features: { padding: '60px 24px', maxWidth: 1100, margin: '0 auto' },
    featuresTitle: {
        textAlign: 'center', fontSize: 'clamp(1.4rem, 3vw, 2rem)',
        fontWeight: 700, color: '#e6edf3', marginBottom: 40,
    },
    featuresGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
    },
    featureCard: {
        background: '#161b22', border: '1px solid #21262d', borderRadius: 12,
        padding: '24px', display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'border-color 0.2s, transform 0.2s',
    },
    featureCardTitle: { color: '#e6edf3', fontSize: '1.05rem', fontWeight: 600, margin: 0 },
    featureCardDesc: { color: '#8b949e', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 },
    cta: {
        textAlign: 'center', padding: '60px 24px',
        background: 'linear-gradient(135deg, rgba(25,118,210,0.08), rgba(88,166,255,0.08))',
        margin: '0 24px 40px', borderRadius: 16, border: '1px solid rgba(88,166,255,0.15)',
        maxWidth: 700, marginLeft: 'auto', marginRight: 'auto',
    },
    ctaTitle: { fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, color: '#e6edf3', margin: '0 0 12px' },
    ctaSubtitle: { color: '#8b949e', fontSize: '1rem', margin: '0 0 24px' },
    footer: {
        textAlign: 'center', padding: '24px',
        borderTop: '1px solid #21262d',
    },
};
