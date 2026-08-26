/**
 * Async handler wrapper to catch async errors and pass to Express next()
 * Eliminates repetitive try-catch blocks in route controllers.
 */

export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
