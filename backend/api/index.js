/**
 * Vercel serverless entry point for TechYuva backend.
 * Imports the Express app from server.js and exports it for Vercel.
 */
const app = require('../server');
module.exports = app;
