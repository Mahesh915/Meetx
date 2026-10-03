import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import { IconButton } from '@mui/material';
import withAuth from '../utils/withAuth';

function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState('');
    const routeTo = useNavigate();

    useEffect(() => {
        let cancelled = false;
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                if (!cancelled) setMeetings(history);
            } catch {
                if (!cancelled) setError('Failed to load history.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchHistory();
        return () => { cancelled = true; };
    // getHistoryOfUser is stable (defined in AuthContext with no deps that change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day   = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year  = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <IconButton onClick={() => routeTo('/home')}>
                    <HomeIcon />
                </IconButton>
                <h2 style={{ margin: 0, marginLeft: '8px' }}>Meeting History</h2>
            </div>

            {loading && <p>Loading…</p>}
            {error   && <p style={{ color: 'red' }}>{error}</p>}

            {!loading && meetings.length === 0 && !error && (
                <p style={{ color: '#666' }}>No meetings in your history yet.</p>
            )}

            {meetings.map((m) => (
                <Card key={m._id || m.meetingCode} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                        <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                            Code: <strong>{m.meetingCode}</strong>
                        </Typography>
                        <Typography sx={{ mb: 1 }} color="text.secondary">
                            Date: {formatDate(m.date)}
                        </Typography>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default withAuth(History);
