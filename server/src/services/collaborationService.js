const prisma = require('../config/database');

async function addComment({ workItemId, userId, content }) {
  return await prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: { workItemId, userId, content },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Record in history
    await tx.workItemHistory.create({
      data: {
        workItemId,
        userId,
        action: 'COMMENT_ADDED',
        newValue: content.substring(0, 200), // Truncate for history
      },
    });

    return comment;
  });
}

async function listComments(workItemId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where: { workItemId },
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.comment.count({ where: { workItemId } }),
  ]);

  return {
    comments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getHistory(workItemId, { page = 1, limit = 50 } = {}) {
  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    prisma.workItemHistory.findMany({
      where: { workItemId },
      skip,
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.workItemHistory.count({ where: { workItemId } }),
  ]);

  return {
    entries,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ─── Approvals ────────────────────────────────────────
async function requestApproval({ workItemId, requestedById }) {
  return await prisma.$transaction(async (tx) => {
    // Set work item status to AWAITING_APPROVAL
    const item = await tx.workItem.findUnique({ where: { id: workItemId } });
    if (!item || item.isDeleted) {
      const err = new Error('Work item not found');
      err.statusCode = 404;
      throw err;
    }

    // Check if there's already a pending approval
    const pendingApproval = await tx.approval.findFirst({
      where: { workItemId, status: 'PENDING' },
    });
    if (pendingApproval) {
      const err = new Error('An approval request is already pending');
      err.statusCode = 409;
      throw err;
    }

    // Update status
    await tx.workItem.update({
      where: { id: workItemId },
      data: { status: 'AWAITING_APPROVAL', version: { increment: 1 } },
    });

    // Create approval record
    const approval = await tx.approval.create({
      data: { workItemId, requestedById },
      include: {
        requestedBy: { select: { id: true, name: true } },
      },
    });

    // Audit trail
    await tx.workItemHistory.create({
      data: {
        workItemId,
        userId: requestedById,
        action: 'APPROVAL_REQUESTED',
        fieldChanged: 'status',
        oldValue: item.status,
        newValue: 'AWAITING_APPROVAL',
      },
    });

    return approval;
  });
}

async function resolveApproval({ approvalId, resolvedById, status, reason }) {
  return await prisma.$transaction(async (tx) => {
    const approval = await tx.approval.findUnique({
      where: { id: approvalId },
      include: { workItem: true },
    });

    if (!approval) {
      const err = new Error('Approval not found');
      err.statusCode = 404;
      throw err;
    }

    if (approval.status !== 'PENDING') {
      const err = new Error('Approval has already been resolved');
      err.statusCode = 409;
      throw err;
    }

    // Resolver must be an ADMIN of the team
    const membership = await tx.teamMembership.findUnique({
      where: {
        userId_teamId: {
          userId: resolvedById,
          teamId: approval.workItem.teamId,
        },
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      const err = new Error('Only team admins can resolve approvals');
      err.statusCode = 403;
      throw err;
    }

    const updated = await tx.approval.update({
      where: { id: approvalId },
      data: {
        status,
        resolvedById,
        reason,
        resolvedAt: new Date(),
      },
      include: {
        requestedBy: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });

    // If rejected, move back to IN_PROGRESS
    if (status === 'REJECTED') {
      await tx.workItem.update({
        where: { id: approval.workItemId },
        data: { status: 'IN_PROGRESS', version: { increment: 1 } },
      });
    }

    // Audit trail
    await tx.workItemHistory.create({
      data: {
        workItemId: approval.workItemId,
        userId: resolvedById,
        action: status === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
        fieldChanged: 'approval',
        newValue: reason || status,
      },
    });

    return updated;
  });
}

module.exports = { addComment, listComments, getHistory, requestApproval, resolveApproval };
