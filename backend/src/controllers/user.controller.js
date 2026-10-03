import httpStatus from 'http-status';
import { User } from '../models/user.model.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Meeting } from '../models/meeting.model.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sanitize error for client response.
 * Never expose raw exception details (stack traces, DB errors) to the client.
 */
const serverError = (res, err, context = '') => {
    console.error(`[UserController] ${context}`, err);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'An internal server error occurred.',
    });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Username and password are required.',
        });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(httpStatus.BAD_REQUEST).json({ message: 'Invalid input.' });
    }

    try {
        const user = await User.findOne({ username: username.trim() });

        if (!user) {
            // Return the same message for both "user not found" and "wrong password"
            // to prevent username enumeration.
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: 'Invalid username or password.',
            });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: 'Invalid username or password.',
            });
        }

        // Generate a new session token on every login
        const token = crypto.randomBytes(32).toString('hex');
        user.token = token;
        await user.save();

        return res.status(httpStatus.OK).json({ token });
    } catch (err) {
        return serverError(res, err, 'login');
    }
};

const register = async (req, res) => {
    const { name, username, password } = req.body;

    // Input presence validation
    if (!name || !username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Name, username, and password are all required.',
        });
    }

    // Type validation
    if (
        typeof name     !== 'string' ||
        typeof username !== 'string' ||
        typeof password !== 'string'
    ) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: 'Invalid input.' });
    }

    // Length limits
    if (name.trim().length < 1 || name.trim().length > 100) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Name must be between 1 and 100 characters.',
        });
    }
    if (username.trim().length < 3 || username.trim().length > 30) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Username must be between 3 and 30 characters.',
        });
    }
    if (password.length < 6) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Password must be at least 6 characters.',
        });
    }

    try {
        const existingUser = await User.findOne({ username: username.trim() });
        if (existingUser) {
            // Use 409 Conflict instead of 302 Found (302 is a redirect code, not an error)
            return res.status(httpStatus.CONFLICT).json({
                message: 'Username is already taken.',
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name:     name.trim(),
            username: username.trim(),
            password: hashedPassword,
        });

        await newUser.save();

        return res.status(httpStatus.CREATED).json({ message: 'Account created successfully.' });
    } catch (err) {
        return serverError(res, err, 'register');
    }
};

const getUserHistory = async (req, res) => {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Authentication required.' });
    }

    try {
        const user = await User.findOne({ token });

        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Invalid or expired session.' });
        }

        const meetings = await Meeting.find({ user_id: user.username }).sort({ date: -1 });
        return res.status(httpStatus.OK).json(meetings);
    } catch (err) {
        return serverError(res, err, 'getUserHistory');
    }
};

const addToHistory = async (req, res) => {
    const { token, meeting_code } = req.body;

    if (!token || typeof token !== 'string') {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Authentication required.' });
    }

    if (!meeting_code || typeof meeting_code !== 'string') {
        return res.status(httpStatus.BAD_REQUEST).json({ message: 'meeting_code is required.' });
    }

    try {
        const user = await User.findOne({ token });

        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Invalid or expired session.' });
        }

        const newMeeting = new Meeting({
            user_id:     user.username,
            meetingCode: meeting_code.trim(),
        });

        await newMeeting.save();

        return res.status(httpStatus.CREATED).json({ message: 'Meeting added to history.' });
    } catch (err) {
        return serverError(res, err, 'addToHistory');
    }
};

export { login, register, getUserHistory, addToHistory };
