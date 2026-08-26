import Joi from 'joi';

// Middleware Wrapper
export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return res.status(400).json({ error: errorMessage });
  }
  next();
};

// --- SCHEMAS ---

export const registerSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  orgName: Joi.string().min(3).required(),
  phone: Joi.string().optional().allow('')
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const broadcastSchema = Joi.object({
  name: Joi.string().required(),
  message: Joi.string().required(),
  rotatorGroupId: Joi.number().required(),
  targetType: Joi.string().valid('all', 'file').required(),
  targetValue: Joi.string().optional().allow(''),
  scheduleAt: Joi.string().optional().allow('')
});

export const contactSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().min(9).pattern(/^[0-9]+$/).required().messages({
      "string.pattern.base": "Phone number must contain only digits"
  }),
  email: Joi.string().email().optional().allow(''),
  label_ids: Joi.array().items(Joi.number()).optional()
});