const axios = require('axios');
const { ValidationError } = require('../middlewares/errorHandler');

class InstagramService {
  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    this.userId = process.env.INSTAGRAM_USER_ID;
    this.baseUrl = 'https://graph.instagram.com/v12.0';
  }

  // Get Instagram user profile
  async getUserProfile() {
    try {
      if (!this.accessToken || !this.userId) {
        // Return mock data when credentials are not configured
        return {
          id: 'mock_user_id',
          username: 'your_instagram_username',
          account_type: 'BUSINESS',
          media_count: 0,
          message: 'Instagram credentials not configured. Please set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID in your .env file.'
        };
      }

      const response = await axios.get(`${this.baseUrl}/${this.userId}`, {
        params: {
          fields: 'id,username,account_type,media_count',
          access_token: this.accessToken
        }
      });

      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        throw new ValidationError(`Instagram API Error: ${error.response.data.error.message}`);
      }
      throw new Error('Failed to fetch Instagram profile: ' + error.message);
    }
  }

  // Get Instagram posts with pagination
  async getPosts(limit = 12, after = null) {
    try {
      if (!this.accessToken || !this.userId) {
        // Return mock data when credentials are not configured
        return {
          posts: [
            {
              id: 'mock_post_1',
              caption: 'Beautiful sunset photography! 🌅 #photography #sunset #nature',
              media_type: 'IMAGE',
              media_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=500&fit=crop',
              thumbnail_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop',
              permalink: 'https://instagram.com/p/mock_post_1',
              timestamp: new Date().toISOString(),
              like_count: 150,
              comments_count: 25
            },
            {
              id: 'mock_post_2',
              caption: 'Portrait session in natural light 📸 #portrait #photography #natural',
              media_type: 'IMAGE',
              media_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&h=500&fit=crop',
              thumbnail_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop',
              permalink: 'https://instagram.com/p/mock_post_2',
              timestamp: new Date(Date.now() - 86400000).toISOString(),
              like_count: 89,
              comments_count: 12
            },
            {
              id: 'mock_post_3',
              caption: 'Wedding photography magic 💒 #wedding #photography #love',
              media_type: 'IMAGE',
              media_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=500&h=500&fit=crop',
              thumbnail_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=300&h=300&fit=crop',
              permalink: 'https://instagram.com/p/mock_post_3',
              timestamp: new Date(Date.now() - 172800000).toISOString(),
              like_count: 234,
              comments_count: 45
            }
          ].slice(0, limit),
          paging: {},
          total: 3,
          message: 'Instagram credentials not configured. Please set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID in your .env file.'
        };
      }

      const params = {
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
        access_token: this.accessToken,
        limit: limit
      };

      if (after) {
        params.after = after;
      }

      const response = await axios.get(`${this.baseUrl}/${this.userId}/media`, {
        params
      });

      return {
        posts: response.data.data || [],
        paging: response.data.paging || {},
        total: response.data.data ? response.data.data.length : 0
      };
    } catch (error) {
      if (error.response?.data?.error) {
        throw new ValidationError(`Instagram API Error: ${error.response.data.error.message}`);
      }
      throw new Error('Failed to fetch Instagram posts: ' + error.message);
    }
  }

  // Get a specific Instagram post by ID
  async getPostById(postId) {
    try {
      if (!this.accessToken) {
        // Return mock data when credentials are not configured
        return {
          id: postId,
          caption: 'Beautiful photography work! 📸 #photography #art #creative',
          media_type: 'IMAGE',
          media_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=500&fit=crop',
          thumbnail_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop',
          permalink: `https://instagram.com/p/${postId}`,
          timestamp: new Date().toISOString(),
          like_count: 150,
          comments_count: 25,
          message: 'Instagram credentials not configured. Please set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID in your .env file.'
        };
      }

      const response = await axios.get(`${this.baseUrl}/${postId}`, {
        params: {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
          access_token: this.accessToken
        }
      });

      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        throw new ValidationError(`Instagram API Error: ${error.response.data.error.message}`);
      }
      throw new Error('Failed to fetch Instagram post: ' + error.message);
    }
  }

  // Get Instagram posts by media type (IMAGE, VIDEO, CAROUSEL_ALBUM)
  async getPostsByType(mediaType, limit = 12) {
    try {
      if (!this.accessToken || !this.userId) {
        throw new ValidationError('Instagram credentials not configured');
      }

      const response = await axios.get(`${this.baseUrl}/${this.userId}/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
          access_token: this.accessToken,
          limit: limit
        }
      });

      const posts = response.data.data || [];
      const filteredPosts = posts.filter(post => post.media_type === mediaType);

      return {
        posts: filteredPosts,
        total: filteredPosts.length
      };
    } catch (error) {
      if (error.response?.data?.error) {
        throw new ValidationError(`Instagram API Error: ${error.response.data.error.message}`);
      }
      throw new Error('Failed to fetch Instagram posts by type: ' + error.message);
    }
  }

  // Get Instagram insights for a specific post (requires business account)
  async getPostInsights(postId) {
    try {
      if (!this.accessToken) {
        throw new ValidationError('Instagram credentials not configured');
      }

      const response = await axios.get(`${this.baseUrl}/${postId}/insights`, {
        params: {
          metric: 'impressions,reach,engagement,saved',
          access_token: this.accessToken
        }
      });

      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        throw new ValidationError(`Instagram API Error: ${error.response.data.error.message}`);
      }
      throw new Error('Failed to fetch Instagram post insights: ' + error.message);
    }
  }

  // Refresh Instagram access token
  async refreshToken() {
    try {
      if (!this.accessToken) {
        throw new ValidationError('Instagram access token not configured');
      }

      const response = await axios.get(`${this.baseUrl}/refresh_access_token`, {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: this.accessToken
        }
      });

      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        throw new ValidationError(`Instagram API Error: ${error.response.data.error.message}`);
      }
      throw new Error('Failed to refresh Instagram token: ' + error.message);
    }
  }

  // Get Instagram stories (requires business account)
  async getStories() {
    try {
      if (!this.accessToken || !this.userId) {
        throw new ValidationError('Instagram credentials not configured');
      }

      const response = await axios.get(`${this.baseUrl}/${this.userId}/stories`, {
        params: {
          fields: 'id,media_type,media_url,permalink,timestamp',
          access_token: this.accessToken
        }
      });

      return {
        stories: response.data.data || [],
        total: response.data.data ? response.data.data.length : 0
      };
    } catch (error) {
      if (error.response?.data?.error) {
        throw new ValidationError(`Instagram API Error: ${error.response.data.error.message}`);
      }
      throw new Error('Failed to fetch Instagram stories: ' + error.message);
    }
  }
}

module.exports = new InstagramService(); 