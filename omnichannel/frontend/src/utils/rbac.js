// Centralized RBAC (Role-Based Access Control) utility for Frontend

export const PERMISSION_FALLBACKS = {
  manage_leads: ['manage_contacts'],
  import_contacts: ['manage_contacts'],
  export_data: ['manage_contacts'],
  broadcast_schedule: ['manage_broadcast'],
  broadcast_reports: ['manage_broadcast'],
  manage_templates: ['manage_broadcast'],
  manage_rotator: ['manage_broadcast'],
  manage_sales_visits: ['manage_pipeline', 'manage_crm'],
  bulk_invoice: ['manage_invoice'],
  recurring_invoice: ['manage_invoice'],
  view_analytics: ['view_reports'],
  view_csat: ['view_reports'],
  view_wallboard: ['view_reports'],
  view_gamification: ['view_reports'],
  use_warmer: ['use_tools'],
  manage_chatform: ['use_tools'],
  chatbot_training: ['manage_chatbot'],
  manage_webhooks: ['manage_integrations'],
  manage_roles: ['manage_team'],
  manage_settings: ['manage_team'],
  manage_system_health: ['manage_team'],
  manage_api: ['manage_team'],
};

/**
 * Check if a user has permission to access a feature/menu.
 * 
 * - If no user, returns false.
 * - super_admin always returns true.
 * - Primary owner (admin_member or owner without custom_role_id) always returns true.
 * - If user has custom_role_id or is an agent:
 *   - Checks user.permissions
 *   - Checks fallback permissions in PERMISSION_FALLBACKS
 * - If requiredPerm is null/undefined, returns true.
 * - If requiredPerm is an array, returns true if user has ANY of the permissions.
 */
export const hasPerm = (user, requiredPerm) => {
  if (!user) return false;

  const role = (user.role || '').toLowerCase().replace(/_/g, '');
  if (role === 'superadmin') return true;

  // Primary organization owner without custom_role_id has full unrestricted access
  if ((role === 'adminmember' || role === 'owner') && !user.custom_role_id) {
    return true;
  }

  if (!requiredPerm) return true;

  const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
  const reqList = Array.isArray(requiredPerm) ? requiredPerm : [requiredPerm];

  return reqList.some(p => {
    if (userPerms.includes(p)) return true;
    const fallbacks = PERMISSION_FALLBACKS[p];
    if (fallbacks && fallbacks.some(fb => userPerms.includes(fb))) return true;
    return false;
  });
};

/**
 * Resolves the first permitted path from a list of candidate routes.
 * Useful for smart index route redirection when child routes have varying permissions.
 */
export const getFirstPermittedPath = (user, candidates, fallback = '/dashboard') => {
  if (!Array.isArray(candidates)) return fallback;
  for (const candidate of candidates) {
    if (!candidate.perm || hasPerm(user, candidate.perm)) {
      return candidate.path;
    }
  }
  return fallback;
};
