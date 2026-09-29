/**
 * RBAC (Role-Based Access Control) middleware.
 * Enforces team-level and resource-level permissions server-side.
 */

/**
 * Checks if the user has one of the required roles in the specified team.
 * Usage: authorize(['ADMIN', 'MEMBER']) — checks against the team from req.body.teamId or req.params
 */
function authorize(requiredRoles = []) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // If no specific roles required, just need to be authenticated
    if (requiredRoles.length === 0) {
      return next();
    }

    // Get the team ID from the request context
    const teamId = req.body?.teamId || req.params?.teamId || req.query?.teamId;

    if (!teamId) {
      // If no team context, check if user has any of the required roles in any team
      const hasRole = user.teamMemberships.some((m) =>
        requiredRoles.includes(m.role)
      );
      if (!hasRole) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return next();
    }

    // Check user's role in the specific team
    const membership = user.teamMemberships.find((m) => m.teamId === teamId);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this team' });
    }

    if (!requiredRoles.includes(membership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this team' });
    }

    req.teamRole = membership.role;
    next();
  };
}

/**
 * Checks if the user belongs to the team that owns the work item.
 * Must be used after the work item has been loaded (req.workItem must exist).
 */
function authorizeWorkItemAccess(requiredRoles = []) {
  return (req, res, next) => {
    const user = req.user;
    const workItem = req.workItem;

    if (!workItem) {
      return res.status(404).json({ error: 'Work item not found' });
    }

    const membership = user.teamMemberships.find(
      (m) => m.teamId === workItem.teamId
    );

    if (!membership) {
      return res.status(403).json({ error: 'Not authorized to access this work item' });
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(membership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this action' });
    }

    req.teamRole = membership.role;
    next();
  };
}

/**
 * Middleware to load a work item by ID and attach to req.workItem.
 */
function loadWorkItem(prisma) {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const workItem = await prisma.workItem.findUnique({
        where: { id },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          reporter: { select: { id: true, name: true, email: true } },
          team: { select: { id: true, name: true } },
        },
      });

      if (!workItem || workItem.isDeleted) {
        return res.status(404).json({ error: 'Work item not found' });
      }

      req.workItem = workItem;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { authorize, authorizeWorkItemAccess, loadWorkItem };
