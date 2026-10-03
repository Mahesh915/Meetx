// Server URL is provided via the REACT_APP_API_URL environment variable.
// Set it in frontend/.env for local development:
//   REACT_APP_API_URL=http://localhost:8000
// Set it in your Vercel project environment variables for production.
const server = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default server;
