const jwtSecret = process.env.JWT_SECRET || 'dev_secret_key_change_in_production';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1d';

// Only throw error in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable');
}

module.exports = {
  secret: jwtSecret,
  expiresIn: jwtExpiresIn,
}; 