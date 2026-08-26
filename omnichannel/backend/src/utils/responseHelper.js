/**
 * Standardized API Response Helper
 * Consistent JSON structure across all endpoints.
 */

export const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

export const errorResponse = (res, error = 'An error occurred', statusCode = 500, details = null) => {
    const payload = {
        success: false,
        error: typeof error === 'string' ? error : error.message || 'An error occurred',
    };
    if (details) payload.details = details;
    return res.status(statusCode).json(payload);
};

export const paginatedResponse = (res, items = [], pagination = {}, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data: items,
        pagination: {
            page: pagination.page || 1,
            limit: pagination.limit || items.length,
            total: pagination.total || items.length,
            totalPages: pagination.totalPages || Math.ceil((pagination.total || items.length) / (pagination.limit || 1)),
            hasMore: pagination.hasMore || false,
            ...pagination
        }
    });
};

export default {
    successResponse,
    errorResponse,
    paginatedResponse
};
