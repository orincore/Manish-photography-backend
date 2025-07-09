const { supabase } = require('../config');
const { hashPassword, verifyPassword, generateToken } = require('../utils/auth');
const { ValidationError, NotFoundError } = require('../middlewares/errorHandler');

class UserService {
  // Register a new client
  async registerClient(userData) {
    const { name, email, phone, password } = userData;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new ValidationError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        phone,
        password: hashedPassword,
        role: 'client',
      })
      .select('id, name, email, phone, role')
      .single();

    if (error) {
      throw new Error('Failed to create user');
    }

    // Generate token
    const token = generateToken({ userId: user.id, role: user.role });

    return { user, token };
  }

  // Login user (admin or client)
  async login(credentials) {
    const { email, password } = credentials;

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new ValidationError('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new ValidationError('Invalid email or password');
    }

    // Generate token
    const token = generateToken({ userId: user.id, role: user.role });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  // Get user by ID
  async getUserById(userId) {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  // Update user profile
  async updateUser(userId, updateData) {
    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, name, email, role, phone, created_at')
      .single();

    if (error) {
      throw new Error('Failed to update user');
    }

    return user;
  }

  // Create admin user (for initial setup)
  async createAdmin(adminData) {
    const { name, email, phone, password } = adminData;

    // Check if admin already exists
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingAdmin) {
      throw new ValidationError('Admin with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin
    const { data: admin, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        phone,
        password: hashedPassword,
        role: 'admin',
      })
      .select('id, name, email, phone, role, created_at')
      .single();

    if (error) {
      throw new Error('Failed to create admin');
    }

    return admin;
  }
}

module.exports = new UserService(); 