import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { connectToSocket } from './controllers/socketManager.js';
import cors from 'cors';
import userRoutes from './routes/users.routes.js';

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set('port', process.env.PORT || 8000);

// CORS: restrict to the configured origin in production.
// Set CORS_ORIGIN in your .env (e.g. https://meetx.vercel.app for production).
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(express.json({ limit: '40kb' }));
app.use(express.urlencoded({ limit: '40kb', extended: true }));

app.use('/api/v1/users', userRoutes);

const start = async () => {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('ERROR: MONGODB_URI is not set. Add it to backend/.env');
        process.exit(1);
    }

    const connectionDb = await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${connectionDb.connection.host}`);

    server.listen(app.get('port'), () => {
        console.log(`Server listening on port ${app.get('port')}`);
    });
};

start();
