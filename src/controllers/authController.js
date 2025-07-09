const userService = require('../services/userService');
const { ValidationError } = require('../middlewares/errorHandler');

class AuthController {
  // Register a new client
  async register(req, res, next) {
    try {
      const { name, email, phone, password } = req.body;
      
      const result = await userService.registerClient({ name, email, phone, password });
      
      res.status(201).json({
        message: 'User registered successfully',
        user: result.user,
        token: result.token
      });
    } catch (error) {
      next(error);
    }
  }

  // Login user (admin or client)
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      const result = await userService.login({ email, password });
      
      res.status(200).json({
        message: 'Login successful',
        user: result.user,
        token: result.token
      });
    } catch (error) {
      next(error);
    }
  }

  // Get current user profile
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await userService.getUserById(userId);
      
      res.status(200).json({
        user
      });
    } catch (error) {
      next(error);
    }
  }

  // Update user profile
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const updateData = req.body;
      
      // Remove sensitive fields that shouldn't be updated
      delete updateData.password;
      delete updateData.role;
      delete updateData.id;
      
      const user = await userService.updateUser(userId, updateData);
      
      res.status(200).json({
        message: 'Profile updated successfully',
        user
      });
    } catch (error) {
      next(error);
    }
  }

  // Create admin (for initial setup)
  async createAdmin(req, res, next) {
    try {
      const { name, email, phone, password } = req.body;
      
      // Check if admin already exists
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail && adminEmail !== email) {
        throw new ValidationError('Admin email mismatch');
      }
      
      const admin = await userService.createAdmin({ name, email, phone, password });
      
      res.status(201).json({
        message: 'Admin created successfully',
        admin
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController(); 