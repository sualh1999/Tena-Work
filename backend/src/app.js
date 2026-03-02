const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'TenaWork Backend API'
  });
});

// Serve static files (uploads)
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/admin', require('./routes/admin'));

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
