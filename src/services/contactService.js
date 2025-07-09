const { supabase } = require('../config');
const { ValidationError, NotFoundError } = require('../middlewares/errorHandler');

class ContactService {
  // Create new contact submission (public)
  async createContactSubmission(contactData) {
    try {
      const { name, email, phone, message } = contactData;

      // Create contact submission
      const { data: contact, error } = await supabase
        .from('contact_submissions')
        .insert({
          name,
          email,
          phone: phone || null,
          message,
          is_read: false
        })
        .select('*')
        .single();

      if (error) throw error;

      return contact;
    } catch (error) {
      throw new Error('Failed to create contact submission: ' + error.message);
    }
  }

  // Get all contact submissions (admin only)
  async getAllContactSubmissions(page = 1, limit = 10, status = null) {
    try {
      let query = supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by read status
      if (status === 'read') {
        query = query.eq('is_read', true);
      } else if (status === 'unread') {
        query = query.eq('is_read', false);
      }

      // Add pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: contacts, error, count } = await query;

      if (error) throw error;

      return {
        contacts,
        pagination: {
          page,
          limit,
          total: count || contacts.length,
          hasMore: contacts.length === limit
        }
      };
    } catch (error) {
      throw new Error('Failed to fetch contact submissions: ' + error.message);
    }
  }

  // Get contact submission by ID (admin only)
  async getContactSubmissionById(contactId) {
    try {
      const { data: contact, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .eq('id', contactId)
        .single();

      if (error || !contact) {
        throw new NotFoundError('Contact submission not found');
      }

      return contact;
    } catch (error) {
      if (error.name === 'NotFoundError') throw error;
      throw new Error('Failed to fetch contact submission: ' + error.message);
    }
  }

  // Mark contact as read (admin only)
  async markAsRead(contactId) {
    try {
      const { data: contact, error } = await supabase
        .from('contact_submissions')
        .update({ is_read: true })
        .eq('id', contactId)
        .select('*')
        .single();

      if (error) throw error;

      return {
        message: 'Contact marked as read',
        contact
      };
    } catch (error) {
      throw new Error('Failed to mark contact as read: ' + error.message);
    }
  }

  // Mark contact as unread (admin only)
  async markAsUnread(contactId) {
    try {
      const { data: contact, error } = await supabase
        .from('contact_submissions')
        .update({ is_read: false })
        .eq('id', contactId)
        .select('*')
        .single();

      if (error) throw error;

      return {
        message: 'Contact marked as unread',
        contact
      };
    } catch (error) {
      throw new Error('Failed to mark contact as unread: ' + error.message);
    }
  }

  // Delete contact submission (admin only)
  async deleteContactSubmission(contactId) {
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      return { message: 'Contact submission deleted successfully' };
    } catch (error) {
      throw new Error('Failed to delete contact submission: ' + error.message);
    }
  }

  // Get contact statistics (admin only)
  async getContactStats() {
    try {
      const { data: contacts, error } = await supabase
        .from('contact_submissions')
        .select('is_read, created_at');

      if (error) throw error;

      const totalContacts = contacts.length;
      const readContacts = contacts.filter(c => c.is_read).length;
      const unreadContacts = contacts.filter(c => !c.is_read).length;

      // Get contacts by month (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const recentContacts = contacts.filter(c => 
        new Date(c.created_at) >= sixMonthsAgo
      );

      const monthlyStats = {};
      for (let i = 0; i < 6; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
        
        monthlyStats[monthKey] = recentContacts.filter(c => 
          c.created_at.startsWith(monthKey)
        ).length;
      }

      return {
        totalContacts,
        readContacts,
        unreadContacts,
        monthlyStats
      };
    } catch (error) {
      throw new Error('Failed to get contact statistics: ' + error.message);
    }
  }

  // Search contact submissions (admin only)
  async searchContactSubmissions(query, page = 1, limit = 10) {
    try {
      const { data: contacts, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,message.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return {
        contacts,
        pagination: {
          page,
          limit,
          total: contacts.length,
          hasMore: contacts.length === limit
        }
      };
    } catch (error) {
      throw new Error('Failed to search contact submissions: ' + error.message);
    }
  }

  // Get contacts by email (admin only)
  async getContactsByEmail(email, page = 1, limit = 10) {
    try {
      const { data: contacts, error, count } = await supabase
        .from('contact_submissions')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return {
        contacts,
        pagination: {
          page,
          limit,
          total: count || contacts.length,
          hasMore: contacts.length === limit
        }
      };
    } catch (error) {
      throw new Error('Failed to fetch contacts by email: ' + error.message);
    }
  }

  // Bulk mark as read (admin only)
  async bulkMarkAsRead(contactIds) {
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .update({ is_read: true })
        .in('id', contactIds);

      if (error) throw error;

      return { 
        message: `${contactIds.length} contact(s) marked as read successfully` 
      };
    } catch (error) {
      throw new Error('Failed to bulk mark contacts as read: ' + error.message);
    }
  }

  // Bulk delete (admin only)
  async bulkDelete(contactIds) {
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .delete()
        .in('id', contactIds);

      if (error) throw error;

      return { 
        message: `${contactIds.length} contact(s) deleted successfully` 
      };
    } catch (error) {
      throw new Error('Failed to bulk delete contacts: ' + error.message);
    }
  }
}

module.exports = new ContactService(); 