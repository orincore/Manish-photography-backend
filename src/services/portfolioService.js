const { supabase } = require('../config');
const cloudinaryService = require('./cloudinaryService');
const { ValidationError, NotFoundError } = require('../middlewares/errorHandler');
const sharp = require('sharp');

class PortfolioService {
  // Get all published portfolio projects with pagination
  async getPublishedProjects(page = 1, limit = 10, category = null, subcategory = null) {
    try {
      let query = supabase
        .from('portfolio_projects')
        .select(`
          *,
          portfolio_subcategories(
            id,
            name,
            slug,
            client_name,
            portfolio_categories(
              id,
              name,
              slug
            )
          )
        `)
        // .eq('is_published', true) // Removed to fetch all projects
        .order('created_at', { ascending: false });

      // Filter by category if provided
      if (category) {
        query = query.eq('portfolio_subcategories.portfolio_categories.slug', category);
      }

      // Filter by subcategory if provided
      if (subcategory) {
        query = query.eq('portfolio_subcategories.slug', subcategory);
      }

      // Add pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: projects, error, count } = await query;

      if (error) throw error;

      // Map projects to include subcategory_slug and category_slug for easier frontend use
      const mappedProjects = (projects || []).map(project => ({
        ...project,
        subcategory_slug: project.portfolio_subcategories?.slug || null,
        category_slug: project.portfolio_subcategories?.portfolio_categories?.slug || null
      }));

      return {
        projects: mappedProjects,
        pagination: {
          page,
          limit,
          total: count || (projects ? projects.length : 0),
          hasMore: projects && projects.length === limit
        }
      };
    } catch (error) {
      throw new Error('Failed to fetch portfolio projects: ' + error.message);
    }
  }

