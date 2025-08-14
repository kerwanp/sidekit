---
parent: honojs
name: Authentication
description: Authentication strategies and implementation
type: rule
---

## Authentication

### Rules

- Passwords MUST be hashed using bcrypt or similar secure algorithms
- JWT tokens MUST have appropriate expiration times
- Refresh tokens MUST be implemented for long-lived sessions
- Session data MUST be stored securely
- Authentication middleware MUST be applied to protected routes
- Rate limiting MUST be implemented for authentication endpoints
- Multi-factor authentication SHOULD be supported for sensitive applications
- Authentication state MUST be properly managed across requests
- Logout functionality MUST invalidate tokens/sessions

### JWT Authentication

```typescript
// src/lib/auth.ts
import { sign, verify } from "hono/jwt";
import bcrypt from "bcryptjs";
import { HTTPException } from "hono/http-exception";

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenType: "refresh";
  iat: number;
  exp: number;
}

export const authConfig = {
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiration: "15m",
  refreshTokenExpiration: "7d",
  saltRounds: 12,
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, authConfig.saltRounds);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateTokens(user: {
  id: string;
  email: string;
  role: string;
}) {
  const now = Math.floor(Date.now() / 1000);

  const accessToken = await sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: now,
      exp: now + 15 * 60, // 15 minutes
    },
    authConfig.jwtSecret,
  );

  const refreshToken = await sign(
    {
      sub: user.id,
      tokenType: "refresh",
      iat: now,
      exp: now + 7 * 24 * 60 * 60, // 7 days
    },
    authConfig.jwtSecret,
  );

  return { accessToken, refreshToken };
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  try {
    const payload = (await verify(token, authConfig.jwtSecret)) as JWTPayload;
    return payload;
  } catch (error) {
    throw new HTTPException(401, { message: "Invalid or expired token" });
  }
}

export async function verifyRefreshToken(
  token: string,
): Promise<RefreshTokenPayload> {
  try {
    const payload = (await verify(
      token,
      authConfig.jwtSecret,
    )) as RefreshTokenPayload;

    if (payload.tokenType !== "refresh") {
      throw new Error("Invalid token type");
    }

    return payload;
  } catch (error) {
    throw new HTTPException(401, { message: "Invalid refresh token" });
  }
}
```

### Authentication Middleware

```typescript
// src/middleware/auth.ts
import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { verifyAccessToken } from "../lib/auth";
import { userRepository } from "../lib/db";

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HTTPException(401, {
      message: "Missing or invalid authorization header",
    });
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verifyAccessToken(token);

    // Optional: Verify user still exists
    const user = await userRepository.findById(payload.sub);
    if (!user) {
      throw new HTTPException(401, { message: "User not found" });
    }

    // Add user data to context
    c.set("userId", payload.sub);
    c.set("userEmail", payload.email);
    c.set("userRole", payload.role);
    c.set("user", user);

    await next();
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    throw new HTTPException(401, { message: "Invalid token" });
  }
};

// Role-based authorization middleware
export const requireRole = (role: string) => {
  return async (c: Context, next: Next) => {
    const userRole = c.get("userRole");

    if (userRole !== role) {
      throw new HTTPException(403, {
        message: `Insufficient permissions. Required role: ${role}`,
      });
    }

    await next();
  };
};

// Multiple roles authorization
export const requireAnyRole = (roles: string[]) => {
  return async (c: Context, next: Next) => {
    const userRole = c.get("userRole");

    if (!roles.includes(userRole)) {
      throw new HTTPException(403, {
        message: `Insufficient permissions. Required roles: ${roles.join(", ")}`,
      });
    }

    await next();
  };
};

// Optional authentication (for public endpoints that show different data for authenticated users)
export const optionalAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);

    try {
      const payload = await verifyAccessToken(token);
      const user = await userRepository.findById(payload.sub);

      if (user) {
        c.set("userId", payload.sub);
        c.set("userEmail", payload.email);
        c.set("userRole", payload.role);
        c.set("user", user);
      }
    } catch (error) {
      // Ignore authentication errors for optional auth
    }
  }

  await next();
};
```

### Authentication Routes

