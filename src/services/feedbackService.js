const { supabase } = require('../config');
const { ValidationError, NotFoundError } = require('../middlewares/errorHandler');

class FeedbackService {
  // Get all approved feedback (public)
  async getApprovedFeedback(page = 1, limit = 10, projectId = null) {
    try {
      let query = supabase
        .from('feedback')
        .select(`
          *,
          users!inner(name, email),
          portfolio_projects(title, category)
        `)
        .eq('is_approved', true)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      // Filter by project if provided
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      // Add pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: feedback, error, count } = await query;

      if (error) throw error;

      return {
        feedback,
        pagination: {
          page,
          limit,
          total: count || feedback.length,
          hasMore: feedback.length === limit
        }
      };
    } catch (error) {
      throw new Error('Failed to fetch feedback: ' + error.message);
    }
  }

  // Get all feedback (admin only)
  async getAllFeedback(page = 1, limit = 10, status = null) {
    try {
      let query = supabase
        .from('feedback')
        .select(`
          *,
          users(name, email),
          portfolio_projects(title, category)
        `)
        .order('created_at', { ascending: false });

      // Filter by approval status
      if (status === 'approved') {
        query = query.eq('is_approved', true);
      } else if (status === 'pending') {
        query = query.eq('is_approved', false);
      } else if (status === 'hidden') {
        query = query.eq('is_hidden', true);
      }

      // Add pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: feedback, error, count } = await query;

      if (error) throw error;

      return {
        feedback,
        pagination: {
          page,
          limit,
          total: count || feedback.length,
          hasMore: feedback.length === limit
        }
      };
    } catch (error) {
      throw new Error('Failed to fetch all feedback: ' + error.message);
    }
  }

  // Get feedback by ID
  async getFeedbackById(feedbackId) {
    try {
      const { data: feedback, error } = await supabase
        .from('feedback')
        .select(`
          *,
          users(name, email),
          portfolio_projects(title, category)
        `)
        .eq('id', feedbackId)
        .single();

      if (error || !feedback) {
        throw new NotFoundError('Feedback not found');
      }

      return feedback;
    } catch (error) {
      if (error.name === 'NotFoundError') throw error;
      throw new Error('Failed to fetch feedback: ' + error.message);
    }
  }

