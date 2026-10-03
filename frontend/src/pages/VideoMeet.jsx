import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import io from 'socket.io-client';
import { Badge, IconButton, TextField, Tooltip } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import styles from '../styles/videoComponent.module.css';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import PeopleIcon from '@mui/icons-material/People';
import SendIcon from '@mui/icons-material/Send';
import server from '../environment';

// ─── ICE configuration ───────────────────────────────────────────────────────
// STUN servers are pulled from env vars so you can add TURN without changing code.
// REACT_APP_STUN_URL defaults to Google's public STUN server.
// To add TURN: set REACT_APP_TURN_URL, REACT_APP_TURN_USERNAME, REACT_APP_TURN_CREDENTIAL.
const buildIceConfig = () => {
    const iceServers = [
        { urls: process.env.REACT_APP_STUN_URL || 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ];
    const turnUrl = process.env.REACT_APP_TURN_URL;
    if (turnUrl) {
        iceServers.push({
            urls: turnUrl,
            username: process.env.REACT_APP_TURN_USERNAME || '',
            credential: process.env.REACT_APP_TURN_CREDENTIAL || '',
        });
    }
    return { iceServers };
};

const peerConfigConnections = buildIceConfig();

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Create a silent audio track (used when user has no mic or denies permission)
function createSilentAudioTrack() {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    const track = dst.stream.getAudioTracks()[0];
    track.enabled = false;
    return track;
}

// Create a black video track (used when user has no camera or denies permission)
function createBlackVideoTrack({ width = 640, height = 480 } = {}) {
    const canvas = Object.assign(document.createElement('canvas'), { width, height });
    canvas.getContext('2d').fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    const track = stream.getVideoTracks()[0];
    track.enabled = false;
    return track;
}

// Format a Date as HH:MM
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function VideoMeetComponent() {
    // ── Socket / signalling refs ─────────────────────────────────────────────
    const socketRef    = useRef(null);
    const socketIdRef  = useRef('');

    // ── Media refs ───────────────────────────────────────────────────────────
    // localStreamRef holds the ONE authoritative local MediaStream.
    // We keep it in a ref so WebRTC callbacks always see the latest value
    // without needing to be recreated when state changes.
    const localStreamRef  = useRef(null);
    const localVideoRef   = useRef(null);  // <video> element for self-preview

    // ── Peer connection map: { socketId → RTCPeerConnection } ────────────────
    // Stored in a ref (not module-level var) so it is per-component-instance
    // and gets cleaned up when the component unmounts.
    const connectionsRef = useRef({});

    // ICE candidate queue: candidates that arrive before remote description
    // is set are buffered here and applied once setRemoteDescription resolves.
    const pendingCandidatesRef = useRef({}); // { socketId → RTCIceCandidateInit[] }

    // ── State ─────────────────────────────────────────────────────────────────
    const [videoAvailable, setVideoAvailable] = useState(false);
    const [audioAvailable, setAudioAvailable] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);

    // video / audio are the *desired* enabled state of the local tracks.
    const [video, setVideo]    = useState(false);
    const [audio, setAudio]    = useState(false);
    const [screen, setScreen]  = useState(false);

    // UI state
    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername]             = useState('');
    const [permissionError, setPermissionError] = useState('');

    // Remote participants: [{ socketId, stream, username }]
    const [videos, setVideos]          = useState([]);
    const videosRef                    = useRef([]);   // mirror for use inside callbacks

    // Chat
    const [messages, setMessages]      = useState([]);
    const [message, setMessage]        = useState('');
    const [newMessages, setNewMessages] = useState(0);
    const [showChat, setShowChat]      = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const chatEndRef                   = useRef(null);

    // ── Permission check & media acquisition (runs once on mount) ────────────
    useEffect(() => {
        initMedia();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const initMedia = async () => {
        // 1. Probe available devices without requesting permission yet
        let hasVideo = false;
        let hasAudio = false;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            hasVideo = devices.some(d => d.kind === 'videoinput');
            hasAudio = devices.some(d => d.kind === 'audioinput');
        } catch {
            // enumerateDevices is not available — assume both
            hasVideo = true;
            hasAudio = true;
        }

        // 2. Request permission for what's available
        let stream = null;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: hasVideo,
                audio: hasAudio,
            });
        } catch (err) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionError(
                    'Camera/microphone access was denied. ' +
                    'You can still join the call but others will not see or hear you.'
                );
            } else if (err.name === 'NotFoundError') {
                setPermissionError('No camera or microphone found on this device.');
            } else {
                setPermissionError(`Media error: ${err.message}`);
            }
        }

        // 3. If we got a stream, wire it up
        if (stream) {
            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            const gotVideo = stream.getVideoTracks().length > 0;
            const gotAudio = stream.getAudioTracks().length > 0;
            setVideoAvailable(gotVideo);
            setAudioAvailable(gotAudio);
            setVideo(gotVideo);
            setAudio(gotAudio);
            // Check screen share support
            setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
        } else {
            // Build a silent/black placeholder stream so we can still
            // create peer connections and receive remote streams.
            const placeholderStream = new MediaStream([
                createBlackVideoTrack(),
                createSilentAudioTrack(),
            ]);
            localStreamRef.current = placeholderStream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = placeholderStream;
            }
            setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
        }
    };

    // ── Camera toggle: enable/disable the existing video track ───────────────
    // No new getUserMedia call needed — we just flip track.enabled.
    const handleVideo = useCallback(() => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length === 0) return;
        const newState = !video;
        videoTracks.forEach(t => { t.enabled = newState; });
        setVideo(newState);
    }, [video]);

    // ── Microphone toggle ─────────────────────────────────────────────────────
    const handleAudio = useCallback(() => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) return;
        const newState = !audio;
        audioTracks.forEach(t => { t.enabled = newState; });
        setAudio(newState);
    }, [audio]);

    // ── Screen share ─────────────────────────────────────────────────────────
    // Uses RTCRtpSender.replaceTrack() so we don't need to renegotiate.
    const handleScreen = useCallback(async () => {
        if (!screen) {
            // Start sharing
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false,
                });
                const screenTrack = screenStream.getVideoTracks()[0];

                // Replace the video track in every existing peer connection
                const connections = connectionsRef.current;
                for (const id in connections) {
                    const sender = connections[id]
                        .getSenders()
                        .find(s => s.track && s.track.kind === 'video');
                    if (sender) {
                        await sender.replaceTrack(screenTrack);
                    }
                }

                // Also update the local preview
                if (localVideoRef.current) {
                    const localStream = localStreamRef.current;
                    // Replace video track in the local stream for preview
                    const oldVideoTracks = localStream.getVideoTracks();
                    oldVideoTracks.forEach(t => localStream.removeTrack(t));
                    localStream.addTrack(screenTrack);
                    localVideoRef.current.srcObject = localStream;
                }

                // When the user stops screen share from browser UI
                screenTrack.onended = () => {
                    setScreen(false);
                    restoreCameraTrack();
                };

                setScreen(true);
            } catch (err) {
                if (err.name !== 'NotAllowedError') {
                    console.error('Screen share error:', err);
                }
            }
        } else {
            // Stop sharing
            setScreen(false);
            restoreCameraTrack();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [screen]);

    // Restore the camera track after screen share ends
    const restoreCameraTrack = useCallback(async () => {
        let cameraTrack = null;
        if (videoAvailable) {
            try {
                const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                cameraTrack = cameraStream.getVideoTracks()[0];
            } catch {
                cameraTrack = createBlackVideoTrack();
            }
        } else {
            cameraTrack = createBlackVideoTrack();
        }

        cameraTrack.enabled = video; // Respect current camera-off state

        const connections = connectionsRef.current;
        for (const id in connections) {
            const sender = connections[id]
                .getSenders()
                .find(s => s.track && s.track.kind === 'video');
            if (sender) {
                await sender.replaceTrack(cameraTrack);
            }
        }

        // Update local stream
        const localStream = localStreamRef.current;
        if (localStream) {
            localStream.getVideoTracks().forEach(t => { t.stop(); localStream.removeTrack(t); });
            localStream.addTrack(cameraTrack);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStream;
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [video, videoAvailable]);

    // ── Leave call ────────────────────────────────────────────────────────────
    const handleEndCall = useCallback(() => {
        cleanup();
        window.location.href = '/';
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Full cleanup — called on leave and on unmount
    const cleanup = useCallback(() => {
        // Stop all local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }

        // Close all peer connections
        const connections = connectionsRef.current;
        for (const id in connections) {
            try {
                connections[id].close();
            } catch { /* ignore */ }
        }
        connectionsRef.current = {};
        pendingCandidatesRef.current = {};

        // Disconnect socket
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        setVideos([]);
        videosRef.current = [];
    }, []);

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    // ── WebRTC: create a peer connection for a given socket ID ────────────────
    const createPeerConnection = useCallback((socketListId) => {
        const connections = connectionsRef.current;

        // Prevent duplicate connections
        if (connections[socketListId]) {
            return connections[socketListId];
        }

        const pc = new RTCPeerConnection(peerConfigConnections);
        connections[socketListId] = pc;
        pendingCandidatesRef.current[socketListId] = [];

        // ICE candidates → relay via socket
        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit(
                    'signal',
                    socketListId,
                    JSON.stringify({ ice: event.candidate })
                );
            }
        };

        // Connection state monitoring
        pc.onconnectionstatechange = () => {
            console.log(`[WebRTC] ${socketListId} → ${pc.connectionState}`);
            if (pc.connectionState === 'failed') {
                console.warn(`[WebRTC] Connection to ${socketListId} failed. Attempting ICE restart.`);
                // ICE restart: create a new offer with iceRestart flag
                pc.createOffer({ iceRestart: true })
                    .then(offer => pc.setLocalDescription(offer))
                    .then(() => {
                        if (socketRef.current) {
                            socketRef.current.emit(
                                'signal',
                                socketListId,
                                JSON.stringify({ sdp: pc.localDescription })
                            );
                        }
                    })
                    .catch(e => console.error('[WebRTC] ICE restart failed:', e));
            }
            if (pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
                // Remove the video tile if the peer disconnects ungracefully
                removeVideoTile(socketListId);
            }
        };

        // Modern ontrack — fires for each track the remote peer adds
        pc.ontrack = (event) => {
            const remoteStream = event.streams[0];
            if (!remoteStream) return;

            const socketListIdCaptured = socketListId;

            setVideos(prev => {
                const exists = prev.find(v => v.socketId === socketListIdCaptured);
                let updated;
                if (exists) {
                    updated = prev.map(v =>
                        v.socketId === socketListIdCaptured
                            ? { ...v, stream: remoteStream }
                            : v
                    );
                } else {
                    updated = [...prev, {
                        socketId: socketListIdCaptured,
                        stream: remoteStream,
                    }];
                }
                videosRef.current = updated;
                return updated;
            });
        };

        // Add local tracks to this connection using addTrack (modern API)
        const localStream = localStreamRef.current;
        if (localStream) {
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });
        }

        return pc;
    // removeVideoTile is defined after createPeerConnection; both are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const removeVideoTile = useCallback((socketId) => {
        setVideos(prev => {
            const updated = prev.filter(v => v.socketId !== socketId);
            videosRef.current = updated;
            return updated;
        });
        // Close and remove peer connection
        const connections = connectionsRef.current;
        if (connections[socketId]) {
            try { connections[socketId].close(); } catch { /* ignore */ }
            delete connections[socketId];
        }
        delete pendingCandidatesRef.current[socketId];
    // setVideos and connectionsRef are stable; no real deps needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Signalling: handle incoming signal from server ────────────────────────
    const gotMessageFromServer = useCallback(async (fromId, message) => {
        let signal;
        try {
            signal = JSON.parse(message);
        } catch {
            console.error('[Signal] Failed to parse signal:', message);
            return;
        }

        if (fromId === socketIdRef.current) return;

        const connections = connectionsRef.current;
        const pc = connections[fromId];
        if (!pc) {
            console.warn('[Signal] Received signal for unknown peer:', fromId);
            return;
        }

        if (signal.sdp) {
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

                // Flush any buffered ICE candidates
                const pending = pendingCandidatesRef.current[fromId] || [];
                for (const candidate of pending) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e =>
                        console.warn('[ICE] Failed to add buffered candidate:', e)
                    );
                }
                pendingCandidatesRef.current[fromId] = [];

                if (signal.sdp.type === 'offer') {
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    if (socketRef.current) {
                        socketRef.current.emit(
                            'signal',
                            fromId,
                            JSON.stringify({ sdp: pc.localDescription })
                        );
                    }
                }
            } catch (e) {
                console.error('[SDP] Error handling SDP:', e);
            }
        }

        if (signal.ice) {
            // If remote description isn't set yet, buffer the candidate
            if (!pc.remoteDescription || !pc.remoteDescription.type) {
                pendingCandidatesRef.current[fromId] =
                    pendingCandidatesRef.current[fromId] || [];
                pendingCandidatesRef.current[fromId].push(signal.ice);
            } else {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.ice));
                } catch (e) {
                    console.warn('[ICE] Failed to add candidate:', e);
                }
            }
        }
    }, []);

    // ── Connect to socket server ──────────────────────────────────────────────
    const connectToSocketServer = useCallback(() => {
        const socket = io.connect(server, { secure: false, reconnectionAttempts: 5 });
        socketRef.current = socket;

        socket.on('signal', gotMessageFromServer);

        socket.on('connect', () => {
            socketIdRef.current = socket.id;
            // Use only the pathname so all users with the same URL join the same room
            socket.emit('join-call', window.location.pathname);
        });

        socket.on('connect_error', (err) => {
            console.error('[Socket] Connection error:', err.message);
        });

        socket.on('chat-message', (data, sender, socketIdSender, timestamp) => {
            addMessage(data, sender, socketIdSender, timestamp);
        });

        socket.on('user-left', (id) => {
            removeVideoTile(id);
        });

        // user-joined fires for every member in the room (including self) each
        // time anyone new joins.  `id` is the socket ID of the person who just joined.
        socket.on('user-joined', (id, clients) => {
            // Create/update peer connections for every client in the room
            clients.forEach(socketListId => {
                createPeerConnection(socketListId);
            });

            // Only the joining peer creates offers — to all existing peers
            if (id === socketIdRef.current) {
                const connections = connectionsRef.current;
                clients.forEach(socketListId => {
                    if (socketListId === socketIdRef.current) return;

                    const pc = connections[socketListId];
                    if (!pc) return;

                    pc.createOffer()
                        .then(offer => pc.setLocalDescription(offer))
                        .then(() => {
                            socket.emit(
                                'signal',
                                socketListId,
                                JSON.stringify({ sdp: pc.localDescription })
                            );
                        })
                        .catch(e => console.error('[SDP] Offer error:', e));
                });
            }
        });

        // Replay historical chat messages when joining an existing room
        socket.on('chat-history', (history) => {
            setMessages(history.map(m => ({
                sender: m.sender,
                data: m.data,
                time: m.time || new Date().toISOString(),
            })));
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gotMessageFromServer, createPeerConnection, removeVideoTile]); // addMessage defined below — stable via eslint-disable

    // ── addMessage (stable ref for use in socket handler) ─────────────────────
    const addMessage = useCallback((data, sender, socketIdSender, timestamp) => {
        setMessages(prev => [
            ...prev,
            {
                sender,
                data,
                time: timestamp || new Date().toISOString(),
            },
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages(n => n + 1);
        }
    }, []);

    // Auto-scroll chat to bottom on new messages
    useEffect(() => {
        if (showChat && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, showChat]);

    // ── Connect flow: called when user clicks "Join" in the lobby ─────────────
    const connect = useCallback(() => {
        if (!username.trim()) return;
        setAskForUsername(false);
        connectToSocketServer();
    }, [username, connectToSocketServer]);

    // ── Send chat message ─────────────────────────────────────────────────────
    const sendMessage = useCallback(() => {
        const trimmed = message.trim();
        if (!trimmed || !socketRef.current) return;
        socketRef.current.emit('chat-message', trimmed, username);
        setMessage('');
    }, [message, username]);

    const handleMessageKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);

    // ── Chat panel toggle ─────────────────────────────────────────────────────
    const toggleChat = useCallback(() => {
        setShowChat(prev => {
            if (!prev) setNewMessages(0); // Reset unread count when opening
            return !prev;
        });
        setShowParticipants(false);
    }, []);

    const toggleParticipants = useCallback(() => {
        setShowParticipants(prev => !prev);
        setShowChat(false);
    }, []);

    // ── Lobby screen ─────────────────────────────────────────────────────────
    if (askForUsername) {
        return (
            <div className={styles.lobbyContainer}>
                <div className={styles.lobbyCard}>
                    <h2 className={styles.lobbyTitle}>Join Meeting</h2>

                    {permissionError && (
                        <div className={styles.permissionError}>{permissionError}</div>
                    )}

                    <div className={styles.lobbyPreview}>
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className={styles.lobbyVideo}
                        />
                    </div>

                    <TextField
                        fullWidth
                        label="Your display name"
                        variant="outlined"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && connect()}
                        inputProps={{ maxLength: 40 }}
                        sx={{ marginBottom: '16px' }}
                    />

                    <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        onClick={connect}
                        disabled={!username.trim()}
                        sx={{ borderRadius: '8px', padding: '12px' }}
                    >
                        Join Now
                    </Button>
                </div>
            </div>
        );
    }

    // ── Meeting screen ────────────────────────────────────────────────────────
    const totalParticipants = videos.length + 1; // remotes + self

    return (
        <div className={styles.meetRoot}>
            {/* ── Main video grid ─────────────────────────────────────────── */}
            <div
                className={styles.videoGrid}
                data-count={Math.min(totalParticipants, 9)}
            >
                {/* Self tile */}
                <div className={styles.videoTile}>
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className={styles.videoElement}
                    />
                    <div className={styles.tileOverlay}>
                        <span className={styles.tileName}>
                            {username || 'You'} (You)
                        </span>
                        <span className={styles.tileStatus}>
                            {!audio && <MicOffIcon fontSize="small" sx={{ color: '#f44336' }} />}
                            {!video && <VideocamOffIcon fontSize="small" sx={{ color: '#f44336' }} />}
                        </span>
                    </div>
                </div>

                {/* Remote tiles */}
                {videos.map((v) => (
                    <div key={v.socketId} className={styles.videoTile}>
                        <video
                            autoPlay
                            playsInline
                            className={styles.videoElement}
                            ref={ref => {
                                if (ref && v.stream && ref.srcObject !== v.stream) {
                                    ref.srcObject = v.stream;
                                }
                            }}
                        />
                        <div className={styles.tileOverlay}>
                            <span className={styles.tileName}>
                                {v.username || 'Participant'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Side panel: Chat ─────────────────────────────────────────── */}
            {showChat && (
                <div className={styles.sidePanel}>
                    <div className={styles.sidePanelHeader}>
                        <h3>Chat</h3>
                        <IconButton size="small" onClick={toggleChat} sx={{ color: 'white' }}>
                            ✕
                        </IconButton>
                    </div>
                    <div className={styles.chatMessages}>
                        {messages.length === 0 && (
                            <p className={styles.chatEmpty}>No messages yet</p>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={styles.chatBubble}>
                                <div className={styles.chatMeta}>
                                    <span className={styles.chatSender}>{m.sender}</span>
                                    <span className={styles.chatTime}>
                                        {formatTime(new Date(m.time))}
                                    </span>
                                </div>
                                <p className={styles.chatText}>{m.data}</p>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <div className={styles.chatInput}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Type a message…"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            onKeyDown={handleMessageKeyDown}
                            inputProps={{ maxLength: 500 }}
                            sx={{ background: '#1e2a3a', borderRadius: '6px',
                                  '& input': { color: 'white' },
                                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334' } }}
                        />
                        <IconButton onClick={sendMessage} sx={{ color: '#1976d2' }}>
                            <SendIcon />
                        </IconButton>
                    </div>
                </div>
            )}

            {/* ── Side panel: Participants ─────────────────────────────────── */}
            {showParticipants && (
                <div className={styles.sidePanel}>
                    <div className={styles.sidePanelHeader}>
                        <h3>Participants ({totalParticipants})</h3>
                        <IconButton size="small" onClick={toggleParticipants} sx={{ color: 'white' }}>
                            ✕
                        </IconButton>
                    </div>
                    <div className={styles.participantList}>
                        <div className={styles.participantItem}>
                            <span className={styles.participantAvatar}>
                                {(username || 'Y').charAt(0).toUpperCase()}
                            </span>
                            <span className={styles.participantName}>
                                {username || 'You'} (You)
                            </span>
                        </div>
                        {videos.map(v => (
                            <div key={v.socketId} className={styles.participantItem}>
                                <span className={styles.participantAvatar}>
                                    {(v.username || 'P').charAt(0).toUpperCase()}
                                </span>
                                <span className={styles.participantName}>
                                    {v.username || 'Participant'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Control bar ─────────────────────────────────────────────── */}
            <div className={styles.controlBar}>
                <div className={styles.controlGroup}>
                    <Tooltip title={audio ? 'Mute microphone' : 'Unmute microphone'}>
                        <IconButton
                            onClick={handleAudio}
                            className={audio ? styles.controlBtn : styles.controlBtnOff}
                            disabled={!audioAvailable}
                        >
                            {audio ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>
                    </Tooltip>

                    <Tooltip title={video ? 'Turn off camera' : 'Turn on camera'}>
                        <IconButton
                            onClick={handleVideo}
                            className={video ? styles.controlBtn : styles.controlBtnOff}
                            disabled={!videoAvailable}
                        >
                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                    </Tooltip>

                    {screenAvailable && (
                        <Tooltip title={screen ? 'Stop sharing' : 'Share screen'}>
                            <IconButton
                                onClick={handleScreen}
                                className={screen ? styles.controlBtnActive : styles.controlBtn}
                            >
                                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton>
                        </Tooltip>
                    )}
                </div>

                <div className={styles.controlGroup}>
                    <Tooltip title="Chat">
                        <Badge badgeContent={showChat ? 0 : newMessages} color="error" max={99}>
                            <IconButton
                                onClick={toggleChat}
                                className={showChat ? styles.controlBtnActive : styles.controlBtn}
                            >
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                    </Tooltip>

                    <Tooltip title="Participants">
                        <Badge badgeContent={totalParticipants} color="primary" max={99}>
                            <IconButton
                                onClick={toggleParticipants}
                                className={showParticipants ? styles.controlBtnActive : styles.controlBtn}
                            >
                                <PeopleIcon />
                            </IconButton>
                        </Badge>
                    </Tooltip>
                </div>

                <div className={styles.controlGroup}>
                    <Tooltip title="Leave meeting">
                        <IconButton onClick={handleEndCall} className={styles.controlBtnEnd}>
                            <CallEndIcon />
                        </IconButton>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}
