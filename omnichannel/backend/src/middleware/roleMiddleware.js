export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.sendStatus(401);
    }

    const rawRole = req.user.role || '';
    const userRole = rawRole.toLowerCase().replace(/_/g, '');
    const roles = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles])
      .map(r => (r || '').toLowerCase().replace(/_/g, ''));
    
    // Super admin & owner have universal access to all management routes
    if (userRole === 'superadmin' || userRole === 'owner') {
      return next();
    }

    if (!roles.includes(userRole) && !roles.includes(rawRole)) {
      return res.status(403).json({ error: 'Access forbidden: Insufficient permissions' });
    }

    next();
  };
};