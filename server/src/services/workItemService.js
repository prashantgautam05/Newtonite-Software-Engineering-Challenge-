const prisma = require('../config/database');

/**
 * Work Item Service
 * Handles all business logic for work items including:
 * - CRUD with optimistic locking
 * - State machine transitions
 * - Concurrent assignment protection
 * - Audit history
 */

// ─── Valid state transitions (state machine) ─────────
const VALID_TRANSITIONS = {
  OPEN: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['OPEN', 'AWAITING_APPROVAL', 'RESOLVED', 'CLOSED'],
  AWAITING_APPROVAL: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
  CLOSED: ['OPEN'],
};

function isValidTransition(from, to) {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Create ──────────────────────────────────────────
async function createWorkItem({ title, description, priority, category, teamId, assigneeId, dueDate, reporterId }) {
  // Verify reporter is a member of the team
  const membership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId: reporterId, teamId } },
  });
  if (!membership) {
    const err = new Error('You are not a member of this team');
    err.statusCode = 403;
    throw err;
  }

  // If assigning, verify assignee is a member of the team
  if (assigneeId) {
    const assigneeMembership = await prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: assigneeId, teamId } },
    });
    if (!assigneeMembership) {
      const err = new Error('Assignee is not a member of this team');
      err.statusCode = 400;
      throw err;
    }
  }

  const workItem = await prisma.$transaction(async (tx) => {
    const item = await tx.workItem.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        category: category || 'OTHER',
        teamId,
        reporterId,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        reporter: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
    });

    // Record creation in history
    await tx.workItemHistory.create({
      data: {
        workItemId: item.id,
        userId: reporterId,
        action: 'CREATED',
        newValue: JSON.stringify({ title, priority: priority || 'MEDIUM', status: 'OPEN' }),
      },
    });

    return item;
  });

  return workItem;
}

