// Vercel Serverless Function entry point
// This file bridges the Vercel serverless environment with the Express app
import 'dotenv/config';
import app from '../backend/src/index';

export default app;
