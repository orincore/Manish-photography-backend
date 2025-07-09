# Homepage Elements API Guide

## Overview

This guide covers all homepage element types and their API integration for the frontend. The backend supports 10 different element types, each with specific use cases and data structures.

## Base URL
```
http://localhost:3000/api/homepage
```

## Authentication
Most endpoints require admin authentication:
```
Authorization: Bearer <jwt-token>
```

---

## 📋 Element Types Overview

| Type | Description | Media Support | Use Case |
|------|-------------|---------------|----------|
| `hero` | Hero section images | Image | Main banner images |
| `hero-video` | Hero section videos | Video | Main banner videos |
| `featured` | Featured images | Image | Showcase images |
| `featured-video` | Featured videos | Video | Showcase videos |
| `instagram` | Instagram feed | Image | Social media integration |
| `about` | About section | Image | Company/about content |
| `gallery` | Gallery images | Image | Portfolio gallery |
| `testimonial` | Customer testimonials | None | Reviews/quotes |
| `service` | Service descriptions | None | Service offerings |
| `contact` | Contact information | None | Contact details |

---

## 🔥 Hero Elements (`hero`, `hero-video`)

### Purpose
Main banner content for the homepage - the first thing visitors see.

### Data Structure
```typescript
interface HeroElement {
  id: string;
  type: 'hero' | 'hero-video';
  title: string;
  subtitle?: string;
  description?: string;
  media_url: string;
  media_type: 'image' | 'video';
  media_public_id: string;
  order_index: number;
  is_active: boolean;
  is_featured: boolean;
  
  // Video-specific fields
  video_autoplay?: boolean;
  video_muted?: boolean;
  video_loop?: boolean;
  video_poster?: string;
  video_duration?: number;
  video_thumbnail_url?: string;
  
  created_at: string;
  updated_at: string;
}
```

### API Endpoints

#### Get All Hero Elements
```bash
GET /api/homepage/hero/active
```
**Response:**
```json
{
  "message": "Active hero elements fetched successfully",
  "elements": [
    {
      "id": "uuid",
      "type": "hero",
      "title": "Welcome to Photography",
      "subtitle": "Capturing Life's Moments",
      "media_url": "https://res.cloudinary.com/...",
      "media_type": "image",
      "order_index": 1,
      "is_active": true
    }
  ]
}
```

#### Get Hero Videos Only
```bash
GET /api/homepage/hero/videos
```

#### Create Hero Element
```bash
POST /api/homepage/elements
Content-Type: multipart/form-data
Authorization: Bearer <token>

# Form data:
- media_file: <image/video-file>
- type: hero
- title: "Hero Title"
- subtitle: "Hero Subtitle"
- description: "Hero description"
- order_index: 1
- is_active: true
- is_featured: true
- video_autoplay: true (for videos)
- video_muted: true (for videos)
- video_loop: true (for videos)
```