// ─── List with pagination, filtering, search ─────────
async function listWorkItems({
  page = 1,
  limit = 20,
  status,
  priority,
  category,
  assigneeId,
  teamId,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  userId,
}) {
  const where = { isDeleted: false };

  // Filter by teams the user belongs to (security)
  if (userId) {
    const memberships = await prisma.teamMembership.findMany({
      where: { userId },
      select: { teamId: true },
    });
    const teamIds = memberships.map((m) => m.teamId);

    if (teamId) {
      // If specific team requested, ensure user is a member
      if (!teamIds.includes(teamId)) {
        const err = new Error('Not authorized to view this team\'s items');
        err.statusCode = 403;
        throw err;
      }
      where.teamId = teamId;
    } else {
      where.teamId = { in: teamIds };
    }
  }

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (category) where.category = category;
  if (assigneeId) where.assigneeId = assigneeId;

  // Full-text search on title and description
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const skip = (page - 1) * limit;

  const validSortFields = ['createdAt', 'updatedAt', 'priority', 'status', 'dueDate', 'title'];
  const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [items, total] = await Promise.all([
    prisma.workItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderField]: sortOrder === 'asc' ? 'asc' : 'desc' },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        reporter: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.workItem.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Get single item ─────────────────────────────────
async function getWorkItem(id) {
  const item = await prisma.workItem.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      reporter: { select: { id: true, name: true, email: true } },
      team: { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      history: {
        orderBy: { timestamp: 'desc' },
        take: 50,
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      approvals: {
        orderBy: { createdAt: 'desc' },
        include: {
          requestedBy: { select: { id: true, name: true } },
          resolvedBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!item || item.isDeleted) {
    const err = new Error('Work item not found');
    err.statusCode = 404;
    throw err;
  }

  return item;
}

// ─── Update with optimistic concurrency control ──────
async function updateWorkItem(id, updates, userId) {
  const { version, ...data } = updates;

  if (version === undefined || version === null) {
    const err = new Error('Version is required for updates (optimistic locking)');
    err.statusCode = 400;
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    const currentItem = await tx.workItem.findUnique({
      where: { id },
    });

    if (!currentItem || currentItem.isDeleted) {
      const err = new Error('Work item not found');
      err.statusCode = 404;
      throw err;
    }

    // Optimistic concurrency check
    if (currentItem.version !== version) {
      const err = new Error('This item has been modified by another user. Please refresh and try again.');
      err.statusCode = 409;
      throw err;
    }

    // Validate state transition if status is changing
    if (data.status && data.status !== currentItem.status) {
      if (!isValidTransition(currentItem.status, data.status)) {
        const err = new Error(`Invalid status transition from ${currentItem.status} to ${data.status}`);
        err.statusCode = 400;
        throw err;
      }

      // Enforce approval workflow: can't go to RESOLVED from AWAITING_APPROVAL without approval
      if (currentItem.status === 'AWAITING_APPROVAL' && data.status === 'RESOLVED') {
        const approvedApproval = await tx.approval.findFirst({
          where: {
            workItemId: id,
            status: 'APPROVED',
          },
        });
        if (!approvedApproval) {
          const err = new Error('Cannot resolve: requires an approved approval');
          err.statusCode = 400;
          throw err;
        }
      }
    }

    // If assigning, verify assignee is a member of the team
    if (data.assigneeId && data.assigneeId !== currentItem.assigneeId) {
      const assigneeMembership = await tx.teamMembership.findUnique({
        where: {
          userId_teamId: {
            userId: data.assigneeId,
            teamId: currentItem.teamId,
          },
        },
      });
      if (!assigneeMembership) {
        const err = new Error('Assignee is not a member of this team');
        err.statusCode = 400;
        throw err;
      }
    }

    // Build update data
    const updateData = { version: { increment: 1 } };
    const historyEntries = [];

    if (data.title && data.title !== currentItem.title) {
      updateData.title = data.title;
      historyEntries.push({ field: 'title', old: currentItem.title, new: data.title });
    }
    if (data.description !== undefined && data.description !== currentItem.description) {
      updateData.description = data.description;
      historyEntries.push({ field: 'description', old: currentItem.description || '', new: data.description || '' });
    }
    if (data.status && data.status !== currentItem.status) {
      updateData.status = data.status;
      historyEntries.push({ field: 'status', old: currentItem.status, new: data.status });
    }
    if (data.priority && data.priority !== currentItem.priority) {
      updateData.priority = data.priority;
      historyEntries.push({ field: 'priority', old: currentItem.priority, new: data.priority });
    }
    if (data.category && data.category !== currentItem.category) {
      updateData.category = data.category;
      historyEntries.push({ field: 'category', old: currentItem.category, new: data.category });
    }
    if (data.assigneeId !== undefined && data.assigneeId !== currentItem.assigneeId) {
      updateData.assigneeId = data.assigneeId || null;
      historyEntries.push({ field: 'assignee', old: currentItem.assigneeId || 'unassigned', new: data.assigneeId || 'unassigned' });
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      historyEntries.push({ field: 'dueDate', old: currentItem.dueDate?.toISOString() || 'none', new: data.dueDate || 'none' });
    }

    // Perform the update
    const updated = await tx.workItem.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        reporter: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
    });

    // Write audit trail
    for (const entry of historyEntries) {
      await tx.workItemHistory.create({
        data: {
          workItemId: id,
          userId,
          action: `${entry.field.toUpperCase()}_CHANGED`,
          fieldChanged: entry.field,
          oldValue: String(entry.old),
          newValue: String(entry.new),
        },
      });
    }

    return updated;
  });
}

// ─── Soft delete ─────────────────────────────────────
async function deleteWorkItem(id, userId) {
  return await prisma.$transaction(async (tx) => {
    const item = await tx.workItem.update({
      where: { id },
      data: { isDeleted: true, version: { increment: 1 } },
    });

    await tx.workItemHistory.create({
      data: {
        workItemId: id,
        userId,
        action: 'DELETED',
      },
    });

    return item;
  });
}

// ─── Assign with concurrent protection ───────────────
async function assignWorkItem(workItemId, assigneeId, userId) {
  return await prisma.$transaction(async (tx) => {
    // Lock the row to prevent race conditions
    const current = await tx.$queryRaw`
      SELECT * FROM work_items WHERE id = ${workItemId} AND is_deleted = false FOR UPDATE
    `;

    if (!current || current.length === 0) {
      const err = new Error('Work item not found');
      err.statusCode = 404;
      throw err;
    }

    const currentItem = current[0];

    // Check if already assigned to the requested user
    if (currentItem.assignee_id === assigneeId) {
      const err = new Error('Work item is already assigned to this user');
      err.statusCode = 409;
      throw err;
    }

    // Verify assignee is in the team
    if (assigneeId) {
      const membership = await tx.teamMembership.findUnique({
        where: {
          userId_teamId: {
            userId: assigneeId,
            teamId: currentItem.team_id,
          },
        },
      });
      if (!membership) {
        const err = new Error('Assignee is not a member of this team');
        err.statusCode = 400;
        throw err;
      }
    }

    const updated = await tx.workItem.update({
      where: { id: workItemId },
      data: {
        assigneeId: assigneeId || null,
        version: { increment: 1 },
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        reporter: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
    });

    await tx.workItemHistory.create({
      data: {
        workItemId,
        userId,
        action: 'ASSIGNED',
        fieldChanged: 'assignee',
        oldValue: currentItem.assignee_id || 'unassigned',
        newValue: assigneeId || 'unassigned',
      },
    });

    return updated;
  });
}

// ─── Dashboard stats ─────────────────────────────────
async function getDashboardStats(userId) {
  const memberships = await prisma.teamMembership.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const teamIds = memberships.map((m) => m.teamId);

  const baseWhere = { isDeleted: false, teamId: { in: teamIds } };

  const [
    totalOpen,
    totalInProgress,
    totalAwaitingApproval,
    totalResolved,
    totalCritical,
    assignedToMe,
    reportedByMe,
    recentItems,
  ] = await Promise.all([
    prisma.workItem.count({ where: { ...baseWhere, status: 'OPEN' } }),
    prisma.workItem.count({ where: { ...baseWhere, status: 'IN_PROGRESS' } }),
    prisma.workItem.count({ where: { ...baseWhere, status: 'AWAITING_APPROVAL' } }),
    prisma.workItem.count({ where: { ...baseWhere, status: 'RESOLVED' } }),
    prisma.workItem.count({ where: { ...baseWhere, priority: 'CRITICAL', status: { not: 'CLOSED' } } }),
    prisma.workItem.count({ where: { ...baseWhere, assigneeId: userId, status: { notIn: ['CLOSED', 'RESOLVED'] } } }),
    prisma.workItem.count({ where: { ...baseWhere, reporterId: userId } }),
    prisma.workItem.findMany({
      where: baseWhere,
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        assignee: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    totalOpen,
    totalInProgress,
    totalAwaitingApproval,
    totalResolved,
    totalCritical,
    assignedToMe,
    reportedByMe,
    recentItems,
  };
}

module.exports = {
  createWorkItem,
  listWorkItems,
  getWorkItem,
  updateWorkItem,
  deleteWorkItem,
  assignWorkItem,
  getDashboardStats,
  VALID_TRANSITIONS,
  isValidTransition,
};
