import jwt from 'jsonwebtoken';

const getJwtSecret = (): string => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable must be set in production!');
  }
  return 'pulsecord_super_secret_jwt_key_2026_dev';
};

const JWT_SECRET = getJwtSecret();

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};
