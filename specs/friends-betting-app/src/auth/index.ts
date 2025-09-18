import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// Middleware to authenticate JWT
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (token) {
        jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

// Function to generate JWT
export const generateToken = (user: any) => {
    return jwt.sign(user, SECRET_KEY, { expiresIn: '1h' });
};

// Function to register a new user (stub)
export const registerUser = async (userData: any) => {
    // Logic to register user goes here
};

// Function to login a user (stub)
export const loginUser = async (credentials: any) => {
    // Logic to authenticate user goes here
};