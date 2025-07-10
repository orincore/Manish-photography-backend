const { supabase } = require('../config');
const cloudinaryService = require('./cloudinaryService');
const { ValidationError, NotFoundError } = require('../middlewares/errorHandler');

class HomepageService {
  // Get all homepage elements with filtering and pagination
  async getHomepageElements(page = 1, limit = 10, filters = {}) {
    try {
      let query = supabase
        .from('homepage_elements')
        .select(`
          *,
          users!homepage_elements_created_by_fkey(name, email)
        `)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters.is_featured !== undefined) {
        query = query.eq('is_featured', filters.is_featured);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,subtitle.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Add pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: elements, error, count } = await query;

      if (error) throw error;

      return {
        elements,
        pagination: {
          page,
          limit,
          total: count || elements.length,
          hasMore: elements.length === limit
        }
      };
    } catch (error) {
      throw new Error('Failed to fetch homepage elements: ' + error.message);
    }
  }

  // Get homepage element by ID
  async getHomepageElementById(elementId) {
    try {
      const { data: element, error } = await supabase
        .from('homepage_elements')
        .select(`
          *,
          users!homepage_elements_created_by_fkey(name, email)
        `)
        .eq('id', elementId)
        .single();

      if (error || !element) {
        throw new NotFoundError('Homepage element not found');
      }

      return element;
    } catch (error) {
      if (error.name === 'NotFoundError') throw error;
      throw new Error('Failed to fetch homepage element: ' + error.message);
    }
  }

  // Create new homepage element
  async createHomepageElement(elementData, userId, mediaFile = null, uploadId = null) {
    try {
      const { 
        type, 
        title, 
        subtitle, 
        description, 
        order_index, 
        is_active, 
        is_featured,
        video_autoplay,
        video_muted,
        video_loop,
        video_poster
      } = elementData;

      // Validate type
      const validTypes = ['hero', 'featured', 'instagram', 'about', 'gallery', 'testimonial', 'service', 'contact', 'hero-video', 'featured-video'];
      if (!validTypes.includes(type)) {
        throw new ValidationError('Invalid element type');
      }

      // Handle media upload if provided
      let mediaUrl = null;
      let mediaPublicId = null;
      let mediaType = null;
      let isVideo = false;
      let uploadResult = null;

      if (mediaFile) {
        // Determine if it's a video file
        const videoExtensions = ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'];
        const fileExtension = mediaFile.originalname.split('.').pop().toLowerCase();
        isVideo = videoExtensions.includes(fileExtension);

        if (isVideo) {
          uploadResult = await cloudinaryService.uploadVideo(mediaFile, { 
            folder: 'homepage-elements',
            onProgress: uploadId ? (progress) => {
              if (global.io) {
                global.io.to(uploadId).emit('upload-progress', {
                  uploadId,
                  ...progress
                });
              }
            } : null
          });
          mediaType = 'video';
        } else {
          uploadResult = await cloudinaryService.uploadImage(mediaFile, { 
            folder: 'homepage-elements',
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 85
          });
          mediaType = 'image';
        }
        
        mediaUrl = uploadResult.url;
        mediaPublicId = uploadResult.publicId;
        
        // Set video-specific fields for video elements
        if (isVideo) {
          // Set default video settings for hero videos
          if (type === 'hero' || type === 'hero-video') {
            elementData.video_autoplay = video_autoplay !== undefined ? video_autoplay : true;
            elementData.video_muted = video_muted !== undefined ? video_muted : true;
            elementData.video_loop = video_loop !== undefined ? video_loop : true;
          }
        }
      }
      let finalOrderIndex = order_index;
      if (!finalOrderIndex) {
        const { data: lastElement } = await supabase
          .from('homepage_elements')
          .select('order_index')
          .eq('type', type)
          .order('order_index', { ascending: false })
          .limit(1)
          .single();

        finalOrderIndex = lastElement ? lastElement.order_index + 1 : 1;
      }

      // Prepare insert data with proper type conversion
      const insertData = {
        type,
        title,
        subtitle,
        description,
        media_url: mediaUrl,
        media_public_id: mediaPublicId,
        media_type: mediaType,
        order_index: finalOrderIndex,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        is_featured: is_featured !== undefined ? Boolean(is_featured) : false,
        video_autoplay: elementData.video_autoplay !== undefined ? Boolean(elementData.video_autoplay) : false,
        video_muted: elementData.video_muted !== undefined ? Boolean(elementData.video_muted) : true,
        video_loop: elementData.video_loop !== undefined ? Boolean(elementData.video_loop) : false,
        video_poster: video_poster || (isVideo && uploadResult ? uploadResult.thumbnailUrl : null),
        video_duration: isVideo && uploadResult && uploadResult.duration ? Math.round(parseFloat(uploadResult.duration)) : null,
        video_thumbnail_url: isVideo && uploadResult ? uploadResult.thumbnailUrl : null,
        created_by: userId
      };

      console.log('📝 Inserting homepage element with data:', {
        type,
        title,
        subtitle,
        media_type: mediaType,
        video_duration: insertData.video_duration,
        is_video: isVideo
      });

      // Create element
      const { data: element, error } = await supabase
        .from('homepage_elements')
        .insert(insertData)
        .select(`
          *,
          users!homepage_elements_created_by_fkey(name, email)
        `)
        .single();

      if (error) {
        console.error('❌ Database insert error:', error);
        throw error;
      }

      return element;
    } catch (error) {
      if (error.name === 'ValidationError') throw error;
      throw new Error('Failed to create homepage element: ' + error.message);
    }
  }

  // Update homepage element
  async updateHomepageElement(elementId, updateData) {
    try {
      // Validate element exists first
      const { data: existingElement, error: fetchError } = await supabase
        .from('homepage_elements')
        .select('type, media_type')
        .eq('id', elementId)
        .single();

      if (fetchError || !existingElement) {
        throw new NotFoundError('Homepage element not found');
      }

      // Handle video-specific field updates
      const updateFields = { ...updateData };
      
      // Only allow video fields for video elements
      if (existingElement.media_type !== 'video') {
        delete updateFields.video_autoplay;
        delete updateFields.video_muted;
        delete updateFields.video_loop;
        delete updateFields.video_poster;
        delete updateFields.video_duration;
        delete updateFields.video_thumbnail_url;
      }

      // Update the element
      const { data: element, error } = await supabase
        .from('homepage_elements')
        .update(updateFields)
        .eq('id', elementId)
        .select(`
          *,
          users!homepage_elements_created_by_fkey(name, email)
        `)
        .single();

      if (error) {
        throw new Error('Failed to update homepage element: ' + error.message);
      }

      return element;
    } catch (error) {
      if (error.name === 'NotFoundError') throw error;
      throw new Error('Failed to update homepage element: ' + error.message);
    }
  }

  // Delete homepage element
  async deleteHomepageElement(elementId) {
    try {
      // Get element to delete media from Cloudinary
      const { data: element, error: fetchError } = await supabase
        .from('homepage_elements')
        .select('media_public_id')
        .eq('id', elementId)
        .single();

      if (fetchError) {
        throw new NotFoundError('Homepage element not found');
      }

      // Delete from database
      const { error } = await supabase
        .from('homepage_elements')
        .delete()
        .eq('id', elementId);

      if (error) throw error;

      // Delete media from Cloudinary if exists
      if (element.media_public_id) {
        try {
          await cloudinaryService.deleteImage(element.media_public_id);
        } catch (cloudinaryError) {
          console.error('Failed to delete media from Cloudinary:', cloudinaryError);
        }
      }

      return { message: 'Homepage element deleted successfully' };
    } catch (error) {
      if (error.name === 'NotFoundError') throw error;
      throw new Error('Failed to delete homepage element: ' + error.message);
    }
  }

  // Get elements by type
  async getElementsByType(type, activeOnly = true) {
    try {
      let query = supabase
        .from('homepage_elements')
        .select(`
          *,
          users!homepage_elements_created_by_fkey(name, email)
        `)
        .eq('type', type)
        .order('order_index', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data: elements, error } = await query;

      if (error) throw error;

      return elements;
    } catch (error) {
      throw new Error('Failed to fetch elements by type: ' + error.message);
    }
  }

  // Get active hero elements (including videos)
  async getActiveHeroElements() {
    try {
      const { data: elements, error } = await supabase
        .from('homepage_elements')
        .select(`
          *,
          users!homepage_elements_created_by_fkey(name, email)
        `)
        .in('type', ['hero', 'hero-video'])
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) throw error;

      return elements;
    } catch (error) {
      throw new Error('Failed to fetch active hero elements: ' + error.message);
    }
  }

  // Get active hero videos only
  async getActiveHeroVideos() {
    try {
      const { data: elements, error } = await supabase
        .from('homepage_elements')
        .select(`
          *,
          users!homepage_elements_created_by_fkey(name, email)
        `)
        .eq('type', 'hero-video')
        .eq('media_type', 'video')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) throw error;

      return elements;
    } catch (error) {
      throw new Error('Failed to fetch active hero videos: ' + error.message);
    }
  }

  // Get featured images
  async getFeaturedImages() {
    try {
      const { data: elements, error } = await supabase
        .from('homepage_elements')
        .select(`
          *,
          users!homepage_elements_created_by_fkey(name, email)
        `)
        .eq('type', 'featured')
        .eq('is_featured', true)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) throw error;

      return elements;
    } catch (error) {
      throw new Error('Failed to fetch featured images: ' + error.message);
    }
  }

  // Get Instagram images
  async getInstagramImages() {
    try {
      const { data: elements, error } = await supabase
        .from('homepage_elements')
        .select(`
          *,
          users!homepage_elements_created_by_fkey(name, email)
        `)
        .eq('type', 'instagram')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) throw error;

      return elements;
    } catch (error) {
      throw new Error('Failed to fetch Instagram images: ' + error.message);
    }
  }

  // Get homepage preview
  async getHomepagePreview() {
    try {
      const [heroElements, featuredImages, instagramImages, aboutImages] = await Promise.all([
        this.getActiveHeroElements(),
        this.getFeaturedImages(),
        this.getInstagramImages(),
        this.getElementsByType('about', true)
      ]);

      return {
        heroElements,
        featuredImages,
        instagramImages,
        aboutImages
      };
    } catch (error) {
      throw new Error('Failed to fetch homepage preview: ' + error.message);
    }
  }

  // Toggle element active status
  async toggleElementActive(elementId, isActive) {
    try {
      const { data: element, error } = await supabase
        .from('homepage_elements')
        .update({ is_active: isActive })
        .eq('id', elementId)
        .select(`
          *,
          users!homepage_elements_created_by_fkey(name, email)
        `)
        .single();

      if (error || !element) {
        throw new NotFoundError('Homepage element not found');
      }

      return element;
    } catch (error) {
      if (error.name === 'NotFoundError') throw error;
      throw new Error('Failed to toggle element active status: ' + error.message);
    }
  }

  // Reorder elements
  async reorderElements(elementIds) {
    try {
      const updates = elementIds.map((id, index) => ({
        id,
        order_index: index + 1
      }));

      const { error } = await supabase
        .from('homepage_elements')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw error;

      return { message: 'Elements reordered successfully' };
    } catch (error) {
      throw new Error('Failed to reorder elements: ' + error.message);
    }
  }

  // Update element media
  async updateElementMedia(elementId, mediaFile) {
    try {
      // Get current element
      const { data: currentElement, error: fetchError } = await supabase
        .from('homepage_elements')
        .select('media_public_id')
        .eq('id', elementId)
        .single();

      if (fetchError) {
        throw new NotFoundError('Homepage element not found');
      }

      // Delete old media from Cloudinary if exists
      if (currentElement.media_public_id) {
        try {
          await cloudinaryService.deleteImage(currentElement.media_public_id);
        } catch (cloudinaryError) {
          console.error('Failed to delete old media from Cloudinary:', cloudinaryError);
        }
      }

      // Upload new media
      const videoExtensions = ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'];
      const fileExtension = mediaFile.originalname.split('.').pop().toLowerCase();
      const isVideo = videoExtensions.includes(fileExtension);

      let uploadResult;
      if (isVideo) {
        uploadResult = await cloudinaryService.uploadVideo(mediaFile, { folder: 'homepage-elements' });
      } else {
        uploadResult = await cloudinaryService.uploadImage(mediaFile, { 
          folder: 'homepage-elements',
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 85
        });
      }
      const mediaType = isVideo ? 'video' : 'image';

      // Update element
      const { data: element, error } = await supabase
        .from('homepage_elements')
        .update({
          media_url: uploadResult.secure_url,
          media_public_id: uploadResult.public_id,
          media_type: mediaType
        })
        .eq('id', elementId)
        .select(`
          *,
          users!homepage_elements_created_by_fkey(name, email)
        `)
        .single();

      if (error) throw error;

      return element;
    } catch (error) {
      if (error.name === 'NotFoundError') throw error;
      throw new Error('Failed to update element media: ' + error.message);
    }
  }

  // Get homepage statistics
  async getHomepageStats() {
    try {
      const { data: elements, error } = await supabase
        .from('homepage_elements')
        .select('type, is_active, media_type');

      if (error) throw error;

      const totalElements = elements.length;
      const activeElements = elements.filter(e => e.is_active).length;
      const heroImages = elements.filter(e => e.type === 'hero' && e.media_type === 'image').length;
      const heroVideos = elements.filter(e => e.type === 'hero' && e.media_type === 'video').length;
      const featuredImages = elements.filter(e => e.type === 'featured' && e.is_active).length;

      return {
        totalElements,
        activeElements,
        heroImages,
        heroVideos,
        featuredImages
      };
    } catch (error) {
      throw new Error('Failed to fetch homepage statistics: ' + error.message);
    }
  }

  // Bulk upload elements
  async bulkUploadElements(files, type, isActive = true, isFeatured = false, userId) {
    try {
      const elements = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Upload media
        const videoExtensions = ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'];
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        const isVideo = videoExtensions.includes(fileExtension);

        let uploadResult;
        if (isVideo) {
          uploadResult = await cloudinaryService.uploadVideo(file, { folder: 'homepage-elements' });
        } else {
          uploadResult = await cloudinaryService.uploadImage(file, { 
            folder: 'homepage-elements',
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 85
          });
        }
        const mediaType = isVideo ? 'video' : 'image';

        // Get next order index
        const { data: lastElement } = await supabase
          .from('homepage_elements')
          .select('order_index')
          .eq('type', type)
          .order('order_index', { ascending: false })
          .limit(1)
          .single();

        const orderIndex = lastElement ? lastElement.order_index + 1 + i : 1 + i;

        // Create element
        const { data: element, error } = await supabase
          .from('homepage_elements')
          .insert({
            type,
            title: `Uploaded ${type} ${i + 1}`,
            media_url: uploadResult.secure_url,
            media_public_id: uploadResult.public_id,
            media_type: mediaType,
            order_index: orderIndex,
            is_active: isActive,
            is_featured: isFeatured,
            created_by: userId
          })
          .select(`
            *,
            users!homepage_elements_created_by_fkey(name, email)
          `)
          .single();

        if (error) throw error;
        elements.push(element);
      }

      return elements;
    } catch (error) {
      throw new Error('Failed to bulk upload elements: ' + error.message);
    }
  }
}

module.exports = new HomepageService(); 