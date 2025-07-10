const contactService = require('../services/contactService');
const { ValidationError } = require('../middlewares/errorHandler');

class ContactController {
  // Create new contact submission (public)
  async createContactSubmission(req, res, next) {
    try {
      const { name, email, phone, location, message } = req.body;
      
      console.log('📝 Contact form submission request:', {
        name,
        email,
        phone,
        location,
        message: message ? `${message.substring(0, 50)}...` : 'No message'
      });
      
      const contact = await contactService.createContactSubmission({
        name,
        email,
        phone,
        location,
        message
      });
      
      console.log('✅ Contact submission processed successfully');
      
      res.status(201).json({
        message: 'Contact form submitted successfully. We will get back to you soon!',
        contact: {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          location: contact.location,
          created_at: contact.created_at
        }
      });
    } catch (error) {
      console.error('❌ Error in contact submission:', error.message);
      next(error);
    }
  }

  // Get all contact submissions (admin only)
  async getAllContactSubmissions(req, res, next) {
    try {
      const { page = 1, limit = 10, status, readStatus } = req.query;
      
      const result = await contactService.getAllContactSubmissions(
        parseInt(page),
        parseInt(limit),
        status,
        readStatus
      );
      
      res.status(200).json({
        message: 'Contact submissions fetched successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get contact submission by ID (admin only)
  async getContactSubmissionById(req, res, next) {
    try {
      const { contactId } = req.params;
      
      const contact = await contactService.getContactSubmissionById(contactId);
      
      res.status(200).json({
        message: 'Contact submission fetched successfully',
        contact
      });
    } catch (error) {
      next(error);
    }
  }

  // Mark contact as read (admin only)
  async markAsRead(req, res, next) {
    try {
      const { contactId } = req.params;
      
      const result = await contactService.markAsRead(contactId);
      
      res.status(200).json({
        message: result.message,
        contact: result.contact
      });
    } catch (error) {
      next(error);
    }
  }

  // Mark contact as unread (admin only)
  async markAsUnread(req, res, next) {
    try {
      const { contactId } = req.params;
      
      const result = await contactService.markAsUnread(contactId);
      
      res.status(200).json({
        message: result.message,
        contact: result.contact
      });
    } catch (error) {
      next(error);
    }
  }

  // Mark contact as resolved (admin only)
  async markAsResolved(req, res, next) {
    try {
      const { contactId } = req.params;
      
      const result = await contactService.markAsResolved(contactId);
      
      res.status(200).json({
        message: result.message,
        contact: result.contact
      });
    } catch (error) {
      next(error);
    }
  }

  // Mark contact as waste (admin only)
  async markAsWaste(req, res, next) {
    try {
      const { contactId } = req.params;
      
      const result = await contactService.markAsWaste(contactId);
      
      res.status(200).json({
        message: result.message,
        contact: result.contact
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete contact submission (admin only)
  async deleteContactSubmission(req, res, next) {
    try {
      const { contactId } = req.params;
      
      const result = await contactService.deleteContactSubmission(contactId);
      
      res.status(200).json({
        message: 'Contact submission deleted successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get contact statistics (admin only)
  async getContactStats(req, res, next) {
    try {
      const stats = await contactService.getContactStats();
      
      res.status(200).json({
        message: 'Contact statistics fetched successfully',
        stats
      });
    } catch (error) {
      next(error);
    }
  }

  // Search contact submissions (admin only)
  async searchContactSubmissions(req, res, next) {
    try {
      const { query, page = 1, limit = 10 } = req.query;
      
      if (!query) {
        throw new ValidationError('Search query is required');
      }
      
      const result = await contactService.searchContactSubmissions(
        query,
        parseInt(page),
        parseInt(limit)
      );
      
      res.status(200).json({
        message: 'Contact search completed successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get contacts by email (admin only)
  async getContactsByEmail(req, res, next) {
    try {
      const { email } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
      const result = await contactService.getContactsByEmail(
        email,
        parseInt(page),
        parseInt(limit)
      );
      
      res.status(200).json({
        message: 'Contacts by email fetched successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk mark as read (admin only)
  async bulkMarkAsRead(req, res, next) {
    try {
      const { contactIds } = req.body;
      
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        throw new ValidationError('Contact IDs array is required');
      }
      
      const result = await contactService.bulkMarkAsRead(contactIds);
      
      res.status(200).json({
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk delete (admin only)
  async bulkDelete(req, res, next) {
    try {
      const { contactIds } = req.body;
      
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        throw new ValidationError('Contact IDs array is required');
      }
      
      const result = await contactService.bulkDelete(contactIds);
      
      res.status(200).json({
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk mark as resolved (admin only)
  async bulkMarkAsResolved(req, res, next) {
    try {
      const { contactIds } = req.body;
      
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        throw new ValidationError('Contact IDs array is required');
      }
      
      const result = await contactService.bulkMarkAsResolved(contactIds);
      
      res.status(200).json({
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk mark as waste (admin only)
  async bulkMarkAsWaste(req, res, next) {
    try {
      const { contactIds } = req.body;
      
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        throw new ValidationError('Contact IDs array is required');
      }
      
      const result = await contactService.bulkMarkAsWaste(contactIds);
      
      res.status(200).json({
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Get unread count (admin only)
  async getUnreadCount(req, res, next) {
    try {
      const stats = await contactService.getContactStats();
      
      res.status(200).json({
        message: 'Unread count fetched successfully',
        unreadCount: stats.unreadContacts
      });
    } catch (error) {
      next(error);
    }
  }

  // Export contacts (admin only)
  async exportContacts(req, res, next) {
    try {
      const { format = 'json', status } = req.query;
      
      // Get all contacts (no pagination for export)
      const result = await contactService.getAllContactSubmissions(1, 1000, status);
      
      if (format === 'csv') {
        // Convert to CSV format
        const csvHeader = 'ID,Name,Email,Phone,Message,Is Read,Created At\n';
        const csvRows = result.contacts.map(contact => 
          `${contact.id},"${contact.name}","${contact.email}","${contact.phone || ''}","${contact.message.replace(/"/g, '""')}",${contact.is_read},"${contact.created_at}"`
        ).join('\n');
        
        const csvContent = csvHeader + csvRows;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
        res.status(200).send(csvContent);
      } else {
        // Return JSON format
        res.status(200).json({
          message: 'Contacts exported successfully',
          contacts: result.contacts,
          total: result.contacts.length
        });
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContactController(); 