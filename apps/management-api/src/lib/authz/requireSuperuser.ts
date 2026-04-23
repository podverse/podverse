import type { NextFunction, Request, Response } from 'express';

export function requireSuperuser(req: Request, res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  if (user.role !== 'superuser') {
    res.status(403).json({ message: 'Superuser only' });
    return;
  }
  next();
}
