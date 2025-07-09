const homepageService = require('../services/homepageService');
const { ValidationError } = require('../middlewares/errorHandler');
const multer = require('multer');

class HomepageController {
  // Get all homepage elements with filtering and pagination
  async getHomepageElements(req, res, next) {
    try {
      const { page = 1, limit = 10, type, is_active, is_featured, search } = req.query;
      
      const filters = {};
      if (type) filters.type = type;
      if (is_active !== undefined) filters.is_active = is_active === 'true';
      if (is_featured !== undefined) filters.is_featured = is_featured === 'true';
      if (search) filters.search = search;
      
      const result = await homepageService.getHomepageElements(
        parseInt(page),
        parseInt(limit),
        filters
      );
      
      res.status(200).json({
        message: 'Homepage elements fetched successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get homepage element by ID
  async getHomepageElementById(req, res, next) {
    try {
      const { id } = req.params;
      
      const element = await homepageService.getHomepageElementById(id);
      
      res.status(200).json({
        message: 'Homepage element fetched successfully',
        element
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new homepage element
  async createHomepageElement(req, res, next) {
    try {
      const { type, title, subtitle, description, order_index, is_active, is_featured } = req.body;
      const mediaFile = req.file;
      
      const element = await homepageService.createHomepageElement(
        { type, title, subtitle, description, order_index, is_active, is_featured },
        req.user.id,
        mediaFile
      );
      
      res.status(201).json({
        message: 'Homepage element created successfully',
        element
      });
    } catch (error) {
      next(error);
    }
  }

  // Update homepage element
  async updateHomepageElement(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const element = await homepageService.updateHomepageElement(id, updateData);
      
      res.status(200).json({
        message: 'Homepage element updated successfully',
        element
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete homepage element
  async deleteHomepageElement(req, res, next) {
    try {
      const { id } = req.params;
      
      const result = await homepageService.deleteHomepageElement(id);
      
      res.status(200).json({
        message: 'Homepage element deleted successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get elements by type
  async getElementsByType(req, res, next) {
    try {
      const { type } = req.params;
      const { active_only = 'true' } = req.query;
      
      const elements = await homepageService.getElementsByType(type, active_only === 'true');
      
      res.status(200).json({
        message: `${type} elements fetched successfully`,
        elements
      });
    } catch (error) {
      next(error);
    }
  }

  // Get active hero elements
  async getActiveHeroElements(req, res, next) {
    try {
      const elements = await homepageService.getActiveHeroElements();
      
      res.status(200).json({
        message: 'Active hero elements fetched successfully',
        elements
      });
    } catch (error) {
      next(error);
    }
  }

  // Get active hero videos
  async getActiveHeroVideos(req, res, next) {
    try {
      const elements = await homepageService.getActiveHeroVideos();
      
      res.status(200).json({
        message: 'Active hero videos fetched successfully',
        elements
      });
    } catch (error) {
      next(error);
    }
  }

  // Get featured images
  async getFeaturedImages(req, res, next) {
    try {
      const elements = await homepageService.getFeaturedImages();
      
      res.status(200).json({
        message: 'Featured images fetched successfully',
        elements
      });
    } catch (error) {
      next(error);
    }
  }

  // Get Instagram images
  async getInstagramImages(req, res, next) {
    try {
      const elements = await homepageService.getInstagramImages();
      
      res.status(200).json({
        message: 'Instagram images fetched successfully',
        elements
      });
    } catch (error) {
      next(error);
    }
  }

  // Get homepage preview
  async getHomepagePreview(req, res, next) {
    try {
      const preview = await homepageService.getHomepagePreview();
      
      res.status(200).json({
        message: 'Homepage preview fetched successfully',
        ...preview
      });
    } catch (error) {
      next(error);
    }
  }

  // Toggle element active status
  async toggleElementActive(req, res, next) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      
      if (typeof is_active !== 'boolean') {
        throw new ValidationError('is_active must be a boolean value');
      }
      
      const element = await homepageService.toggleElementActive(id, is_active);
      
      res.status(200).json({
        message: `Element ${is_active ? 'activated' : 'deactivated'} successfully`,
        element
      });
    } catch (error) {
      next(error);
    }
  }

  // Reorder elements
  async reorderElements(req, res, next) {
    try {
      const { element_ids } = req.body;
      
      if (!Array.isArray(element_ids) || element_ids.length === 0) {
        throw new ValidationError('element_ids must be a non-empty array');
      }
      
      const result = await homepageService.reorderElements(element_ids);
      
      res.status(200).json({
        message: 'Elements reordered successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Update element media
  async updateElementMedia(req, res, next) {
    try {
      const { id } = req.params;
      const mediaFile = req.file;
      
      if (!mediaFile) {
        throw new ValidationError('Media file is required');
      }
      
      const element = await homepageService.updateElementMedia(id, mediaFile);
      
      res.status(200).json({
        message: 'Element media updated successfully',
        element
      });
    } catch (error) {
      next(error);
    }
  }

  // Get homepage statistics
  async getHomepageStats(req, res, next) {
    try {
      const stats = await homepageService.getHomepageStats();
      
      res.status(200).json({
        message: 'Homepage statistics fetched successfully',
        stats
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk upload elements
  async bulkUploadElements(req, res, next) {
    try {
      const { type, is_active, is_featured } = req.body;
      const files = req.files;
      
      if (!type) {
        throw new ValidationError('Type is required');
      }
      
      if (!files || files.length === 0) {
        throw new ValidationError('At least one file is required');
      }
      
      const elements = await homepageService.bulkUploadElements(
        files,
        type,
        is_active === 'true',
        is_featured === 'true',
        req.user.id
      );
      
      res.status(201).json({
        message: `${elements.length} elements uploaded successfully`,
        elements
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HomepageController(); 