  // Get featured projects for homepage
  async getFeaturedProjects(limit = 6) {
    try {
      const { data: projects, error } = await supabase
        .from('portfolio_projects')
        .select(`
          *,
          portfolio_subcategories(
            id,
            name,
            slug,
            client_name,
            portfolio_categories(
              id,
              name,
              slug
            )
          )
        `)
        .eq('is_published', true)
        .contains('tags', ['featured'])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        projects: projects || [],
        total: projects ? projects.length : 0
      };
    } catch (error) {
      throw new Error('Failed to fetch featured projects: ' + error.message);
    }
  }

  // Get all projects (admin only)
  async getAllProjects(page = 1, limit = 10, category = null, subcategory = null) {
    try {
      let query = supabase
        .from('portfolio_projects')
        .select(`
          *,
          portfolio_subcategories(
            id,
            name,
            slug,
            client_name,
            portfolio_categories(
              id,
              name,
              slug
            )
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by category if provided
      if (category) {
        query = query.eq('portfolio_subcategories.portfolio_categories.slug', category);
      }

      // Filter by subcategory if provided
      if (subcategory) {
        query = query.eq('portfolio_subcategories.slug', subcategory);
      }

      // Add pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: projects, error, count } = await query;

      if (error) throw error;

      return {
        projects,
        pagination: {
          page,
          limit,
          total: count || projects.length,
          hasMore: projects.length === limit
        }
      };
    } catch (error) {
      throw new Error('Failed to fetch all projects: ' + error.message);
    }
  }

  // Get project by ID
  async getProjectById(projectId) {
    try {
      const { data: project, error } = await supabase
        .from('portfolio_projects')
        .select(`
          *,
          portfolio_subcategories(
            id,
            name,
            slug,
            client_name,
            event_date,
            location,
            portfolio_categories(
              id,
            name,
            slug
            )
          )
        `)
        .eq('id', projectId)
        .single();

      if (error || !project) {
        throw new NotFoundError('Project not found');
      }

      // Fetch all images for this project
      const { data: images, error: imagesError } = await supabase
        .from('portfolio_project_images')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (imagesError) throw imagesError;

      // Fetch all videos for this project
      const { data: videos, error: videosError } = await supabase
        .from('portfolio_project_videos')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      if (videosError) throw videosError;

      return { ...project, images, videos };
    } catch (error) {
      if (error.name === 'NotFoundError') throw error;
      throw new Error('Failed to fetch project: ' + error.message);
    }
  }

  // Create new portfolio project
  async createProject(projectData, imageFiles, adminId) {
    try {
      let subcategoryIdToUse = projectData.subcategoryId;

      // If subcategoryId is not provided, fetch the first available active subcategory
      if (!subcategoryIdToUse) {
        const { data: subcategory, error: subcategoryError } = await supabase
          .from('portfolio_subcategories')
          .select('id')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .limit(1)
          .single();
        
        if (subcategory && subcategory.id) {
          subcategoryIdToUse = subcategory.id;
        } else {
          // No subcategories exist, create one automatically
          console.log('No subcategories found, creating one automatically...');
          
          // First, get or create a default category
          let categoryId;
          const { data: existingCategory, error: categoryError } = await supabase
            .from('portfolio_categories')
            .select('id')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .limit(1)
            .single();
          
          if (existingCategory && existingCategory.id) {
            categoryId = existingCategory.id;
          } else {
            // Create a default category if none exists
            const { data: newCategory, error: createCategoryError } = await supabase
              .from('portfolio_categories')
              .insert({
                name: 'General Portfolio',
                slug: 'general-portfolio',
                description: 'General photography portfolio',
                display_order: 1
              })
              .select('id')
              .single();
            
            if (createCategoryError) {
              throw new Error('Failed to create default category: ' + createCategoryError.message);
            }
            categoryId = newCategory.id;
          }
          
          // Create a default subcategory
          const subcategoryName = projectData.title ? projectData.title : `Project ${new Date().toISOString().split('T')[0]}`;
          const subcategorySlug = projectData.generatedSubcategorySlug || `project-${Date.now()}`;
          const { data: newSubcategory, error: createSubcategoryError } = await supabase
            .from('portfolio_subcategories')
            .insert({
              category_id: categoryId,
              name: subcategoryName,
              slug: subcategorySlug,
              description: `Auto-generated subcategory for ${projectData.title}`,
              client_name: 'Auto-generated',
              display_order: 1
            })
            .select('id')
            .single();
          
          if (createSubcategoryError) {
            throw new Error('Failed to create default subcategory: ' + createSubcategoryError.message);
          }
          
          subcategoryIdToUse = newSubcategory.id;
          console.log(`Created auto subcategory: ${subcategoryName} with ID: ${subcategoryIdToUse}`);
        }
      } else {
        // Validate subcategoryId if provided
        const { data: subcategory, error: subcategoryError } = await supabase
          .from('portfolio_subcategories')
          .select('id')
          .eq('id', subcategoryIdToUse)
          .single();
        if (subcategoryError || !subcategory) {
          throw new Error(`Subcategory with ID ${subcategoryIdToUse} does not exist`);
        }
      }

      // Create project in database (without subcategory logic)
      const { data: project, error } = await supabase
        .from('portfolio_projects')
        .insert({
          title: projectData.title,
          description: projectData.description,
          category: projectData.category,
          tags: projectData.tags || [],
          is_published: projectData.isPublished !== undefined ? projectData.isPublished : true,
          snug: projectData.snug,
          created_by: adminId
        })
        .select('*')
        .single();

      if (error) throw error;

      // Upload all images and insert into portfolio_project_images
      const imageResults = [];
      if (imageFiles && imageFiles.length > 0) {
        for (const file of imageFiles) {
          let buffer = file.buffer;
          let quality = 95;
          // Compress if over 10MB, and keep compressing until under 10MB or quality too low
          if (file.size > 10 * 1024 * 1024) {
            let compressed = false;
            while (!compressed && quality >= 20) { // Lowered minimum quality to 20
              buffer = await sharp(file.buffer)
                .resize({ width: 4000, withoutEnlargement: true })
                .jpeg({ quality })
                .toBuffer();
              if (buffer.length <= 10 * 1024 * 1024) {
                compressed = true;
              } else {
                quality -= 10;
              }
            }
            if (buffer.length > 10 * 1024 * 1024) {
              throw new ValidationError(`Image too large to upload even after compression. Final size: ${buffer.length} bytes. Please use a smaller image.`);
            }
          }
          // Upload using the (possibly compressed) buffer
          const imageResult = await cloudinaryService.uploadImage({ ...file, buffer });
          const thumbnailUrl = cloudinaryService.generateThumbnailUrl(imageResult.publicId);
          imageResults.push({
            project_id: project.id,
            image_url: imageResult.url,
            image_public_id: imageResult.publicId,
            thumbnail_url: thumbnailUrl
          });
        }
        
        // Insert all images
        const { data: images, error: imagesError } = await supabase
          .from('portfolio_project_images')
          .insert(imageResults)
          .select('*');
        if (imagesError) throw imagesError;

        // Optionally, set the first image as the main image in the project
        if (images && images.length > 0) {
          await supabase
            .from('portfolio_projects')
            .update({
              image_url: images[0].image_url,
              image_public_id: images[0].image_public_id,
              thumbnail_url: images[0].thumbnail_url
            })
            .eq('id', project.id);
        }

        // Return project with images
        return { ...project, images };
      } else {
        // No images provided, return project without images
        return { ...project, images: [] };
      }
    } catch (error) {
      throw new Error('Failed to create project: ' + error.message);
    }
  }

  // Update portfolio project
  async updateProject(projectId, updateData, imageFile = null) {
    try {
      // Validate subcategoryId if provided
      if (updateData.subcategoryId) {
        const { data: subcategory, error: subcategoryError } = await supabase
          .from('portfolio_subcategories')
          .select('id')
          .eq('id', updateData.subcategoryId)
          .single();

        if (subcategoryError || !subcategory) {
          throw new Error(`Subcategory with ID ${updateData.subcategoryId} does not exist`);
        }
      }

      let imageResult = null;
      let thumbnailUrl = null;

      // Upload new image if provided
      if (imageFile) {
        // Get current project to delete old image
        const currentProject = await this.getProjectById(projectId);
        
        // Delete old image from Cloudinary
        if (currentProject.image_public_id) {
          await cloudinaryService.deleteImage(currentProject.image_public_id);
        }

        // Upload new image
        imageResult = await cloudinaryService.uploadImage(imageFile);
        thumbnailUrl = cloudinaryService.generateThumbnailUrl(imageResult.publicId);
      }

      // Prepare update data
      const updatePayload = {
        title: updateData.title,
        description: updateData.description,
        category: updateData.category, // Keep for backward compatibility
        tags: updateData.tags,
        is_published: updateData.isPublished,
        subcategory_id: updateData.subcategoryId || null
      };

      // Add image data if new image was uploaded
      if (imageResult) {
        updatePayload.image_url = imageResult.url;
        updatePayload.image_public_id = imageResult.publicId;
        updatePayload.thumbnail_url = thumbnailUrl;
      }

      // Update project in database
      const { data: project, error } = await supabase
        .from('portfolio_projects')
        .update(updatePayload)
        .single();

      if (error) throw error;

      return project;
    } catch (error) {
      throw new Error('Failed to update project: ' + error.message);
    }
  }

  // Delete portfolio project
  async deleteProject(projectId) {
    try {
      // Get project to delete image from Cloudinary
      const project = await this.getProjectById(projectId);
      
      // Delete image from Cloudinary
      if (project.image_public_id) {
        await cloudinaryService.deleteImage(project.image_public_id);
      }

      // Delete project from database
      const { error } = await supabase
        .from('portfolio_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      return { message: 'Project deleted successfully' };
    } catch (error) {
      throw new Error('Failed to delete project: ' + error.message);
    }
  }

  // Get all categories (new hierarchical system)
  async getCategories() {
    try {
      // Fetch all published projects with all details
      const { data: projects, error } = await supabase
        .from('portfolio_projects')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch all videos for these projects in one query
      const projectIds = (projects || []).map(p => p.id);
      let videosByProject = {};
      if (projectIds.length > 0) {
        const { data: allVideos, error: videosError } = await supabase
          .from('portfolio_project_videos')
          .select('*')
          .in('project_id', projectIds)
          .eq('is_active', true)
          .order('order_index', { ascending: true });
        if (videosError) throw videosError;
        // Group videos by project_id
        videosByProject = (allVideos || []).reduce((acc, video) => {
          if (!acc[video.project_id]) acc[video.project_id] = [];
          acc[video.project_id].push({
            video_url: video.video_url,
            video_public_id: video.video_public_id,
            video_thumbnail_url: video.video_thumbnail_url,
            video_duration: video.video_duration,
            video_autoplay: video.video_autoplay,
            video_loop: video.video_loop,
            video_poster: video.video_poster,
            order_index: video.order_index
          });
          return acc;
        }, {});
      }

      // Attach videos array to each project
      const projectsWithVideos = (projects || []).map(project => ({
        ...project,
        videos: videosByProject[project.id] || []
      }));

      return projectsWithVideos;
    } catch (error) {
      throw new Error('Failed to fetch categories: ' + error.message);
    }
  }

  // Get category by slug
  async getCategoryBySlug(slug) {
    try {
      const { data: category, error } = await supabase
        .from('portfolio_categories')
        .select(`
          *,
          portfolio_subcategories(
            id,
            name,
            slug,
            client_name,
            event_date,
            location,
            cover_image_url,
            project_count:portfolio_projects(count)
          )
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error || !category) {
        throw new NotFoundError('Category not found');
      }

      // Get a random project image from this category for thumbnail
      const { data: randomProject, error: projectError } = await supabase
        .from('portfolio_projects')
        .select('thumbnail_url, image_url')
        .eq('is_published', true)
        .not('subcategory_id', 'is', null)
        .in('subcategory_id', category.portfolio_subcategories.map(sub => sub.id))
        .limit(1)
        .order('created_at', { ascending: false });

      let thumbnailUrl = null;
      
      // If no projects found in subcategories, try to get from any project in this category
      if (!randomProject || randomProject.length === 0) {
        const { data: fallbackProject, error: fallbackError } = await supabase
          .from('portfolio_projects')
          .select('thumbnail_url, image_url')
          .eq('is_published', true)
          .eq('category', category.name)
          .limit(1)
          .order('created_at', { ascending: false });

        if (fallbackProject && fallbackProject.length > 0) {
          thumbnailUrl = fallbackProject[0].thumbnail_url || fallbackProject[0].image_url;
        }
      } else {
        thumbnailUrl = randomProject[0].thumbnail_url || randomProject[0].image_url;
      }

      // If no thumbnail found, return null
      if (!thumbnailUrl) {
        return null;
      }

      return {
        ...category,
        thumbnail_url: thumbnailUrl
      };
    } catch (error) {
      if (error.name === 'NotFoundError') throw error;
      throw new Error('Failed to fetch category: ' + error.message);
    }
  }

  // Get subcategory by slug
  async getSubcategoryBySlug(categorySlug, subcategorySlug) {
    try {
      const { data: subcategory, error } = await supabase
        .from('portfolio_subcategories')
        .select(`
          *,
          portfolio_categories!inner(
            id,
            name,
            slug
          ),
          portfolio_projects(
            id,
            title,
            description,
            image_url,
            thumbnail_url,
            tags,
            view_count,
            created_at
          )
        `)
        .eq('slug', subcategorySlug)
        .eq('portfolio_categories.slug', categorySlug)
        .eq('is_active', true)
        .single();

      if (error || !subcategory) {
        throw new NotFoundError('Subcategory not found');
      }

      return subcategory;
    } catch (error) {
      if (error.name === 'NotFoundError') throw error;
      throw new Error('Failed to fetch subcategory: ' + error.message);
    }
  }

  // Create category (admin only)
  async createCategory(categoryData) {
    try {
      const { data: category, error } = await supabase
        .from('portfolio_categories')
        .insert({
          name: categoryData.name,
          slug: categoryData.slug,
          description: categoryData.description,
          display_order: categoryData.displayOrder || 0
        })
        .select('*')
        .single();

      if (error) throw error;

      return category;
    } catch (error) {
      throw new Error('Failed to create category: ' + error.message);
    }
  }

  // Create subcategory (admin only)
  async createSubcategory(subcategoryData, imageFile = null) {
    try {
      let coverImageUrl = null;
      let coverImagePublicId = null;

      // Upload cover image if provided
      if (imageFile) {
        const imageResult = await cloudinaryService.uploadImage(imageFile);
        coverImageUrl = imageResult.url;
        coverImagePublicId = imageResult.publicId;
      }

      const { data: subcategory, error } = await supabase
        .from('portfolio_subcategories')
        .insert({
          category_id: subcategoryData.categoryId,
          name: subcategoryData.name,
          slug: subcategoryData.slug,
          description: subcategoryData.description,
          client_name: subcategoryData.clientName,
          event_date: subcategoryData.eventDate,
          location: subcategoryData.location,
          cover_image_url: coverImageUrl,
          cover_image_public_id: coverImagePublicId,
          display_order: subcategoryData.displayOrder || 0
        })
        .select(`
          *,
          portfolio_categories(
            id,
            name,
            slug
          )
        `)
        .single();

      if (error) throw error;

      return subcategory;
    } catch (error) {
      throw new Error('Failed to create subcategory: ' + error.message);
    }
  }

  // Update category (admin only)
  async updateCategory(categoryId, updateData) {
    try {
      const { data: category, error } = await supabase
        .from('portfolio_categories')
        .update({
          name: updateData.name,
          slug: updateData.slug,
          description: updateData.description,
          display_order: updateData.displayOrder,
          is_active: updateData.isActive
        })
        .eq('id', categoryId)
        .select('*')
        .single();

      if (error) throw error;

      return category;
    } catch (error) {
      throw new Error('Failed to update category: ' + error.message);
    }
  }

  // Update subcategory (admin only)
  async updateSubcategory(subcategoryId, updateData, imageFile = null) {
    try {
      let coverImageUrl = null;
      let coverImagePublicId = null;

      // Upload new cover image if provided
      if (imageFile) {
        // Get current subcategory to delete old image
        const currentSubcategory = await supabase
          .from('portfolio_subcategories')
          .select('cover_image_public_id')
          .eq('id', subcategoryId)
          .single();

        // Delete old image from Cloudinary
        if (currentSubcategory.data?.cover_image_public_id) {
          await cloudinaryService.deleteImage(currentSubcategory.data.cover_image_public_id);
        }

        // Upload new image
        const imageResult = await cloudinaryService.uploadImage(imageFile);
        coverImageUrl = imageResult.url;
        coverImagePublicId = imageResult.publicId;
      }

      // Prepare update data
      const updatePayload = {
        name: updateData.name,
        slug: updateData.slug,
        description: updateData.description,
        client_name: updateData.clientName,
        event_date: updateData.eventDate,
        location: updateData.location,
        display_order: updateData.displayOrder,
        is_active: updateData.isActive
      };

      // Add image data if new image was uploaded
      if (coverImageUrl) {
        updatePayload.cover_image_url = coverImageUrl;
        updatePayload.cover_image_public_id = coverImagePublicId;
      }

      const { data: subcategory, error } = await supabase
        .from('portfolio_subcategories')
        .update(updatePayload)
        .eq('id', subcategoryId)
        .select(`
          *,
          portfolio_categories(
            id,
            name,
            slug
          )
        `)
        .single();

      if (error) throw error;

      return subcategory;
    } catch (error) {
      throw new Error('Failed to update subcategory: ' + error.message);
    }
  }

  // Delete category (admin only)
  async deleteCategory(categoryId) {
    try {
      const { error } = await supabase
        .from('portfolio_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      return { message: 'Category deleted successfully' };
    } catch (error) {
      throw new Error('Failed to delete category: ' + error.message);
    }
  }

  // Delete subcategory (admin only)
  async deleteSubcategory(subcategoryId) {
    try {
      // Get subcategory to delete cover image from Cloudinary
      const { data: subcategory } = await supabase
        .from('portfolio_subcategories')
        .select('cover_image_public_id')
        .eq('id', subcategoryId)
        .single();

      // Delete cover image from Cloudinary
      if (subcategory?.cover_image_public_id) {
        await cloudinaryService.deleteImage(subcategory.cover_image_public_id);
      }

      const { error } = await supabase
        .from('portfolio_subcategories')
        .delete()
        .eq('id', subcategoryId);

      if (error) throw error;

      return { message: 'Subcategory deleted successfully' };
    } catch (error) {
      throw new Error('Failed to delete subcategory: ' + error.message);
    }
  }

  // Increment view count
  async incrementViewCount(projectId) {
    try {
      // First get current view count
      const { data: project, error: fetchError } = await supabase
        .from('portfolio_projects')
        .select('view_count')
        .eq('id', projectId)
        .single();

      if (fetchError) throw fetchError;

      // Update with incremented count
      const { error } = await supabase
        .from('portfolio_projects')
        .update({ view_count: (project.view_count || 0) + 1 })
        .eq('id', projectId);

      if (error) throw error;

      return { message: 'View count updated' };
    } catch (error) {
      throw new Error('Failed to update view count: ' + error.message);
    }
  }

  // Search projects
  async searchProjects(query, page = 1, limit = 10) {
    try {
      const { data: projects, error } = await supabase
        .from('portfolio_projects')
        .select(`
          *,
          portfolio_subcategories(
            id,
            name,
            slug,
            client_name,
            portfolio_categories(
              id,
              name,
              slug
            )
          )
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return {
        projects,
        pagination: {
          page,
          limit,
          total: projects.length,
          hasMore: projects.length === limit
        }
      };
    } catch (error) {
      throw new Error('Failed to search projects: ' + error.message);
    }
  }

  // Get projects by tags
  async getProjectsByTags(tags, page = 1, limit = 10) {
    try {
      const { data: projects, error } = await supabase
        .from('portfolio_projects')
        .select(`
          *,
          portfolio_subcategories(
            id,
            name,
            slug,
            client_name,
            portfolio_categories(
              id,
              name,
              slug
            )
          )
        `)
        .contains('tags', tags)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return {
        projects,
        pagination: {
          page,
          limit,
          total: projects.length,
          hasMore: projects.length === limit
        }
      };
    } catch (error) {
      throw new Error('Failed to fetch projects by tags: ' + error.message);
    }
  }

  // Upload video to project
  async uploadProjectVideo(projectId, videoFile, videoData = {}) {
    try {
      console.log('📹 Uploading video to project:', { projectId, videoData });

      // Validate project exists
      const { data: project, error: projectError } = await supabase
        .from('portfolio_projects')
        .select('id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        throw new NotFoundError('Project not found');
      }

      // Upload video to Cloudinary
      const videoResult = await cloudinaryService.uploadVideo(videoFile, {
        resource_type: 'video',
        folder: 'portfolio-videos',
        ...videoData
      });

      console.log('✅ Video uploaded to Cloudinary:', videoResult.publicId);

      // Get video duration
      const duration = Math.round(parseFloat(videoResult.duration || 0));

      // Prepare video data
      const videoPayload = {
        project_id: projectId,
        video_url: videoResult.url,
        video_public_id: videoResult.publicId,
        video_thumbnail_url: videoResult.thumbnail_url,
        video_duration: duration,
        video_autoplay: videoData.video_autoplay || false,
        video_loop: videoData.video_loop || false,
        video_poster: videoData.video_poster || null,
        order_index: videoData.order_index || 0
      };

      // Insert video into database
      const { data: video, error: insertError } = await supabase
        .from('portfolio_project_videos')
        .insert(videoPayload)
        .select('*')
        .single();

      if (insertError) {
        // Clean up Cloudinary if database insert fails
        await cloudinaryService.deleteVideo(videoResult.publicId);
        throw insertError;
      }

      console.log('✅ Video saved to database:', video.id);
      return video;
    } catch (error) {
      if (error.name === 'NotFoundError') throw error;
      throw new Error('Failed to upload project video: ' + error.message);
    }
  }

  // Get project videos
  async getProjectVideos(projectId) {
    try {
      const { data: videos, error } = await supabase
        .from('portfolio_project_videos')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) throw error;

      return videos || [];
    } catch (error) {
      throw new Error('Failed to fetch project videos: ' + error.message);
    }
  }

  // Update project video
  async updateProjectVideo(videoId, updateData) {
    try {
      console.log('📹 Updating project video:', { videoId, updateData });

      const { data: video, error } = await supabase
        .from('portfolio_project_videos')
        .update(updateData)
        .eq('id', videoId)
        .select('*')
        .single();

      if (error) throw error;

      console.log('✅ Video updated successfully');
      return video;
    } catch (error) {
      throw new Error('Failed to update project video: ' + error.message);
    }
  }

  // Delete project video
  async deleteProjectVideo(videoId) {
    try {
      console.log('🗑️ Deleting project video:', videoId);

      // Get video details before deletion
      const { data: video, error: fetchError } = await supabase
        .from('portfolio_project_videos')
        .select('video_public_id')
        .eq('id', videoId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from database
      const { error: deleteError } = await supabase
        .from('portfolio_project_videos')
        .delete()
        .eq('id', videoId);

      if (deleteError) throw deleteError;

      // Delete from Cloudinary
      if (video && video.video_public_id) {
        await cloudinaryService.deleteVideo(video.video_public_id);
      }

      console.log('✅ Video deleted successfully');
      return { message: 'Video deleted successfully' };
    } catch (error) {
      throw new Error('Failed to delete project video: ' + error.message);
    }
  }

  // Reorder project videos
  async reorderProjectVideos(projectId, videoIds) {
    try {
      console.log('🔄 Reordering project videos:', { projectId, videoIds });

      const updates = videoIds.map((videoId, index) => ({
        id: videoId,
        order_index: index
      }));

      const { error } = await supabase
        .from('portfolio_project_videos')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw error;

      console.log('✅ Videos reordered successfully');
      return { message: 'Videos reordered successfully' };
    } catch (error) {
      throw new Error('Failed to reorder project videos: ' + error.message);
    }
  }

  // Bulk upload videos to project
  async bulkUploadProjectVideos(projectId, videoFiles, videoData = {}) {
    try {
      console.log('📹 Bulk uploading videos to project:', { projectId, count: videoFiles.length });

      const uploadedVideos = [];

      for (let i = 0; i < videoFiles.length; i++) {
        const videoFile = videoFiles[i];
        const videoPayload = {
          ...videoData,
          order_index: videoData.order_index || i
        };

        const video = await this.uploadProjectVideo(projectId, videoFile, videoPayload);
        uploadedVideos.push(video);
      }

      console.log('✅ Bulk video upload completed:', uploadedVideos.length);
      return uploadedVideos;
    } catch (error) {
      throw new Error('Failed to bulk upload project videos: ' + error.message);
    }
  }

  async getAllCategories() {
    try {
      const { data: categories, error } = await supabase
        .from('portfolio_categories')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return categories || [];
    } catch (error) {
      throw new Error('Failed to fetch all categories: ' + error.message);
    }
  }

  async getAllCategoriesWithProjects() {
    try {
      // Fetch all categories
      const { data: categories, error: catError } = await supabase
        .from('portfolio_categories')
        .select('*')
        .order('display_order', { ascending: true });
      if (catError) throw catError;

      // Fetch all published projects
      const { data: projects, error: projError } = await supabase
        .from('portfolio_projects')
        .select('*')
        .eq('is_published', true);
      if (projError) throw projError;

      // Fetch all videos for these projects
      const projectIds = (projects || []).map(p => p.id);
      let videosByProject = {};
      if (projectIds.length > 0) {
        const { data: allVideos, error: videosError } = await supabase
          .from('portfolio_project_videos')
          .select('*')
          .in('project_id', projectIds)
          .eq('is_active', true)
          .order('order_index', { ascending: true });
        if (videosError) throw videosError;
        videosByProject = (allVideos || []).reduce((acc, video) => {
          if (!acc[video.project_id]) acc[video.project_id] = [];
          acc[video.project_id].push({
            video_url: video.video_url,
            video_public_id: video.video_public_id,
            video_thumbnail_url: video.video_thumbnail_url,
            video_duration: video.video_duration,
            video_autoplay: video.video_autoplay,
            video_loop: video.video_loop,
            video_poster: video.video_poster,
            order_index: video.order_index
          });
          return acc;
        }, {});
      }

      // Attach projects (with videos) to each category
      const categoriesWithProjects = (categories || []).map(cat => {
        // Match projects by category slug (prefer), fallback to name
        const catProjects = (projects || []).filter(p =>
          p.category === cat.slug || p.category === cat.name
        ).map(project => ({
          ...project,
          videos: videosByProject[project.id] || []
        }));
        return {
          ...cat,
          projects: catProjects
        };
      });

      return categoriesWithProjects;
    } catch (error) {
      throw new Error('Failed to fetch all categories with projects: ' + error.message);
    }
  }

  // CRUD for packages
  async createPackage(data) {
    const { name, color, features, note, display_order } = data;
    const { data: pkg, error } = await supabase
      .from('packages')
      .insert({
        name,
        color,
        features,
        note,
        display_order: display_order || 0
      })
      .select('*')
      .single();
    if (error) throw error;
    return pkg;
  }

  async getPackages() {
    const { data: pkgs, error } = await supabase
      .from('packages')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;
    return pkgs || [];
  }

  async getPackageById(id) {
    const { data: pkg, error } = await supabase
      .from('packages')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return pkg;
  }

  async updatePackage(id, data) {
    const { name, color, features, note, display_order } = data;
    const { data: pkg, error } = await supabase
      .from('packages')
      .update({
        name,
        color,
        features,
        note,
        display_order
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return pkg;
  }

  async deletePackage(id) {
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { message: 'Package deleted successfully' };
  }
}

module.exports = new PortfolioService(); 