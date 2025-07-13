const teamService = require('../services/teamService');
const { ValidationError } = require('../middlewares/errorHandler');

class TeamController {
  // List all team members (optionally only active)
  async getAllTeamMembers(req, res, next) {
    try {
      const { active } = req.query;
      const members = await teamService.getAllTeamMembers(active === 'true');
      res.status(200).json({
        message: 'Team members fetched successfully',
        members
      });
    } catch (error) {
      next(error);
    }
  }

  // Get a single team member by ID
  async getTeamMemberById(req, res, next) {
    try {
      const { id } = req.params;
      const member = await teamService.getTeamMemberById(id);
      res.status(200).json({
        message: 'Team member fetched successfully',
        member
      });
    } catch (error) {
      next(error);
    }
  }

  // Create a new team member (admin only)
  async createTeamMember(req, res, next) {
    try {
      const { name, role, bio, order_index, is_active } = req.body;
      const photoFile = req.file;
      if (!name || !role) throw new ValidationError('Name and role are required');
      const memberData = {
        name,
        role,
        bio: bio || '',
        order_index: order_index ? parseInt(order_index) : 0,
        is_active: is_active !== undefined ? is_active === 'true' : true
      };
      const member = await teamService.createTeamMember(memberData, photoFile);
      res.status(201).json({
        message: 'Team member created successfully',
        member
      });
    } catch (error) {
      next(error);
    }
  }

  // Update a team member (admin only)
  async updateTeamMember(req, res, next) {
    try {
      const { id } = req.params;
      const { name, role, bio, order_index, is_active } = req.body;
      const photoFile = req.file;
      const updateData = {
        name,
        role,
        bio,
        order_index: order_index ? parseInt(order_index) : undefined,
        is_active: is_active !== undefined ? is_active === 'true' : undefined
      };
      const member = await teamService.updateTeamMember(id, updateData, photoFile);
      res.status(200).json({
        message: 'Team member updated successfully',
        member
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete a team member (admin only)
  async deleteTeamMember(req, res, next) {
    try {
      const { id } = req.params;
      await teamService.deleteTeamMember(id);
      res.status(200).json({
        message: 'Team member deleted successfully',
        id
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TeamController(); 