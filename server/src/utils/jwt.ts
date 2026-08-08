import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pulsecord_super_secret_jwt_key_2026_change_in_production';

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