  // Create new feedback (client only)
  async createFeedback(feedbackData, userId) {
    try {
      const { rating, comment, projectId } = feedbackData;

      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new ValidationError('Rating must be between 1 and 5');
      }

      // Check if project exists (if projectId provided)
      if (projectId) {
        const { data: project, error: projectError } = await supabase
          .from('portfolio_projects')
          .select('id')
          .eq('id', projectId)
          .single();

        if (projectError || !project) {
          throw new ValidationError('Project not found');
        }
      }

      // Compute unique key for user/project
      const userProjectKey = projectId ? `${userId}-${projectId}` : userId;

      // Try to create feedback directly - let the unique constraint handle duplicates
      let insertQuery = supabase
        .from('feedback')
        .insert({
          user_id: userId,
          project_id: projectId || null,
          user_project_key: userProjectKey,
          rating,
          comment,
          is_approved: rating > 3, // Auto-approve if rating > 3
          is_hidden: false
        })
        .select(`
          *,
          users(name, email),
          portfolio_projects(title, category)
        `)
        .single();

      const result = await insertQuery;

      if (result.error) {
        // Check for unique constraint violation on user_project_key
        if (
          result.error.code === '23505' ||
          (result.error.message && result.error.message.includes('unique_user_project_key'))
        ) {
          // Fetch the existing feedback for this user/project
          let fetchQuery = supabase
            .from('feedback')
            .select('id, rating, comment, is_approved, created_at')
            .eq('user_id', userId);
          if (projectId) {
            fetchQuery = fetchQuery.eq('project_id', projectId);
          } else {
            fetchQuery = fetchQuery.is('project_id', null);
          }
          const { data: existingFeedback, error: fetchError } = await fetchQuery.single();

          if (fetchError) {
            throw new Error('Failed to fetch existing feedback: ' + fetchError.message);
          }

          throw new ValidationError('You have already submitted feedback. You can edit or delete your existing feedback.', {
            existingFeedback,
            code: 'FEEDBACK_EXISTS'
          });
        }
        throw result.error;
      }

      return result.data;
    } catch (error) {
      if (error.name === 'ValidationError') throw error;
      throw new Error('Failed to create feedback: ' + error.message);
    }
  }

  // Update feedback (admin only)
  async updateFeedback(feedbackId, updateData) {
    try {
      const { data: feedback, error } = await supabase
        .from('feedback')
        .update(updateData)
        .eq('id', feedbackId)
        .select(`
          *,
          users(name, email),
          portfolio_projects(title, category)
        `)
        .single();

      if (error) throw error;

      return feedback;
    } catch (error) {
      throw new Error('Failed to update feedback: ' + error.message);
    }
  }

  // Update user's own feedback (client only)
  async updateUserFeedback(feedbackId, userId, updateData) {
    try {
      // Check if feedback exists and belongs to user
      const { data: existingFeedback, error: existingError } = await supabase
        .from('feedback')
        .select('id, rating, comment, is_approved')
        .eq('id', feedbackId)
        .eq('user_id', userId)
        .single();

      if (existingError || !existingFeedback) {
        throw new NotFoundError('Feedback not found or you do not have permission to edit it');
      }

      // Validate rating if provided
      if (updateData.rating && (updateData.rating < 1 || updateData.rating > 5)) {
        throw new ValidationError('Rating must be between 1 and 5');
      }

      // Reset approval status when user edits their feedback
      updateData.is_approved = false;

      const { data: feedback, error } = await supabase
        .from('feedback')
        .update(updateData)
        .eq('id', feedbackId)
        .eq('user_id', userId)
        .select(`
          *,
          users(name, email),
          portfolio_projects(title, category)
        `)
        .single();

      if (error) throw error;

      return feedback;
    } catch (error) {
      if (error.name === 'ValidationError' || error.name === 'NotFoundError') throw error;
      throw new Error('Failed to update feedback: ' + error.message);
    }
  }

  // Delete feedback (admin only)
  async deleteFeedback(feedbackId) {
    try {
      const { error } = await supabase
        .from('feedback')
        .delete()
        .eq('id', feedbackId);

      if (error) throw error;

      return { message: 'Feedback deleted successfully' };
    } catch (error) {
      throw new Error('Failed to delete feedback: ' + error.message);
    }
  }

  // Delete user's own feedback (client only)
  async deleteUserFeedback(feedbackId, userId) {
    try {
      // Check if feedback exists and belongs to user
      const { data: existingFeedback, error: existingError } = await supabase
        .from('feedback')
        .select('id')
        .eq('id', feedbackId)
        .eq('user_id', userId)
        .single();

      if (existingError || !existingFeedback) {
        throw new NotFoundError('Feedback not found or you do not have permission to delete it');
      }

      const { error } = await supabase
        .from('feedback')
        .delete()
        .eq('id', feedbackId)
        .eq('user_id', userId);

      if (error) throw error;

      return { message: 'Your feedback has been deleted successfully' };
    } catch (error) {
      if (error.name === 'NotFoundError') throw error;
      throw new Error('Failed to delete feedback: ' + error.message);
    }
  }

  // Get user's own feedback (client only)
  async getUserFeedback(userId, page = 1, limit = 10) {
    try {
      const { data: feedback, error, count } = await supabase
        .from('feedback')
        .select(`
          *,
          portfolio_projects(title, category)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return {
        feedback,
        pagination: {
          page,
          limit,
          total: count || feedback.length,
          hasMore: feedback.length === limit
        }
      };
    } catch (error) {
      throw new Error('Failed to fetch user feedback: ' + error.message);
    }
  }

  // Approve/Reject feedback (admin only)
  async moderateFeedback(feedbackId, isApproved, isHidden = false) {
    try {
      const updateData = {
        is_approved: isApproved,
        is_hidden: isHidden
      };

      const feedback = await this.updateFeedback(feedbackId, updateData);

      return {
        message: `Feedback ${isApproved ? 'approved' : 'rejected'} successfully`,
        feedback
      };
    } catch (error) {
      throw new Error('Failed to moderate feedback: ' + error.message);
    }
  }

  // Get feedback statistics
  async getFeedbackStats() {
    try {
      const { data: stats, error } = await supabase
        .from('feedback')
        .select('rating, is_approved, is_hidden');

      if (error) throw error;

      const totalFeedback = stats.length;
      const approvedFeedback = stats.filter(f => f.is_approved && !f.is_hidden).length;
      const pendingFeedback = stats.filter(f => !f.is_approved && !f.is_hidden).length;
      const hiddenFeedback = stats.filter(f => f.is_hidden).length;

      // Calculate average rating
      const approvedRatings = stats.filter(f => f.is_approved && !f.is_hidden).map(f => f.rating);
      const averageRating = approvedRatings.length > 0 
        ? (approvedRatings.reduce((sum, rating) => sum + rating, 0) / approvedRatings.length).toFixed(1)
        : 0;

      // Rating distribution
      const ratingDistribution = {};
      for (let i = 1; i <= 5; i++) {
        ratingDistribution[i] = approvedRatings.filter(rating => rating === i).length;
      }

      return {
        totalFeedback,
        approvedFeedback,
        pendingFeedback,
        hiddenFeedback,
        averageRating: parseFloat(averageRating),
        ratingDistribution
      };
    } catch (error) {
      throw new Error('Failed to get feedback statistics: ' + error.message);
    }
  }

  // Get project feedback (public)
  async getProjectFeedback(projectId, page = 1, limit = 10) {
    try {
      const { data: feedback, error, count } = await supabase
        .from('feedback')
        .select(`
          *,
          users(name, email)
        `)
        .eq('project_id', projectId)
        .eq('is_approved', true)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return {
        feedback,
        pagination: {
          page,
          limit,
          total: count || feedback.length,
          hasMore: feedback.length === limit
        }
      };
    } catch (error) {
      throw new Error('Failed to fetch project feedback: ' + error.message);
    }
  }

  // Get all feedback for a project (admin only)
  async getAllProjectFeedbackAdmin(projectId, page = 1, limit = 10) {
    try {
      const { data: feedback, error, count } = await supabase
        .from('feedback')
        .select(`*, users(name, email)`)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
      if (error) throw error;
      return {
        feedback,
        pagination: {
          page,
          limit,
          total: count || feedback.length,
          hasMore: feedback.length === limit
        }
      };
    } catch (error) {
      throw new Error('Failed to fetch all project feedback for admin: ' + error.message);
    }
  }

  // Get feedback with rating > 2, plus user's own feedback (for logged-in users)
  async getProjectFeedbackWithUser(projectId, userId, page = 1, limit = 10) {
    try {
      // Get feedback with rating > 2
      const { data: feedbackAbove2, error: errorAbove2 } = await supabase
        .from('feedback')
        .select(`*, users(name, email)`)
        .eq('project_id', projectId)
        .gt('rating', 2)
        .order('created_at', { ascending: false });
      if (errorAbove2) throw errorAbove2;
      // Get user's own feedback (even if rating <= 2)
      const { data: userFeedback, error: userError } = await supabase
        .from('feedback')
        .select(`*, users(name, email)`)
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (userError) throw userError;
      // Merge, avoiding duplicates
      const feedbackMap = new Map();
      for (const fb of feedbackAbove2) feedbackMap.set(fb.id, fb);
      for (const fb of userFeedback) feedbackMap.set(fb.id, fb);
      const feedback = Array.from(feedbackMap.values());
      // Pagination (manual, since merged)
      const total = feedback.length;
      const paged = feedback.slice((page - 1) * limit, page * limit);
      return {
        feedback: paged,
        pagination: {
          page,
          limit,
          total,
          hasMore: paged.length === limit
        }
      };
    } catch (error) {
      throw new Error('Failed to fetch project feedback for user: ' + error.message);
    }
  }

  // Get only feedback with rating > 2 (public)
  async getProjectFeedbackPublic(projectId, page = 1, limit = 10) {
    try {
      const { data: feedback, error, count } = await supabase
        .from('feedback')
        .select(`*, users(name, email)`)
        .eq('project_id', projectId)
        .gt('rating', 2)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
      if (error) throw error;
      return {
        feedback,
        pagination: {
          page,
          limit,
          total: count || feedback.length,
          hasMore: feedback.length === limit
        }
      };
    } catch (error) {
      throw new Error('Failed to fetch public project feedback: ' + error.message);
    }
  }
}

module.exports = new FeedbackService(); 