```typescript
// src/routes/auth.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyRefreshToken,
} from "../lib/auth";
import { userRepository } from "../lib/db";
import { authMiddleware } from "../middleware/auth";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(100),
});

const auth = new Hono();

// Register
auth.post("/register", zValidator("json", registerSchema), async (c) => {
  const { email, password, name } = c.req.valid("json");

  // Check if user already exists
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw new HTTPException(400, { message: "User already exists" });
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password);
  const user = await userRepository.create({
    email,
    name,
    passwordHash,
  });

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokens(user);

  return c.json(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    },
    201,
  );
});

// Login
auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  // Find user
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokens(user);

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    accessToken,
    refreshToken,
  });
});

// Refresh token
auth.post("/refresh", zValidator("json", refreshTokenSchema), async (c) => {
  const { refreshToken } = c.req.valid("json");

  try {
    const payload = await verifyRefreshToken(refreshToken);

    // Get current user data
    const user = await userRepository.findById(payload.sub);
    if (!user) {
      throw new HTTPException(401, { message: "User not found" });
    }

    // Generate new tokens
    const tokens = await generateTokens(user);

    return c.json(tokens);
  } catch (error) {
    throw new HTTPException(401, { message: "Invalid refresh token" });
  }
});

// Get current user
auth.get("/me", authMiddleware, async (c) => {
  const user = c.get("user");

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    },
  });
});

// Update profile
auth.put(
  "/me",
  authMiddleware,
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(100).optional(),
      email: z.string().email().optional(),
    }),
  ),
  async (c) => {
    const userId = c.get("userId");
    const updates = c.req.valid("json");

    // Check if email is already taken
    if (updates.email) {
      const existingUser = await userRepository.findByEmail(updates.email);
      if (existingUser && existingUser.id !== userId) {
        throw new HTTPException(400, { message: "Email already taken" });
      }
    }

    const updatedUser = await userRepository.update(userId, updates);
    if (!updatedUser) {
      throw new HTTPException(404, { message: "User not found" });
    }

    return c.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      },
    });
  },
);

// Change password
auth.put(
  "/change-password",
  authMiddleware,
  zValidator("json", changePasswordSchema),
  async (c) => {
    const userId = c.get("userId");
    const { currentPassword, newPassword } = c.req.valid("json");

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new HTTPException(404, { message: "User not found" });
    }

    // Verify current password
    const isValidPassword = await verifyPassword(
      currentPassword,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new HTTPException(400, {
        message: "Current password is incorrect",
      });
    }

    // Hash and update new password
    const passwordHash = await hashPassword(newPassword);
    await userRepository.update(userId, { passwordHash });

    return c.json({ message: "Password updated successfully" });
  },
);

// Logout (when using token blacklisting)
auth.post("/logout", authMiddleware, async (c) => {
  // In a real implementation, you would blacklist the token
  // or remove it from a whitelist/session store

  return c.json({ message: "Logged out successfully" });
});

export default auth;
```

### Session-Based Authentication

```typescript
// src/lib/session.ts
interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

// In-memory session store (use Redis in production)
const sessions = new Map<string, Session>();

export async function createSession(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    createdAt: new Date(),
  };

  sessions.set(sessionId, session);
  return sessionId;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const session = sessions.get(sessionId);

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

export async function deleteSession(sessionId: string): Promise<void> {
  sessions.delete(sessionId);
}

// Session middleware
export const sessionMiddleware = async (c: Context, next: Next) => {
  const sessionId = c.req.header("X-Session-ID") || c.req.cookie("sessionId");

  if (!sessionId) {
    throw new HTTPException(401, { message: "No session provided" });
  }

  const session = await getSession(sessionId);
  if (!session) {
    throw new HTTPException(401, { message: "Invalid or expired session" });
  }

  const user = await userRepository.findById(session.userId);
  if (!user) {
    throw new HTTPException(401, { message: "User not found" });
  }

  c.set("sessionId", sessionId);
  c.set("userId", user.id);
  c.set("user", user);

  await next();
};
```

### OAuth Integration

```typescript
// src/lib/oauth.ts
import { Hono } from "hono";

const oauth = new Hono();

// Google OAuth
oauth.get("/google", async (c) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const scope = "openid email profile";

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", crypto.randomUUID());

  return c.redirect(authUrl.toString());
});

oauth.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code) {
    throw new HTTPException(400, { message: "Authorization code missing" });
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      }),
    });

    const tokens = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    );

    const googleUser = await userResponse.json();

    // Find or create user
    let user = await userRepository.findByEmail(googleUser.email);

    if (!user) {
      user = await userRepository.create({
        email: googleUser.email,
        name: googleUser.name,
        passwordHash: "", // OAuth users don't have passwords
        emailVerified: true,
      });
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = await generateTokens(user);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    throw new HTTPException(500, { message: "OAuth authentication failed" });
  }
});

export default oauth;
```

### Multi-Factor Authentication

```typescript
// src/lib/mfa.ts
import { authenticator } from "otplib";
import QRCode from "qrcode";

export async function generateMFASecret(email: string): Promise<{
  secret: string;
  qrCodeUrl: string;
}> {
  const secret = authenticator.generateSecret();
  const service = "Your App Name";

  const otpauth = authenticator.keyuri(email, service, secret);
  const qrCodeUrl = await QRCode.toDataURL(otpauth);

  return { secret, qrCodeUrl };
}

export function verifyMFAToken(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret });
}

// MFA routes
auth.post("/mfa/setup", authMiddleware, async (c) => {
  const user = c.get("user");

  if (user.mfaEnabled) {
    throw new HTTPException(400, { message: "MFA already enabled" });
  }

  const { secret, qrCodeUrl } = await generateMFASecret(user.email);

  // Store secret temporarily (should be confirmed before enabling)
  await userRepository.update(user.id, { mfaSecret: secret });

  return c.json({ qrCodeUrl, secret });
});

auth.post(
  "/mfa/verify",
  authMiddleware,
  zValidator("json", z.object({ token: z.string().length(6) })),
  async (c) => {
    const { token } = c.req.valid("json");
    const user = c.get("user");

    if (!user.mfaSecret) {
      throw new HTTPException(400, { message: "MFA not set up" });
    }

    const isValid = verifyMFAToken(token, user.mfaSecret);

    if (!isValid) {
      throw new HTTPException(400, { message: "Invalid MFA token" });
    }

    // Enable MFA
    await userRepository.update(user.id, { mfaEnabled: true });

    return c.json({ message: "MFA enabled successfully" });
  },
);
```

### Sources

- [JWT Documentation](https://hono.dev/docs/middleware/builtin/jwt)
- [Basic Auth](https://hono.dev/docs/middleware/builtin/basic-auth)
- [Bearer Auth](https://hono.dev/docs/middleware/builtin/bearer-auth)
- [OAuth 2.0 Specification](https://oauth.net/2/)
