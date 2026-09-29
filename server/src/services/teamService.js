const prisma = require('../config/database');

async function listTeams(userId) {
  // Only show teams the user belongs to
  const memberships = await prisma.teamMembership.findMany({
    where: { userId },
    include: {
      team: {
        include: {
          _count: {
            select: {
              members: true,
              workItems: { where: { isDeleted: false } },
            },
          },
        },
      },
    },
  });

  return memberships.map((m) => ({
    ...m.team,
    role: m.role,
    memberCount: m.team._count.members,
    workItemCount: m.team._count.workItems,
  }));
}

async function createTeam({ name, description, createdByUserId }) {
  return await prisma.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: { name, description },
    });

    // Creator becomes ADMIN of the team
    await tx.teamMembership.create({
      data: {
        userId: createdByUserId,
        teamId: team.id,
        role: 'ADMIN',
      },
    });

    return team;
  });
}

async function getTeam(teamId, userId) {
  // Verify user is a member
  const membership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });

  if (!membership) {
    const err = new Error('Not a member of this team');
    err.statusCode = 403;
    throw err;
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      _count: {
        select: {
          workItems: { where: { isDeleted: false } },
        },
      },
    },
  });

  return { ...team, currentUserRole: membership.role };
}

async function addMember({ teamId, userId, role, addedByUserId }) {
  // Verify the adder is an ADMIN
  const adderMembership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId: addedByUserId, teamId } },
  });

  if (!adderMembership || adderMembership.role !== 'ADMIN') {
    const err = new Error('Only team admins can add members');
    err.statusCode = 403;
    throw err;
  }

  // Check if already a member
  const existing = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });

  if (existing) {
    const err = new Error('User is already a member of this team');
    err.statusCode = 409;
    throw err;
  }

  return await prisma.teamMembership.create({
    data: { userId, teamId, role: role || 'MEMBER' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

async function removeMember({ teamId, userId, removedByUserId }) {
  const removerMembership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId: removedByUserId, teamId } },
  });

  if (!removerMembership || removerMembership.role !== 'ADMIN') {
    const err = new Error('Only team admins can remove members');
    err.statusCode = 403;
    throw err;
  }

  if (userId === removedByUserId) {
    const err = new Error('Cannot remove yourself from the team');
    err.statusCode = 400;
    throw err;
  }

  return await prisma.teamMembership.delete({
    where: { userId_teamId: { userId, teamId } },
  });
}

async function listAllUsers() {
  return await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
}

module.exports = { listTeams, createTeam, getTeam, addMember, removeMember, listAllUsers };