### Frontend Integration Example
```javascript
// React component for hero section
const HeroSection = () => {
  const [heroElements, setHeroElements] = useState([]);
  
  useEffect(() => {
    fetch('/api/homepage/hero/active')
      .then(res => res.json())
      .then(data => setHeroElements(data.elements));
  }, []);
  
  return (
    <div className="hero-section">
      {heroElements.map(element => (
        <div key={element.id} className="hero-item">
          {element.media_type === 'video' ? (
            <video
              src={element.media_url}
              autoPlay={element.video_autoplay}
              muted={element.video_muted}
              loop={element.video_loop}
              poster={element.video_poster}
            />
          ) : (
            <img src={element.media_url} alt={element.title} />
          )}
          <div className="hero-content">
            <h1>{element.title}</h1>
            <p>{element.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## ⭐ Featured Elements (`featured`, `featured-video`)

### Purpose
Showcase high-quality work and featured content.

### API Endpoints

#### Get Featured Images
```bash
GET /api/homepage/featured/images
```

#### Get Elements by Type
```bash
GET /api/homepage/elements/type/featured?active_only=true
GET /api/homepage/elements/type/featured-video?active_only=true
```

### Frontend Integration
```javascript
const FeaturedSection = () => {
  const [featuredImages, setFeaturedImages] = useState([]);
  
  useEffect(() => {
    fetch('/api/homepage/featured/images')
      .then(res => res.json())
      .then(data => setFeaturedImages(data.elements));
  }, []);
  
  return (
    <div className="featured-section">
      <h2>Featured Work</h2>
      <div className="featured-grid">
        {featuredImages.map(image => (
          <div key={image.id} className="featured-item">
            <img src={image.media_url} alt={image.title} />
            <h3>{image.title}</h3>
            <p>{image.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 📸 Instagram Elements (`instagram`)

### Purpose
Display Instagram feed integration.

### API Endpoints

#### Get Instagram Images
```bash
GET /api/homepage/instagram/images
```

### Frontend Integration
```javascript
const InstagramFeed = () => {
  const [instagramImages, setInstagramImages] = useState([]);
  
  useEffect(() => {
    fetch('/api/homepage/instagram/images')
      .then(res => res.json())
      .then(data => setInstagramImages(data.elements));
  }, []);
  
  return (
    <div className="instagram-feed">
      <h2>Follow Us on Instagram</h2>
      <div className="instagram-grid">
        {instagramImages.map(image => (
          <div key={image.id} className="instagram-item">
            <img src={image.media_url} alt={image.title} />
            <div className="instagram-overlay">
              <p>{image.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## ℹ️ About Elements (`about`)

### Purpose
About section content with images.

### API Endpoints

#### Get About Elements
```bash
GET /api/homepage/elements/type/about?active_only=true
```

### Frontend Integration
```javascript
const AboutSection = () => {
  const [aboutElements, setAboutElements] = useState([]);
  
  useEffect(() => {
    fetch('/api/homepage/elements/type/about?active_only=true')
      .then(res => res.json())
      .then(data => setAboutElements(data.elements));
  }, []);
  
  return (
    <section className="about-section">
      <div className="about-content">
        {aboutElements.map(element => (
          <div key={element.id} className="about-item">
            <img src={element.media_url} alt={element.title} />
            <div className="about-text">
              <h2>{element.title}</h2>
              <p>{element.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
```

---

## 🖼️ Gallery Elements (`gallery`)

### Purpose
Portfolio gallery images.

### API Endpoints

#### Get Gallery Images
```bash
GET /api/homepage/elements/type/gallery?active_only=true
```

### Frontend Integration
```javascript
const GallerySection = () => {
  const [galleryImages, setGalleryImages] = useState([]);
  
  useEffect(() => {
    fetch('/api/homepage/elements/type/gallery?active_only=true')
      .then(res => res.json())
      .then(data => setGalleryImages(data.elements));
  }, []);
  
  return (
    <div className="gallery-section">
      <h2>Portfolio Gallery</h2>
      <div className="gallery-grid">
        {galleryImages.map(image => (
          <div key={image.id} className="gallery-item">
            <img src={image.media_url} alt={image.title} />
            <div className="gallery-overlay">
              <h3>{image.title}</h3>
              <p>{image.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 💬 Testimonial Elements (`testimonial`)

### Purpose
Customer reviews and testimonials (text-only).

### Data Structure
```typescript
interface TestimonialElement {
  id: string;
  type: 'testimonial';
  title: string;        // Customer name
  subtitle?: string;    // Customer title/company
  description: string;  // Testimonial text
  order_index: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}
```

### API Endpoints

#### Get Testimonials
```bash
GET /api/homepage/elements/type/testimonial?active_only=true
```

### Frontend Integration
```javascript
const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState([]);
  
  useEffect(() => {
    fetch('/api/homepage/elements/type/testimonial?active_only=true')
      .then(res => res.json())
      .then(data => setTestimonials(data.elements));
  }, []);
  
  return (
    <section className="testimonials">
      <h2>What Our Clients Say</h2>
      <div className="testimonials-grid">
        {testimonials.map(testimonial => (
          <div key={testimonial.id} className="testimonial-card">
            <blockquote>{testimonial.description}</blockquote>
            <div className="testimonial-author">
              <h4>{testimonial.title}</h4>
              <p>{testimonial.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
```

---

## 🛠️ Service Elements (`service`)

### Purpose
Service descriptions and offerings (text-only).

### API Endpoints

#### Get Services
```bash
GET /api/homepage/elements/type/service?active_only=true
```

### Frontend Integration
```javascript
const ServicesSection = () => {
  const [services, setServices] = useState([]);
  
  useEffect(() => {
    fetch('/api/homepage/elements/type/service?active_only=true')
      .then(res => res.json())
      .then(data => setServices(data.elements));
  }, []);
  
  return (
    <section className="services">
      <h2>Our Services</h2>
      <div className="services-grid">
        {services.map(service => (
          <div key={service.id} className="service-card">
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            {service.subtitle && <p className="service-price">{service.subtitle}</p>}
          </div>
        ))}
      </div>
    </section>
  );
};
```

---

## 📞 Contact Elements (`contact`)

### Purpose
Contact information and details (text-only).

### API Endpoints

#### Get Contact Info
```bash
GET /api/homepage/elements/type/contact?active_only=true
```

### Frontend Integration
```javascript
const ContactSection = () => {
  const [contactInfo, setContactInfo] = useState([]);
  
  useEffect(() => {
    fetch('/api/homepage/elements/type/contact?active_only=true')
      .then(res => res.json())
      .then(data => setContactInfo(data.elements));
  }, []);
  
  return (
    <section className="contact">
      <h2>Contact Information</h2>
      <div className="contact-info">
        {contactInfo.map(info => (
          <div key={info.id} className="contact-item">
            <h3>{info.title}</h3>
            <p>{info.description}</p>
            {info.subtitle && <p className="contact-detail">{info.subtitle}</p>}
          </div>
        ))}
      </div>
    </section>
  );
};
```

---

## 🏠 Complete Homepage Integration

### Get All Homepage Data
```bash
GET /api/homepage/preview
```

**Response:**
```json
{
  "message": "Homepage preview fetched successfully",
  "heroElements": [...],
  "featuredImages": [...],
  "instagramImages": [...],
  "aboutImages": [...]
}
```

### Complete React Component
```javascript
const Homepage = () => {
  const [homepageData, setHomepageData] = useState({
    heroElements: [],
    featuredImages: [],
    instagramImages: [],
    aboutImages: []
  });
  
  useEffect(() => {
    fetch('/api/homepage/preview')
      .then(res => res.json())
      .then(data => setHomepageData(data));
  }, []);
  
  return (
    <div className="homepage">
      <HeroSection elements={homepageData.heroElements} />
      <FeaturedSection elements={homepageData.featuredImages} />
      <AboutSection elements={homepageData.aboutImages} />
      <InstagramFeed elements={homepageData.instagramImages} />
      <TestimonialsSection />
      <ServicesSection />
      <ContactSection />
    </div>
  );
};
```

---

## 🔧 Admin Management APIs

### Get All Elements (Admin)
```bash
GET /api/homepage/elements?page=1&limit=10&type=hero&is_active=true
```

### Create Element (Admin)
```bash
POST /api/homepage/elements
Content-Type: multipart/form-data
Authorization: Bearer <admin-token>

# Form data:
- media_file: <file> (optional)
- type: <element-type>
- title: <title>
- subtitle: <subtitle>
- description: <description>
- order_index: <number>
- is_active: <boolean>
- is_featured: <boolean>
- video_autoplay: <boolean> (for videos)
- video_muted: <boolean> (for videos)
- video_loop: <boolean> (for videos)
```

### Update Element (Admin)
```bash
PUT /api/homepage/elements/:id
Authorization: Bearer <admin-token>

{
  "title": "Updated Title",
  "description": "Updated description",
  "is_active": true
}
```

### Delete Element (Admin)
```bash
DELETE /api/homepage/elements/:id
Authorization: Bearer <admin-token>
```

### Toggle Active Status (Admin)
```bash
PATCH /api/homepage/elements/:id/toggle-active
Authorization: Bearer <admin-token>

{
  "is_active": true
}
```

### Reorder Elements (Admin)
```bash
POST /api/homepage/elements/reorder
Authorization: Bearer <admin-token>

{
  "element_ids": ["id1", "id2", "id3"]
}
```

### Update Element Media (Admin)
```bash
POST /api/homepage/elements/:id/media
Content-Type: multipart/form-data
Authorization: Bearer <admin-token>

# Form data:
- media_file: <new-file>
```

### Bulk Upload (Admin)
```bash
POST /api/homepage/elements/bulk-upload
Content-Type: multipart/form-data
Authorization: Bearer <admin-token>

# Form data:
- files: <file1>, <file2>, <file3>
- type: <element-type>
- is_active: <boolean>
- is_featured: <boolean>
```

### Get Stats (Admin)
```bash
GET /api/homepage/stats
Authorization: Bearer <admin-token>
```

---

## 📊 Data Validation

### Required Fields by Type

| Type | Required Fields | Optional Fields |
|------|----------------|-----------------|
| `hero` | `type`, `media_file` | `title`, `subtitle`, `description`, `order_index`, `is_active`, `is_featured` |
| `hero-video` | `type`, `media_file` | `title`, `subtitle`, `description`, `order_index`, `is_active`, `is_featured`, `video_autoplay`, `video_muted`, `video_loop` |
| `featured` | `type`, `media_file` | `title`, `subtitle`, `description`, `order_index`, `is_active`, `is_featured` |
| `featured-video` | `type`, `media_file` | `title`, `subtitle`, `description`, `order_index`, `is_active`, `is_featured`, `video_autoplay`, `video_muted`, `video_loop` |
| `instagram` | `type`, `media_file` | `title`, `subtitle`, `description`, `order_index`, `is_active`, `is_featured` |
| `about` | `type`, `media_file` | `title`, `subtitle`, `description`, `order_index`, `is_active`, `is_featured` |
| `gallery` | `type`, `media_file` | `title`, `subtitle`, `description`, `order_index`, `is_active`, `is_featured` |
| `testimonial` | `type`, `title`, `description` | `subtitle`, `order_index`, `is_active`, `is_featured` |
| `service` | `type`, `title`, `description` | `subtitle`, `order_index`, `is_active`, `is_featured` |
| `contact` | `type`, `title`, `description` | `subtitle`, `order_index`, `is_active`, `is_featured` |

### Field Limits
- `title`: 255 characters
- `subtitle`: 500 characters
- `description`: 2000 characters
- `video_poster`: 500 characters
- `order_index`: Non-negative integer

---

## 🎯 Best Practices

### Frontend Implementation
1. **Lazy Loading**: Load images and videos as needed
2. **Error Handling**: Handle missing media gracefully
3. **Responsive Design**: Use appropriate image sizes
4. **Caching**: Cache API responses for better performance
5. **Loading States**: Show loading indicators during API calls

### Video Optimization
1. **Autoplay**: Use `video_autoplay: true` for hero videos
2. **Muted**: Always mute autoplay videos (`video_muted: true`)
3. **Loop**: Use `video_loop: true` for background videos
4. **Poster**: Set `video_poster` for better loading experience

### Image Optimization
1. **Alt Text**: Use `title` as alt text for images
2. **Lazy Loading**: Implement lazy loading for gallery images
3. **Responsive Images**: Use Cloudinary transformations for different screen sizes

### Content Management
1. **Order Management**: Use `order_index` for proper sequencing
2. **Active Status**: Use `is_active` to control visibility
3. **Featured Content**: Use `is_featured` to highlight important content
4. **Bulk Operations**: Use bulk upload for multiple files

---

## 🚀 Quick Start Checklist

### Frontend Setup
- [ ] Set up API base URL
- [ ] Implement authentication for admin features
- [ ] Create components for each element type
- [ ] Add error handling and loading states
- [ ] Implement responsive design
- [ ] Add image/video optimization

### Content Management
- [ ] Upload hero images/videos
- [ ] Add featured content
- [ ] Set up Instagram integration
- [ ] Create about section content
- [ ] Add gallery images
- [ ] Write testimonials
- [ ] Define services
- [ ] Add contact information

### Testing
- [ ] Test all element types
- [ ] Verify video playback
- [ ] Check responsive behavior
- [ ] Test admin functionality
- [ ] Validate form submissions 