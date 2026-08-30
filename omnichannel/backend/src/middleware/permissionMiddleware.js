export const checkPermission = (requiredPerm) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.sendStatus(401);

    // super_admin and admin_member always bypass permission checks
    const userRole = (user.role || '').toLowerCase().replace(/_/g, '');
    if (userRole === 'adminmember' || userRole === 'superadmin' || userRole === 'owner') {
      return next();
    }

    if (!requiredPerm) return next();

    // permissions are now embedded in JWT (set at login from custom_role or user.permissions)
    const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
    if (userPerms.includes(requiredPerm)) {
      return next();
    }

    return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
  };
};
