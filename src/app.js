const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Add error handling for route loading
let errorHandler;
let authRoutes;
let portfolioRoutes;
let feedbackRoutes;
let contactRoutes;
let instagramRoutes;
let homepageRoutes;

try {
  errorHandler = require('./middlewares/errorHandler').errorHandler;
  authRoutes = require('./routes/auth');
  portfolioRoutes = require('./routes/portfolio');
  feedbackRoutes = require('./routes/feedback');
  contactRoutes = require('./routes/contact');
  instagramRoutes = require('./routes/instagram');
  homepageRoutes = require('./routes/homepage');
} catch (error) {
  console.error('Error loading modules:', error);
  process.exit(1);
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Increase timeout for all requests to 30 minutes (1800000 ms) for large video uploads
app.use((req, res, next) => {
  res.setTimeout(1800000, () => {
    console.log('Request has timed out.');
    res.status(408).send('Request timed out');
  });
  next();
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/homepage', homepageRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
