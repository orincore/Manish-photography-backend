const portfolioService = require('../services/portfolioService');
const { supabase } = require('../config');
const { ValidationError } = require('../middlewares/errorHandler');
const s3Service = require('../services/s3Service');

class PortfolioController {
  // Get all published projects (public)
  async getPublishedProjects(req, res, next) {
    try {
      const { page = 1, limit = 10, category, subcategory } = req.query;
      
      const result = await portfolioService.getPublishedProjects(
        parseInt(page),
        parseInt(limit),
        category,
        subcategory
      );
      
      // Fetch images and videos for each project
      const projectsWithMedia = await Promise.all((result.projects || []).map(async (project) => {
        const { data: images, error: imagesError } = await supabase
          .from('portfolio_project_images')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: true });
        if (imagesError) throw imagesError;

        const { data: videos, error: videosError } = await supabase
          .from('portfolio_project_videos')
          .select('*')
          .eq('project_id', project.id)
          .eq('is_active', true)
          .order('order_index', { ascending: true });
        if (videosError) throw videosError;

        return { ...project, images, videos };
      }));
      res.status(200).json({
        message: 'Projects fetched successfully',
        projects: projectsWithMedia,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  // Get featured projects for homepage (public)
  async getFeaturedProjects(req, res, next) {
    try {
      const { limit = 6 } = req.query;
      
      const result = await portfolioService.getFeaturedProjects(parseInt(limit));
      
      res.status(200).json({
        message: 'Featured projects fetched successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all projects (admin only)
  async getAllProjects(req, res, next) {
    try {
      const { page = 1, limit = 10, category, subcategory } = req.query;
      
      const result = await portfolioService.getAllProjects(
        parseInt(page),
        parseInt(limit),
        category,
        subcategory
      );
      
      res.status(200).json({
        message: 'All projects fetched successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get project by ID (public)
  async getProjectById(req, res, next) {
    try {
      const { projectId } = req.params;
      
      const project = await portfolioService.getProjectById(projectId);
      
      // Increment view count
      await portfolioService.incrementViewCount(projectId);
      
      res.status(200).json({
        message: 'Project fetched successfully',
        project
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new project (admin only)
  async createProject(req, res, next) {
    try {
      console.log('Incoming createProject request:');
      console.log('req.body:', req.body);
      console.log('req.files:', req.files);
      const { title, description, category, tags, isPublished, subcategoryId } = req.body;
      const imageFiles = req.files;
      
      if (!imageFiles || imageFiles.length === 0) {
        throw new ValidationError('At least one image file is required');
      }
      if (imageFiles.length > 10) {
        throw new ValidationError('You can upload a maximum of 10 images');
      }

      // Generate a snug from the selected category only
      let generatedSnug = null;
      if (category) {
        generatedSnug = category
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      // Allow user to override snug if provided in the request
      const snug = req.body.snug || generatedSnug;

      const projectData = {
        title,
        description,
        category,
        tags: tags ? JSON.parse(tags) : [],
        isPublished: isPublished === 'true',
        snug
      };

      const project = await portfolioService.createProject(
        projectData,
        imageFiles,
        req.user.id
      );
      
      res.status(201).json({
        message: 'Project created successfully',
        project
      });
    } catch (error) {
      console.error('Error in createProject:', error);
      if (error instanceof SyntaxError) {
        console.error('SyntaxError in tags field:', req.body.tags);
      }
      next(error);
    }
  }

  // Create new project with mixed media (images and/or videos)
  async createProjectWithMedia(req, res, next) {
    try {
      console.log('Incoming createProjectWithMedia request:');
      console.log('req.body:', req.body);
      console.log('req.files:', req.files);
      
      const { title, description, category, tags, isPublished, subcategoryId } = req.body;
      const mediaFiles = req.files;
      
      if (!mediaFiles || mediaFiles.length === 0) {
        throw new ValidationError('At least one media file (image or video) is required');
      }
      if (mediaFiles.length > 10) {
        throw new ValidationError('You can upload a maximum of 10 media files');
      }

      // Separate images and videos
      const imageFiles = mediaFiles.filter(file => file.mimetype.startsWith('image/'));
      const videoFiles = mediaFiles.filter(file => file.mimetype.startsWith('video/'));

      console.log(`Found ${imageFiles.length} images and ${videoFiles.length} videos`);

      // Generate a snug from the selected category only
      let generatedSnug = null;
      if (category) {
        generatedSnug = category
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      // Allow user to override snug if provided in the request
      const snug = req.body.snug || generatedSnug;

      const projectData = {
        title,
        description,
        category,
        tags: tags ? JSON.parse(tags) : [],
        isPublished: isPublished === 'true',
        snug
      };

      // Create project with images first
      const project = await portfolioService.createProject(
        projectData,
        imageFiles,
        req.user.id
      );

      // Upload videos if any
      let uploadedVideos = [];
      if (videoFiles.length > 0) {
        console.log('Uploading videos to project...');
        uploadedVideos = await portfolioService.bulkUploadProjectVideos(
          project.id,
          videoFiles,
          {
            video_autoplay: false,
            video_loop: false,
            order_index: 0
          }
        );
      }
      
      // Get updated project with all media
      const updatedProject = await portfolioService.getProjectById(project.id);
      
      res.status(201).json({
        message: 'Project created successfully with mixed media',
        project: updatedProject,
        uploadedVideos: uploadedVideos
      });
    } catch (error) {
      console.error('Error in createProjectWithMedia:', error);
      if (error instanceof SyntaxError) {
        console.error('SyntaxError in tags field:', req.body.tags);
      }
      next(error);
    }
  }

  // Update project (admin only)
  async updateProject(req, res, next) {
    try {
      const { projectId } = req.params;
      const { title, description, category, tags, isPublished, subcategoryId } = req.body;
      const imageFile = req.file;
      
      const updateData = {
        title,
        description,
        category,
        tags: tags ? JSON.parse(tags) : [],
        isPublished: isPublished === 'true',
        subcategoryId
      };

      const project = await portfolioService.updateProject(
        projectId,
        updateData,
        imageFile
      );
      
      res.status(200).json({
        message: 'Project updated successfully',
        project
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete a project by ID (admin only)
  async deleteProject(req, res, next) {
    try {
      const { projectId } = req.params;
      // Delete associated images from S3 and DB
      const { data: images } = await supabase
        .from('portfolio_project_images')
        .select('image_public_id')
        .eq('project_id', projectId);
      if (images && images.length > 0) {
        for (const img of images) {
          if (img.image_public_id) {
            try { await s3Service.deleteImage(img.image_public_id); } catch (e) { /* ignore */ }
          }
        }
      }
      await supabase.from('portfolio_project_images').delete().eq('project_id', projectId);
      // Delete the project itself
      const { error } = await supabase.from('portfolio_projects').delete().eq('id', projectId);
      if (error) throw error;
      res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Delete a specific image from a project (admin only)
  async deleteProjectImage(req, res, next) {
    try {
      const { projectId, imageId } = req.params;
      // Fetch the image record
      const { data: image, error: imageError } = await supabase
        .from('portfolio_project_images')
        .select('*')
        .eq('id', imageId)
        .eq('project_id', projectId)
        .single();
      if (imageError || !image) {
        return res.status(404).json({ message: 'Image not found for this project' });
      }
      // Delete from S3
      if (image.image_public_id) {
        try { await s3Service.deleteImage(image.image_public_id); } catch (e) { /* ignore */ }
      }
      // Delete from DB
      const { error: dbError } = await supabase
        .from('portfolio_project_images')
        .delete()
        .eq('id', imageId)
        .eq('project_id', projectId);
      if (dbError) throw dbError;
      // If this was the main image for the project, update project to use another image or clear
      const { data: project } = await supabase
        .from('portfolio_projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (project && (project.image_public_id === image.image_public_id)) {
        // Find another image for this project
        const { data: otherImages } = await supabase
          .from('portfolio_project_images')
          .select('*')
          .eq('project_id', projectId)
          .limit(1);
        if (otherImages && otherImages.length > 0) {
          await supabase
            .from('portfolio_projects')
            .update({
              image_url: otherImages[0].image_url,
              image_public_id: otherImages[0].image_public_id,
              thumbnail_url: otherImages[0].thumbnail_url
            })
            .eq('id', projectId);
        } else {
          // No images left, clear main image fields
          await supabase
            .from('portfolio_projects')
            .update({
              image_url: null,
              image_public_id: null,
              thumbnail_url: null
            })
            .eq('id', projectId);
        }
      }
      res.status(200).json({ message: 'Image deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Get all categories (public)
  async getCategories(req, res, next) {
    try {
      const projects = await portfolioService.getCategories();
      
      res.status(200).json({
        message: 'Projects fetched successfully',
        projects: projects || [],
        total: projects ? projects.length : 0
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      next(error);
    }
  }

  // Get category by slug (public)
  async getCategoryBySlug(req, res, next) {
    try {
      const { categorySlug } = req.params;
      
      const category = await portfolioService.getCategoryBySlug(categorySlug);
      
      if (!category) {
        return res.status(404).json({
          message: 'Category not found or no images available'
        });
      }
      
      res.status(200).json({
        message: 'Category fetched successfully',
        category
      });
    } catch (error) {
      next(error);
    }
  }

  // Get subcategory by slug (public)
  async getSubcategoryBySlug(req, res, next) {
    try {
      const { categorySlug, subcategorySlug } = req.params;
      
      const subcategory = await portfolioService.getSubcategoryBySlug(categorySlug, subcategorySlug);
      
      res.status(200).json({
        message: 'Subcategory fetched successfully',
        subcategory
      });
    } catch (error) {
      next(error);
    }
  }

  // Create category (admin only)
  async createCategory(req, res, next) {
    try {
      const { name, slug, description, displayOrder } = req.body;
      
      const categoryData = {
        name,
        slug,
        description,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0
      };

      const category = await portfolioService.createCategory(categoryData);
      
      res.status(201).json({
        message: 'Category created successfully',
        category
      });
    } catch (error) {
      console.error('Error creating category:', error);
      next(error);
    }
  }

  // Create subcategory (admin only)
  async createSubcategory(req, res, next) {
    try {
      const { categoryId, name, slug, description, clientName, eventDate, location, displayOrder } = req.body;
      const imageFile = req.file;
      
      const subcategoryData = {
        categoryId,
        name,
        slug,
        description,
        clientName,
        eventDate,
        location,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0
      };

      const subcategory = await portfolioService.createSubcategory(subcategoryData, imageFile);
      
      res.status(201).json({
        message: 'Subcategory created successfully',
        subcategory
      });
    } catch (error) {
      next(error);
    }
  }

  // Update category (admin only)
  async updateCategory(req, res, next) {
    try {
      const { categoryId } = req.params;
      const { name, slug, description, displayOrder, isActive } = req.body;
      
      const updateData = {
        name,
        slug,
        description,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0,
        isActive: isActive !== undefined ? isActive : true
      };

      const category = await portfolioService.updateCategory(categoryId, updateData);
      
      res.status(200).json({
        message: 'Category updated successfully',
        category
      });
    } catch (error) {
      next(error);
    }
  }

  // Update subcategory (admin only)
  async updateSubcategory(req, res, next) {
    try {
      const { subcategoryId } = req.params;
      const { name, slug, description, clientName, eventDate, location, displayOrder, isActive } = req.body;
      const imageFile = req.file;
      
      const updateData = {
        name,
        slug,
        description,
        clientName,
        eventDate,
        location,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0,
        isActive: isActive !== undefined ? isActive : true
      };

      const subcategory = await portfolioService.updateSubcategory(subcategoryId, updateData, imageFile);
      
      res.status(200).json({
        message: 'Subcategory updated successfully',
        subcategory
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete a category by slug (admin only)
  async deleteCategoryBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      // Delete the category (will cascade if FK is set)
      const { error } = await supabase.from('portfolio_categories').delete().eq('slug', slug);
      if (error) throw error;
      res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Delete subcategory (admin only)
  async deleteSubcategory(req, res, next) {
    try {
      const { subcategoryId } = req.params;
      
      const result = await portfolioService.deleteSubcategory(subcategoryId);
      
      res.status(200).json({
        message: 'Subcategory deleted successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Search projects (public)
  async searchProjects(req, res, next) {
    try {
      const { query, page = 1, limit = 10 } = req.query;
      
      if (!query) {
        throw new ValidationError('Search query is required');
      }
      
      const result = await portfolioService.searchProjects(
        query,
        parseInt(page),
        parseInt(limit)
      );
      
      res.status(200).json({
        message: 'Search completed successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get projects by tags (public)
  async getProjectsByTags(req, res, next) {
    try {
      const { tags, page = 1, limit = 10 } = req.query;
      
      if (!tags) {
        throw new ValidationError('Tags are required');
      }
      
      const tagsArray = Array.isArray(tags) ? tags : [tags];
      
      const result = await portfolioService.getProjectsByTags(
        tagsArray,
        parseInt(page),
        parseInt(limit)
      );
      
      res.status(200).json({
        message: 'Projects fetched by tags successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Toggle project publish status (admin only)
  async togglePublishStatus(req, res, next) {
    try {
      const { projectId } = req.params;
      const { isPublished } = req.body;
      
      const project = await portfolioService.updateProject(projectId, {
        isPublished: isPublished
      });
      
      res.status(200).json({
        message: `Project ${isPublished ? 'published' : 'unpublished'} successfully`,
        project
      });
    } catch (error) {
      next(error);
    }
  }

  // Get project statistics (admin only)
  async getProjectStats(req, res, next) {
    try {
      const { data: stats, error } = await supabase
        .from('admin_stats')
        .select('*')
        .single();

      if (error) throw error;
      
      res.status(200).json({
        message: 'Project statistics fetched successfully',
        stats
      });
    } catch (error) {
      next(error);
    }
  }

  // Get categories with at least one project (public, for client)
  async getCategoriesWithProjects(req, res, next) {
    try {
      const categories = await portfolioService.getCategories();
      // Filter categories: only those with at least one subcategory with project_count > 0
      const filtered = categories.filter(cat =>
        cat.portfolio_subcategories && cat.portfolio_subcategories.some(
          sub => {
            if (Array.isArray(sub.project_count)) {
              return (sub.project_count[0]?.count || 0) > 0;
            }
            return sub.project_count > 0;
          })
      );
      res.status(200).json({
        message: 'Categories with projects fetched successfully',
        categories: filtered
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all projects for a snug (public, now mapped to snug in portfolio_projects)
  async getProjectsBySubcategorySlug(req, res, next) {
    try {
      const { subcategorySlug } = req.params;
      // Fetch all projects for this snug
      const { data: projects, error: projectsError } = await supabase
        .from('portfolio_projects')
        .select('*')
        .eq('snug', subcategorySlug)
        .eq('is_published', true);
      if (projectsError) throw projectsError;
      if (!projects || projects.length === 0) {
        return res.status(404).json({ message: 'No projects found for this slug' });
      }
      // Fetch images and videos for each project
      const projectsWithMedia = await Promise.all(projects.map(async (project) => {
        const { data: images, error: imagesError } = await supabase
          .from('portfolio_project_images')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: true });
        if (imagesError) throw imagesError;

        const { data: videos, error: videosError } = await supabase
          .from('portfolio_project_videos')
          .select('*')
          .eq('project_id', project.id)
          .eq('is_active', true)
          .order('order_index', { ascending: true });
        if (videosError) throw videosError;

        return { ...project, images, videos };
      }));
      res.status(200).json({
        message: 'Projects fetched successfully',
        snug: subcategorySlug,
        projects: projectsWithMedia
      });
    } catch (error) {
      next(error);
    }
  }

  // Upload video to project (admin only)
  async uploadProjectVideo(req, res, next) {
    try {
      const { projectId } = req.params;
      const videoFile = req.file;
      const { 
        video_autoplay, 
        video_loop, 
        video_poster, 
        order_index 
      } = req.body;

      if (!videoFile) {
        throw new ValidationError('Video file is required');
      }

      const videoData = {
        video_autoplay: video_autoplay === 'true',
        video_loop: video_loop === 'true',
        video_poster: video_poster || null,
        order_index: order_index ? parseInt(order_index) : 0
      };

      const video = await portfolioService.uploadProjectVideo(projectId, videoFile, videoData);
      
      res.status(201).json({
        message: 'Video uploaded successfully',
        video
      });
    } catch (error) {
      next(error);
    }
  }

  // Get project videos (public)
  async getProjectVideos(req, res, next) {
    try {
      const { projectId } = req.params;
      
      const videos = await portfolioService.getProjectVideos(projectId);
      
      res.status(200).json({
        message: 'Project videos fetched successfully',
        videos
      });
    } catch (error) {
      next(error);
    }
  }

  // Update project video (admin only)
  async updateProjectVideo(req, res, next) {
    try {
      const { videoId } = req.params;
      const updateData = req.body;

      const video = await portfolioService.updateProjectVideo(videoId, updateData);
      
      res.status(200).json({
        message: 'Video updated successfully',
        video
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete project video (admin only)
  async deleteProjectVideo(req, res, next) {
    try {
      const { videoId } = req.params;
      
      await portfolioService.deleteProjectVideo(videoId);
      
      res.status(200).json({
        message: 'Video deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Reorder project videos (admin only)
  async reorderProjectVideos(req, res, next) {
    try {
      const { projectId } = req.params;
      const { videoIds } = req.body;

      if (!Array.isArray(videoIds)) {
        throw new ValidationError('videoIds must be an array');
      }

      await portfolioService.reorderProjectVideos(projectId, videoIds);
      
      res.status(200).json({
        message: 'Videos reordered successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk upload videos to project (admin only)
  async bulkUploadProjectVideos(req, res, next) {
    try {
      const { projectId } = req.params;
      const videoFiles = req.files;
      const { 
        video_autoplay, 
        video_loop, 
        video_poster, 
        order_index 
      } = req.body;

      if (!videoFiles || videoFiles.length === 0) {
        throw new ValidationError('At least one video file is required');
      }

      if (videoFiles.length > 10) {
        throw new ValidationError('You can upload a maximum of 10 videos');
      }

      const videoData = {
        video_autoplay: video_autoplay === 'true',
        video_loop: video_loop === 'true',
        video_poster: video_poster || null,
        order_index: order_index ? parseInt(order_index) : 0
      };

      const videos = await portfolioService.bulkUploadProjectVideos(projectId, videoFiles, videoData);
      
      res.status(201).json({
        message: 'Videos uploaded successfully',
        videos
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllCategories(req, res, next) {
    try {
      const categories = await portfolioService.getAllCategories();
      res.status(200).json({
        message: 'All categories fetched successfully',
        categories: categories || [],
        total: categories ? categories.length : 0
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllCategoriesWithProjects(req, res, next) {
    try {
      const categories = await portfolioService.getAllCategoriesWithProjects();
      res.status(200).json({
        message: 'Categories with projects fetched successfully',
        categories: categories || [],
        total: categories ? categories.length : 0
      });
    } catch (error) {
      next(error);
    }
  }

  async getPackages(req, res, next) {
    try {
      const pkgs = await portfolioService.getPackages();
      res.status(200).json({ message: 'Packages fetched successfully', packages: pkgs, total: pkgs.length });
    } catch (error) { next(error); }
  }

  async getPackageById(req, res, next) {
    try {
      const { id } = req.params;
      const pkg = await portfolioService.getPackageById(id);
      res.status(200).json({ message: 'Package fetched successfully', package: pkg });
    } catch (error) { next(error); }
  }

  async updatePackage(req, res, next) {
    try {
      const { id } = req.params;
      const { name, color, features, note, display_order } = req.body;
      let featuresArr = features;
      if (typeof features === 'string') {
        try { featuresArr = JSON.parse(features); } catch { featuresArr = features.split(',').map(f => f.trim()); }
      }
      const pkg = await portfolioService.updatePackage(id, { name, color, features: featuresArr, note, display_order });
      res.status(200).json({ message: 'Package updated successfully', package: pkg });
    } catch (error) { next(error); }
  }

  async deletePackage(req, res, next) {
    try {
      const { id } = req.params;
      const result = await portfolioService.deletePackage(id);
      res.status(200).json(result);
    } catch (error) { next(error); }
  }

  async createPackage(req, res, next) {
    try {
      const { name, color, features, note, display_order } = req.body;
      let featuresArr = features;
      if (typeof features === 'string') {
        try { featuresArr = JSON.parse(features); } catch { featuresArr = features.split(',').map(f => f.trim()); }
      }
      const pkg = await portfolioService.createPackage({ name, color, features: featuresArr, note, display_order });
      res.status(201).json({ message: 'Package created successfully', package: pkg });
    } catch (error) { next(error); }
  }
}

module.exports = new PortfolioController(); 