import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema } from "@shared/schema";
import { z } from "zod";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
      };
    }
  }
}

// Middleware to authenticate requests
async function authenticate(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const session = await storage.getSessionByToken(token);
    if (!session) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }

    const user = await storage.getUser(session.userId!);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: user.id,
      username: user.username,
    };

    next();
  } catch (error) {
    return res.status(500).json({ message: "Authentication error" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Login route
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { username, password } = validatedData;

      const user = await storage.validateCredentials(username, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const session = await storage.createSession(user.id);

      res.json({
        user: {
          id: user.id,
          username: user.username,
        },
        token: session.token,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout route
  app.post("/api/auth/logout", authenticate, async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        await storage.deleteSession(token);
      }
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user route
  app.get("/api/auth/user", authenticate, async (req: Request, res: Response) => {
    res.json(req.user);
  });

  const httpServer = createServer(app);
  return httpServer;
}
