const { z } = require('zod');

// User registration schema
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number must be less than 15 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// User login schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Portfolio project schema
const portfolioSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description must be less than 2000 characters'),
  category: z.string().min(1, 'Category is required').max(100, 'Category must be less than 100 characters'),
  tags: z.string().optional(), // Will be parsed as JSON array
  isPublished: z.string().optional(), // Will be parsed as boolean
});

// Feedback schema
const feedbackSchema = z.object({
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().min(1, 'Comment is required').max(500, 'Comment must be less than 500 characters'),
  projectId: z.string().uuid('Invalid project ID').optional(),
});

// Contact form schema
const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number must be less than 15 digits').optional(),
  location: z.string().min(2, 'Location must be at least 2 characters').max(100, 'Location must be less than 100 characters').optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message must be less than 1000 characters'),
});

// Update feedback schema (admin)
const updateFeedbackSchema = z.object({
  isApproved: z.boolean(),
  isHidden: z.boolean().optional(),
});

// Update user feedback schema (client only)
const updateUserFeedbackSchema = z.object({
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5').optional(),
  comment: z.string().min(1, 'Comment is required').max(500, 'Comment must be less than 500 characters').optional(),
}).refine((data) => data.rating !== undefined || data.comment !== undefined, {
  message: 'At least one field (rating or comment) must be provided',
  path: ['rating', 'comment']
});

// Pagination schema
const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('10'),
});

// Search schema
const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Search query must be less than 100 characters'),
});

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  displayOrder: z.number().optional()
});

// Homepage element schemas
const homepageElementSchema = z.object({
  type: z.enum(['hero', 'featured', 'instagram', 'about', 'our-story', 'gallery', 'testimonial', 'service', 'contact', 'hero-video', 'featured-video'], {
    errorMap: () => ({ message: 'Type must be one of: hero, featured, instagram, about, our-story, gallery, testimonial, service, contact, hero-video, featured-video' })
  }),
  title: z.string().max(255, 'Title must be less than 255 characters').optional(),
  subtitle: z.string().max(500, 'Subtitle must be less than 500 characters').optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  order_index: z.string().transform(val => val ? parseInt(val) : undefined).pipe(z.number().min(0, 'Order index must be non-negative')).optional(),
  is_active: z.preprocess(val => val === 'true' ? true : val === 'false' ? false : val, z.boolean().optional()),
  is_featured: z.preprocess(val => val === 'true' ? true : val === 'false' ? false : val, z.boolean().optional()),
  video_autoplay: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
  video_muted: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
  video_loop: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
  video_poster: z.string().max(500, 'Video poster URL must be less than 500 characters').optional(),
});

const updateHomepageElementSchema = z.object({
  title: z.string().max(255, 'Title must be less than 255 characters').optional(),
  subtitle: z.string().max(500, 'Subtitle must be less than 500 characters').optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  order_index: z.number().min(0, 'Order index must be non-negative').optional(),
  is_active: z.preprocess(val => val === 'true' ? true : val === 'false' ? false : val, z.boolean().optional()),
  is_featured: z.preprocess(val => val === 'true' ? true : val === 'false' ? false : val, z.boolean().optional()),
  video_autoplay: z.boolean().optional(),
  video_muted: z.boolean().optional(),
  video_loop: z.boolean().optional(),
  video_poster: z.string().max(500, 'Video poster URL must be less than 500 characters').optional(),
});

const toggleActiveSchema = z.object({
  is_active: z.boolean('is_active must be a boolean value'),
});

const reorderElementsSchema = z.object({
  element_ids: z.array(z.string().uuid('Invalid element ID')).min(1, 'At least one element ID is required'),
});

const bulkUploadSchema = z.object({
  type: z.enum(['hero', 'featured', 'instagram', 'about', 'gallery', 'testimonial', 'service', 'contact', 'hero-video', 'featured-video'], {
    errorMap: () => ({ message: 'Type must be one of: hero, featured, instagram, about, gallery, testimonial, service, contact, hero-video, featured-video' })
  }),
  is_active: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
  is_featured: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  portfolioSchema,
  feedbackSchema,
  contactSchema,
  updateFeedbackSchema,
  updateUserFeedbackSchema,
  paginationSchema,
  searchSchema,
  categorySchema,
  homepageElementSchema,
  updateHomepageElementSchema,
  toggleActiveSchema,
  reorderElementsSchema,
  bulkUploadSchema,
}; 