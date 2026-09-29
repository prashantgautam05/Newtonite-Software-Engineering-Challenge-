const { z } = require('zod');
const teamService = require('../services/teamService');

const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).optional(),
});

async function list(req, res, next) {
  try {
    const teams = await teamService.listTeams(req.user.id);
    res.json(teams);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = createTeamSchema.parse(req.body);
    const team = await teamService.createTeam({
      ...data,
      createdByUserId: req.user.id,
    });
    res.status(201).json(team);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const team = await teamService.getTeam(req.params.id, req.user.id);
    res.json(team);
  } catch (err) {
    next(err);
  }
}

async function addMember(req, res, next) {
  try {
    const data = addMemberSchema.parse(req.body);
    const membership = await teamService.addMember({
      teamId: req.params.id,
      userId: data.userId,
      role: data.role,
      addedByUserId: req.user.id,
    });
    res.status(201).json(membership);
  } catch (err) {
    next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    await teamService.removeMember({
      teamId: req.params.id,
      userId: req.params.userId,
      removedByUserId: req.user.id,
    });
    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const users = await teamService.listAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, getById, addMember, removeMember, listUsers };
