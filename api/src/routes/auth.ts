import { Router } from 'express';
import { secureId } from '../lib/random';
import { validateBody } from '../middleware/validate';
import { createAuthToken } from '../modules/auth/jwt';
import { registerSchema, type RegisterInput } from '../modules/auth/schemas';

const router = Router();

router.post('/register', validateBody(registerSchema), (req, res) => {
  const { email, role } = req.body as RegisterInput;

  const userId = secureId();
  const token = createAuthToken(userId, role);

  return res.status(201).json({
    user: {
      id: userId,
      email,
      role,
    },
    token,
  });
});

export default router;
