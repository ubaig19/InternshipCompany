import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';

// Get JWT secret from environment variable or use a default for development
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_for_dev_only';

// Define the structure of JWT payload
interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

// Extend Express Request type to include the auth user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
      };
    }
  }
}

// Create a JWT token for a user
export const createToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

// Middleware to authenticate requests
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  // Get the token from the cookie
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // Check if the user exists
    const user = await storage.getUser(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Attach the user to the request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check if user is a candidate
export const requireCandidate = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.role !== 'candidate') {
    return res.status(403).json({ message: 'Access denied. Candidate role required.' });
  }

  next();
};

// Middleware to check if user is an employer
export const requireEmployer = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.role !== 'employer') {
    return res.status(403).json({ message: 'Access denied. Employer role required.' });
  }

  next();
};
