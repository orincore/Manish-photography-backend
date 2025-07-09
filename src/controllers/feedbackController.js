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
      
      const feedback = await feedbackService.createFeedback(
        { rating, comment, projectId },
        req.user.id
      );
      
      res.status(201).json({
        message: 'Feedback submitted successfully. It will be reviewed by admin.',
        feedback
      });
    } catch (error) {
      // Handle existing feedback error
      if (error.name === 'ValidationError' && error.details?.code === 'FEEDBACK_EXISTS') {
        return res.status(409).json({
          error: {
            message: error.message,
            code: 'FEEDBACK_EXISTS',
            existingFeedback: error.details.existingFeedback,
            options: {
              edit: `PUT /api/feedback/${error.details.existingFeedback.id}`,
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
      
      const feedback = await feedbackService.updateFeedback(feedbackId, updateData);
      
      res.status(200).json({
        message: 'Feedback updated successfully',
        feedback
      });
    } catch (error) {
      next(error);
    }
  }

  // Update user's own feedback (client only)
  async updateUserFeedback(req, res, next) {
    try {
      const { feedbackId } = req.params;
      const { rating, comment } = req.body;
      
      const feedback = await feedbackService.updateUserFeedback(
        feedbackId,
        req.user.id,
        { rating, comment }
      );
      
      res.status(200).json({
        message: 'Your feedback has been updated successfully. It will be reviewed by admin.',
        feedback
      });
    } catch (error) {
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