import { PERMISSION_FALLBACKS } from '../controllers/rolesController.js';

export const checkPermission = (requiredPerm) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.sendStatus(401);

    const userRole = (user.role || '').toLowerCase().replace(/_/g, '');

    // super_admin always bypasses all checks
    if (userRole === 'superadmin') {
      return next();
    }

    // Primary organization owner (admin_member or owner without custom_role_id) bypasses all checks
    if ((userRole === 'adminmember' || userRole === 'owner') && !user.custom_role_id) {
      return next();
    }

    if (!requiredPerm) return next();

    // permissions are embedded in JWT (from custom_role or user.permissions)
    const userPerms = Array.isArray(user.permissions) ? user.permissions : [];

    const reqList = Array.isArray(requiredPerm) ? requiredPerm : [requiredPerm];

    // Check if user has ANY of the required permissions (direct or fallback)
    const isAllowed = reqList.some(p => {
      if (userPerms.includes(p)) return true;
      const fallbacks = PERMISSION_FALLBACKS[p];
      if (fallbacks && fallbacks.some(fb => userPerms.includes(fb))) return true;
      return false;
    });

    if (isAllowed) {
      return next();
    }

    return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
  };
};
