const instagramService = require('../services/instagramService');
const { ValidationError } = require('../middlewares/errorHandler');

class InstagramController {
  // Get Instagram user profile
  async getUserProfile(req, res, next) {
    try {
      const profile = await instagramService.getUserProfile();
      
      res.status(200).json({
        message: 'Instagram profile fetched successfully',
        profile
      });
    } catch (error) {
      next(error);
    }
  }

  // Get Instagram posts with pagination
  async getPosts(req, res, next) {
    try {
      const { limit = 12, after } = req.query;
      
      const result = await instagramService.getPosts(parseInt(limit), after);
      
      res.status(200).json({
        message: 'Instagram posts fetched successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get a specific Instagram post by ID
  async getPostById(req, res, next) {
    try {
      const { postId } = req.params;
      
      if (!postId) {
        throw new ValidationError('Post ID is required');
      }
      
      const post = await instagramService.getPostById(postId);
      
      res.status(200).json({
        message: 'Instagram post fetched successfully',
        post
      });
    } catch (error) {
      next(error);
    }
  }

  // Get Instagram posts by media type
  async getPostsByType(req, res, next) {
    try {
      const { mediaType, limit = 12 } = req.query;
      
      if (!mediaType) {
        throw new ValidationError('Media type is required (IMAGE, VIDEO, CAROUSEL_ALBUM)');
      }
      
      const validTypes = ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'];
      if (!validTypes.includes(mediaType)) {
        throw new ValidationError('Invalid media type. Must be one of: IMAGE, VIDEO, CAROUSEL_ALBUM');
      }
      
      const result = await instagramService.getPostsByType(mediaType, parseInt(limit));
      
      res.status(200).json({
        message: `Instagram ${mediaType.toLowerCase()} posts fetched successfully`,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get Instagram post insights (admin only)
  async getPostInsights(req, res, next) {
    try {
      const { postId } = req.params;
      
      if (!postId) {
        throw new ValidationError('Post ID is required');
      }
      
      const insights = await instagramService.getPostInsights(postId);
      
      res.status(200).json({
        message: 'Instagram post insights fetched successfully',
        insights
      });
    } catch (error) {
      next(error);
    }
  }

  // Refresh Instagram access token (admin only)
  async refreshToken(req, res, next) {
    try {
      const result = await instagramService.refreshToken();
      
      res.status(200).json({
        message: 'Instagram token refreshed successfully',
        result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get Instagram stories
  async getStories(req, res, next) {
    try {
      const result = await instagramService.getStories();
      
      res.status(200).json({
        message: 'Instagram stories fetched successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get Instagram feed for homepage (latest posts)
  async getHomepageFeed(req, res, next) {
    try {
      const { limit = 6 } = req.query;
      
      const result = await instagramService.getPosts(parseInt(limit));
      
      res.status(200).json({
        message: 'Instagram homepage feed fetched successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get Instagram posts with search/filter
  async searchPosts(req, res, next) {
    try {
      const { query, limit = 12, after } = req.query;
      
      if (!query) {
        throw new ValidationError('Search query is required');
      }
      
      const result = await instagramService.getPosts(parseInt(limit), after);
      
      // Filter posts by caption content
      const filteredPosts = result.posts.filter(post => 
        post.caption && post.caption.toLowerCase().includes(query.toLowerCase())
      );
      
      res.status(200).json({
        message: 'Instagram posts search completed successfully',
        posts: filteredPosts,
        total: filteredPosts.length,
        query
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InstagramController(); 