import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { loginBodySchema } from '../utils/validation';
import '@fastify/postgres';
import '@fastify/jwt';
import '@fastify/sensible';

type LoginBody = z.infer<typeof loginBodySchema>;

export class AuthService {
  constructor(private fastify: FastifyInstance) {}

  async loginAdmin(credentials: LoginBody): Promise<{ token: string }> {
    const { username, password } = credentials;

    // FIX: Cast to any to access pg property
    const { rows } = await (this.fastify as any).pg.query(
      'SELECT id, username, password_hash FROM admins WHERE username = $1',
      [username]
    );

    const admin = rows[0];
    if (!admin) {
      throw this.fastify.httpErrors.unauthorized('Invalid username or password');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      throw this.fastify.httpErrors.unauthorized('Invalid username or password');
    }

    // FIX: Cast to any to access jwt property
    const token = (this.fastify as any).jwt.sign({
      id: admin.id,
      username: admin.username,
    });

    return { token };
  }
}