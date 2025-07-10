const feedbackService = require('../services/feedbackService');
const { ValidationError } = require('../middlewares/errorHandler');

class FeedbackController {
  // Get all approved feedback (public)
  async getApprovedFeedback(req, res, next) {
    try {
      const { page = 1, limit = 10, projectId } = req.query;
      
      const result = await feedbackService.getApprovedFeedback(
        parseInt(page),
        parseInt(limit),
        projectId
      );
      
      res.status(200).json({
        message: 'Feedback fetched successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all feedback (admin only)
  async getAllFeedback(req, res, next) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      
      const result = await feedbackService.getAllFeedback(
        parseInt(page),
        parseInt(limit),
        status
      );
      
      res.status(200).json({
        message: 'All feedback fetched successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get feedback by ID
  async getFeedbackById(req, res, next) {
    try {
      const { feedbackId } = req.params;
      
      const feedback = await feedbackService.getFeedbackById(feedbackId);
      
      res.status(200).json({
        message: 'Feedback fetched successfully',
        feedback
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new feedback (client only)
  async createFeedback(req, res, next) {
    try {
      const { rating, comment, projectId } = req.body;
      
      console.log('📝 Creating feedback request:', {
        userId: req.user.id,
        rating,
        comment,
        projectId,
        body: req.body
      });
      
      const feedback = await feedbackService.createFeedback(
        { rating, comment, projectId },
        req.user.id
      );
      
      console.log('✅ Feedback created successfully:', feedback.id);
      
      // Determine message based on approval status
      const message = feedback.is_approved 
        ? 'Feedback submitted and automatically approved!'
        : 'Feedback submitted successfully. It will be reviewed by admin.';
      
      res.status(201).json({
        message,
        feedback
      });
    } catch (error) {
      console.error('❌ Error creating feedback:', error.message);
      
      // Handle existing feedback error
      if (error.name === 'ValidationError' && error.details?.code === 'FEEDBACK_EXISTS') {
        console.log('⚠️ Existing feedback found, returning 409');
        return res.status(409).json({
          error: {
            message: error.message,
            code: 'FEEDBACK_EXISTS',
            existingFeedback: error.details.existingFeedback,
            options: {
              edit: `PUT /api/feedback/${error.details.existingFeedback.id}/user`,
              delete: `DELETE /api/feedback/${error.details.existingFeedback.id}/user`
            }
          }
        });
      }
      next(error);
    }
  }

  // Update feedback (admin only)
  async updateFeedback(req, res, next) {
    try {
      const { feedbackId } = req.params;
      const updateData = req.body;
      
      console.log('📝 Admin updating feedback:', {
        feedbackId,
        updateData
      });
      
      const feedback = await feedbackService.updateFeedback(feedbackId, updateData);
      
      // Determine message based on what was updated
      let message = 'Feedback updated successfully';
      if (updateData.rating !== undefined) {
        message = feedback.is_approved 
          ? 'Feedback updated and automatically approved due to high rating!'
          : 'Feedback updated. Rating requires manual approval.';
      }
      
      console.log('✅ Admin feedback update completed');
      
      res.status(200).json({
        message,
        feedback
      });
    } catch (error) {
      console.error('❌ Error in admin feedback update:', error.message);
      next(error);
    }
  }

  // Update user's own feedback (client only)
  async updateUserFeedback(req, res, next) {
    try {
      const { feedbackId } = req.params;
      const { rating, comment } = req.body;
      
      console.log('📝 Updating user feedback:', {
        feedbackId,
        userId: req.user.id,
        rating,
        comment,
        body: req.body
      });
      
      // Validate that at least one field is provided
      if (rating === undefined && comment === undefined) {
        console.log('❌ Validation failed: No fields provided');
        return res.status(400).json({
          error: {
            message: 'At least one field (rating or comment) must be provided',
            code: 'VALIDATION_ERROR'
          }
        });
      }
      
      // Prepare update data with only provided fields
      const updateData = {};
      if (rating !== undefined) updateData.rating = rating;
      if (comment !== undefined) updateData.comment = comment;
      
      console.log('📤 Update data:', updateData);
      
      const feedback = await feedbackService.updateUserFeedback(
        feedbackId,
        req.user.id,
        updateData
      );
      
      console.log('✅ Feedback updated successfully');
      
      // Determine message based on approval status
      const message = feedback.is_approved 
        ? 'Your feedback has been updated and automatically approved!'
        : 'Your feedback has been updated successfully. It will be reviewed by admin.';
      
      res.status(200).json({
        message,
        feedback
      });
    } catch (error) {
      console.error('❌ Error updating feedback:', error.message);
      next(error);
    }
  }

  // Delete feedback (admin only)
  async deleteFeedback(req, res, next) {
    try {
      const { feedbackId } = req.params;
      
      const result = await feedbackService.deleteFeedback(feedbackId);
      
      res.status(200).json({
        message: 'Feedback deleted successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete user's own feedback (client only)
  async deleteUserFeedback(req, res, next) {
    try {
      const { feedbackId } = req.params;
      
      const result = await feedbackService.deleteUserFeedback(feedbackId, req.user.id);
      
      res.status(200).json({
        message: 'Your feedback has been deleted successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user's own feedback (client only)
  async getUserFeedback(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const result = await feedbackService.getUserFeedback(
        req.user.id,
        parseInt(page),
        parseInt(limit)
      );
      
      res.status(200).json({
        message: 'User feedback fetched successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Approve/Reject feedback (admin only)
  async moderateFeedback(req, res, next) {
    try {
      const { feedbackId } = req.params;
      const { isApproved, isHidden = false } = req.body;
      
      const result = await feedbackService.moderateFeedback(
        feedbackId,
        isApproved,
        isHidden
      );
      
      res.status(200).json({
        message: result.message,
        feedback: result.feedback
      });
    } catch (error) {
      next(error);
    }
  }

  // Get feedback statistics (admin only)
  async getFeedbackStats(req, res, next) {
    try {
      const stats = await feedbackService.getFeedbackStats();
      
      res.status(200).json({
        message: 'Feedback statistics fetched successfully',
        stats
      });
    } catch (error) {
      next(error);
    }
  }

  // Get admin feedback statistics (includes all feedback including low ratings)
  async getAdminFeedbackStats(req, res, next) {
    try {
      const stats = await feedbackService.getAdminFeedbackStats();
      
      res.status(200).json({
        message: 'Admin feedback statistics fetched successfully',
        stats
      });
    } catch (error) {
      next(error);
    }
  }

  // Get project feedback (public, but filtered by role)
  async getProjectFeedback(req, res, next) {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const user = req.user;
      let feedback = [];
      let pagination = { page: parseInt(page), limit: parseInt(limit), total: 0, hasMore: false };
      if (user && user.role === 'admin') {
        // Admin: see all feedback
        const result = await feedbackService.getAllProjectFeedbackAdmin(projectId, parseInt(page), parseInt(limit));
        feedback = result.feedback;
        pagination = result.pagination;
      } else if (user) {
        // Logged-in user: see feedback with rating > 2, plus their own feedback
        const result = await feedbackService.getProjectFeedbackWithUser(projectId, user.id, parseInt(page), parseInt(limit));
        feedback = result.feedback;
        pagination = result.pagination;
      } else {
        // Public: only feedback with rating > 2
        const result = await feedbackService.getProjectFeedbackPublic(projectId, parseInt(page), parseInt(limit));
        feedback = result.feedback;
        pagination = result.pagination;
      }
      res.status(200).json({
        message: 'Project feedback fetched successfully',
        feedback,
        pagination
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk moderate feedback (admin only)
  async bulkModerateFeedback(req, res, next) {
    try {
      const { feedbackIds, isApproved, isHidden = false } = req.body;
      
      if (!Array.isArray(feedbackIds) || feedbackIds.length === 0) {
        throw new ValidationError('Feedback IDs array is required');
      }
      
      const results = [];
      for (const feedbackId of feedbackIds) {
        try {
          const result = await feedbackService.moderateFeedback(
            feedbackId,
            isApproved,
            isHidden
          );
          results.push({ feedbackId, success: true, message: result.message });
        } catch (error) {
          results.push({ feedbackId, success: false, message: error.message });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      res.status(200).json({
        message: `Bulk moderation completed. ${successCount} successful, ${failureCount} failed.`,
        results
      });
    } catch (error) {
      next(error);
    }
  }

  // Get feedback summary (public)
  async getFeedbackSummary(req, res, next) {
    try {
      const stats = await feedbackService.getFeedbackStats();
      
      // Return only public stats
      const publicStats = {
        totalFeedback: stats.approvedFeedback,
        averageRating: stats.averageRating,
        ratingDistribution: stats.ratingDistribution
      };
      
      res.status(200).json({
        message: 'Feedback summary fetched successfully',
        summary: publicStats
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FeedbackController(); 