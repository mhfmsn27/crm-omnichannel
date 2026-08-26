export const checkPermission = (requiredPerm) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.sendStatus(401);

    // super_admin and admin_member always bypass
    if (user.role === 'admin_member' || user.role === 'super_admin') {
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
