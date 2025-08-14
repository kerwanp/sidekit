---
parent: honojs
name: WebSockets
description: WebSocket handling and real-time features
type: rule
---

## WebSockets

### Rules

- WebSocket connections MUST be properly authenticated when required
- Connection lifecycle events MUST be handled (open, message, close, error)
- Message validation MUST be implemented for incoming WebSocket messages
- Connection state MUST be managed efficiently
- Broadcast mechanisms SHOULD be implemented for multi-client scenarios
- Rate limiting SHOULD be applied to WebSocket messages
- Graceful disconnection MUST be handled
- WebSocket endpoints SHOULD be separate from HTTP routes
- Memory usage MUST be monitored for long-lived connections

### Basic WebSocket Setup

```typescript
// src/websocket.ts
import { Hono } from "hono";
import { upgradeWebSocket } from "hono/cloudflare-workers";

const app = new Hono();

// WebSocket upgrade endpoint
app.get(
  "/ws",
  upgradeWebSocket((c) => {
    return {
      onOpen(event, ws) {
        console.log("Connection opened");
        ws.send("Welcome to the WebSocket server!");
      },

      onMessage(event, ws) {
        const message = event.data.toString();
        console.log(`Received: ${message}`);

        // Echo the message back
        ws.send(`Echo: ${message}`);
      },

      onClose(event, ws) {
        console.log("Connection closed");
      },

      onError(event, ws) {
        console.error("WebSocket error:", event);
      },
    };
  }),
);

export default app;
```

### Authenticated WebSocket

```typescript
// src/websocket/auth.ts
import { upgradeWebSocket } from "hono/cloudflare-workers";
import { verify } from "hono/jwt";

interface ConnectionInfo {
  userId: string;
  connectedAt: Date;
}

const connections = new Map<WebSocket, ConnectionInfo>();

export const authenticatedWebSocket = upgradeWebSocket((c) => {
  return {
    async onOpen(event, ws) {
      try {
        // Extract token from query parameter or header
        const url = new URL(c.req.url);
        const token =
          url.searchParams.get("token") ||
          c.req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
          ws.close(1008, "Authentication required");
          return;
        }

        // Verify JWT token
        const payload = await verify(token, c.env.JWT_SECRET);
        const userId = payload.sub as string;

        // Store connection info
        connections.set(ws, {
          userId,
          connectedAt: new Date(),
        });

        console.log(`User ${userId} connected`);
        ws.send(
          JSON.stringify({
            type: "connected",
            userId,
            timestamp: new Date().toISOString(),
          }),
        );
      } catch (error) {
        console.error("Authentication failed:", error);
        ws.close(1008, "Invalid token");
      }
    },

    onMessage(event, ws) {
      const connection = connections.get(ws);
      if (!connection) {
        ws.close(1008, "Unauthenticated");
        return;
      }

      try {
        const data = JSON.parse(event.data.toString());
        handleMessage(ws, connection, data);
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid JSON",
          }),
        );
      }
    },

    onClose(event, ws) {
      const connection = connections.get(ws);
      if (connection) {
        console.log(`User ${connection.userId} disconnected`);
        connections.delete(ws);
      }
    },

    onError(event, ws) {
      console.error("WebSocket error:", event);
      connections.delete(ws);
    },
  };
});

async function handleMessage(
  ws: WebSocket,
  connection: ConnectionInfo,
  data: any,
) {
  switch (data.type) {
    case "ping":
      ws.send(JSON.stringify({ type: "pong" }));
      break;

    case "chat":
      await handleChatMessage(ws, connection, data);
      break;

    default:
      ws.send(
        JSON.stringify({
          type: "error",
          message: `Unknown message type: ${data.type}`,
        }),
      );
  }
}
```

### Chat Room Implementation

