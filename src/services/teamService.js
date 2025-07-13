const { supabase } = require('../config');
const cloudinaryService = require('./cloudinaryService');
const { ValidationError, NotFoundError } = require('../middlewares/errorHandler');

class TeamService {
  // List all team members (optionally only active)
  async getAllTeamMembers(activeOnly = false) {
    let query = supabase
      .from('team_members')
      .select('*')
      .order('order_index', { ascending: true });
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw new Error('Failed to fetch team members: ' + error.message);
    return data;
  }

  // Get a single team member by ID
  async getTeamMemberById(id) {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundError('Team member not found');
    return data;
  }

  // Create a new team member
  async createTeamMember(memberData, photoFile) {
    let photo_url = null;
    if (photoFile) {
      const uploadResult = await cloudinaryService.uploadImage(photoFile, {
        folder: 'team-members',
        maxWidth: 800,
        maxHeight: 800,
        quality: 90
      });
      photo_url = uploadResult.url;
    }
    const insertData = { ...memberData, photo_url };
    const { data, error } = await supabase
      .from('team_members')
      .insert(insertData)
      .select('*')
      .single();
    if (error) throw new Error('Failed to create team member: ' + error.message);
    return data;
  }

  // Update a team member
  async updateTeamMember(id, updateData, photoFile) {
    let photo_url = updateData.photo_url;
    if (photoFile) {
      const uploadResult = await cloudinaryService.uploadImage(photoFile, {
        folder: 'team-members',
        maxWidth: 800,
        maxHeight: 800,
        quality: 90
      });
      photo_url = uploadResult.url;
    }
    const { data, error } = await supabase
      .from('team_members')
      .update({ ...updateData, photo_url })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error('Failed to update team member: ' + error.message);
    return data;
  }

  // Delete a team member
  async deleteTeamMember(id) {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);
    if (error) throw new Error('Failed to delete team member: ' + error.message);
    return { id };
  }
}

module.exports = new TeamService(); 