```typescript
// src/websocket/chat.ts
import { z } from "zod";

interface Room {
  id: string;
  name: string;
  connections: Set<WebSocket>;
  createdAt: Date;
}

interface User {
  id: string;
  name: string;
  ws: WebSocket;
}

const rooms = new Map<string, Room>();
const users = new Map<WebSocket, User>();

const messageSchema = z.object({
  type: z.literal("chat"),
  roomId: z.string(),
  content: z.string().min(1).max(500),
});

const joinRoomSchema = z.object({
  type: z.literal("join"),
  roomId: z.string(),
  userName: z.string().min(1).max(50),
});

export const chatWebSocket = upgradeWebSocket((c) => {
  return {
    onOpen(event, ws) {
      console.log("Chat client connected");
    },

    onMessage(event, ws) {
      try {
        const data = JSON.parse(event.data.toString());

        switch (data.type) {
          case "join":
            handleJoinRoom(ws, joinRoomSchema.parse(data));
            break;

          case "chat":
            handleChatMessage(ws, messageSchema.parse(data));
            break;

          case "leave":
            handleLeaveRoom(ws, data.roomId);
            break;

          default:
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Unknown message type",
              }),
            );
        }
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "error",
            message:
              error instanceof z.ZodError
                ? "Invalid message format"
                : "Message processing failed",
          }),
        );
      }
    },

    onClose(event, ws) {
      const user = users.get(ws);
      if (user) {
        // Remove user from all rooms
        for (const room of rooms.values()) {
          if (room.connections.has(ws)) {
            room.connections.delete(ws);
            broadcastToRoom(
              room.id,
              {
                type: "user-left",
                userId: user.id,
                userName: user.name,
              },
              ws,
            );
          }
        }
        users.delete(ws);
      }
    },
  };
});

function handleJoinRoom(ws: WebSocket, data: z.infer<typeof joinRoomSchema>) {
  const { roomId, userName } = data;

  // Create room if it doesn't exist
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      name: roomId,
      connections: new Set(),
      createdAt: new Date(),
    });
  }

  const room = rooms.get(roomId)!;
  const user: User = {
    id: crypto.randomUUID(),
    name: userName,
    ws,
  };

  // Add user to room and tracking
  room.connections.add(ws);
  users.set(ws, user);

  // Notify user of successful join
  ws.send(
    JSON.stringify({
      type: "joined",
      roomId,
      userId: user.id,
      userCount: room.connections.size,
    }),
  );

  // Notify other users
  broadcastToRoom(
    roomId,
    {
      type: "user-joined",
      userId: user.id,
      userName: user.name,
      userCount: room.connections.size,
    },
    ws,
  );
}

function handleChatMessage(ws: WebSocket, data: z.infer<typeof messageSchema>) {
  const user = users.get(ws);
  if (!user) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Not in a room",
      }),
    );
    return;
  }

  const { roomId, content } = data;
  const room = rooms.get(roomId);

  if (!room || !room.connections.has(ws)) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Not in this room",
      }),
    );
    return;
  }

  // Broadcast message to all users in room
  broadcastToRoom(roomId, {
    type: "message",
    roomId,
    userId: user.id,
    userName: user.name,
    content,
    timestamp: new Date().toISOString(),
  });
}

function handleLeaveRoom(ws: WebSocket, roomId: string) {
  const user = users.get(ws);
  const room = rooms.get(roomId);

  if (room && user && room.connections.has(ws)) {
    room.connections.delete(ws);

    // Notify other users
    broadcastToRoom(
      roomId,
      {
        type: "user-left",
        userId: user.id,
        userName: user.name,
        userCount: room.connections.size,
      },
      ws,
    );

    // Clean up empty rooms
    if (room.connections.size === 0) {
      rooms.delete(roomId);
    }
  }
}

function broadcastToRoom(roomId: string, message: any, exclude?: WebSocket) {
  const room = rooms.get(roomId);
  if (!room) return;

  const messageStr = JSON.stringify(message);

  for (const ws of room.connections) {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error("Failed to send message to client:", error);
        room.connections.delete(ws);
      }
    }
  }
}
```

### Rate Limiting for WebSocket

```typescript
// src/websocket/rate-limit.ts
interface ClientInfo {
  lastMessage: number;
  messageCount: number;
  banned: boolean;
}

const clients = new Map<WebSocket, ClientInfo>();
const RATE_LIMIT = {
  maxMessages: 10,
  windowMs: 60000, // 1 minute
  banDuration: 300000, // 5 minutes
};

export function initRateLimit(ws: WebSocket) {
  clients.set(ws, {
    lastMessage: 0,
    messageCount: 0,
    banned: false,
  });
}

export function checkRateLimit(ws: WebSocket): boolean {
  const client = clients.get(ws);
  if (!client) return false;

  const now = Date.now();

  // Check if client is banned
  if (client.banned && now - client.lastMessage < RATE_LIMIT.banDuration) {
    return false;
  }

  // Reset ban if duration has passed
  if (client.banned && now - client.lastMessage >= RATE_LIMIT.banDuration) {
    client.banned = false;
    client.messageCount = 0;
  }

  // Reset message count if window has passed
  if (now - client.lastMessage > RATE_LIMIT.windowMs) {
    client.messageCount = 0;
  }

  client.messageCount++;
  client.lastMessage = now;

  // Ban if rate limit exceeded
  if (client.messageCount > RATE_LIMIT.maxMessages) {
    client.banned = true;
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Rate limit exceeded. You are temporarily banned.",
      }),
    );
    return false;
  }

  return true;
}

export function cleanupRateLimit(ws: WebSocket) {
  clients.delete(ws);
}
```

### Node.js WebSocket Implementation

```typescript
// src/node-websocket.ts
import { Hono } from "hono";
import { createNodeWebSocket } from "@hono/node-ws";

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

const app = new Hono();

app.get(
  "/ws",
  upgradeWebSocket((c) => {
    return {
      onOpen(event, ws) {
        console.log("Connection opened");
      },

      onMessage(event, ws) {
        const message = event.data.toString();
        ws.send(`Echo: ${message}`);
      },

      onClose() {
        console.log("Connection closed");
      },
    };
  }),
);

// For Node.js server
import { serve } from "@hono/node-server";

const server = serve({
  fetch: app.fetch,
  port: 3000,
});

injectWebSocket(server);
```

### WebSocket Client (Frontend)

```typescript
// client/websocket.ts
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    private url: string,
    private token?: string,
  ) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.token ? `${this.url}?token=${this.token}` : this.url;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      };
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(
        `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
      );

      setTimeout(() => {
        this.connect().catch(console.error);
      }, delay);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error("WebSocket is not connected");
    }
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case "message":
        this.onMessage?.(data);
        break;
      case "user-joined":
        this.onUserJoined?.(data);
        break;
      case "user-left":
        this.onUserLeft?.(data);
        break;
      case "error":
        this.onError?.(data);
        break;
    }
  }

  // Event handlers (to be overridden)
  onMessage?: (data: any) => void;
  onUserJoined?: (data: any) => void;
  onUserLeft?: (data: any) => void;
  onError?: (data: any) => void;

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Usage
const client = new WebSocketClient("ws://localhost:3000/ws", "your-jwt-token");

client.onMessage = (data) => {
  console.log("Received message:", data);
};

client.onUserJoined = (data) => {
  console.log("User joined:", data.userName);
};

await client.connect();
client.send({ type: "join", roomId: "general", userName: "Alice" });
```

### Sources

- [WebSocket Support](https://hono.dev/docs/helpers/websocket)
- [Cloudflare Workers WebSocket](https://developers.cloudflare.com/workers/runtime-apis/websockets/)
- [Node.js WebSocket](https://github.com/honojs/node-ws)
