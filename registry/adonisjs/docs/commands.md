---
parent: adonisjs
name: Commands
description: Guidelines for CLI command development in AdonisJS 6
type: documentation
---

## CLI Command Development

### Creating Commands

Commands MUST be created using the Ace CLI and placed in `app/commands/`:

```bash
# Create a new command
node ace make:command CreateUser
```

### Command Structure

```typescript
// app/commands/create_user.ts
import { BaseCommand, args, flags } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";
import User from "#models/user";
import hash from "@adonisjs/core/services/hash";

export default class CreateUser extends BaseCommand {
  static commandName = "user:create";
  static description = "Create a new user account";

  // ✅ Define command arguments
  @args.string({ description: "User email address" })
  declare email: string;

  @args.string({ description: "User full name" })
  declare fullName: string;

  // ✅ Define command flags
  @flags.string({
    description: "User password (will prompt if not provided)",
    alias: "p",
  })
  declare password?: string;

  @flags.string({
    description: "User role",
    default: "user",
  })
  declare role: string;

  @flags.boolean({
    description: "Activate user immediately",
    default: false,
  })
  declare active: boolean;

  @flags.boolean({
    description: "Force creation even if user exists",
    default: false,
  })
  declare force: boolean;

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  };

  async run(): Promise<void> {
    const { email, fullName, role, active, force } = this;

    try {
      // ✅ Validation
      if (!this.isValidEmail(email)) {
        this.logger.error("Invalid email address provided");
        this.exitCode = 1;
        return;
      }

      // ✅ Check if user exists
      const existingUser = await User.findBy("email", email);
      if (existingUser && !force) {
        this.logger.error(
          `User with email ${email} already exists. Use --force to override.`,
        );
        this.exitCode = 1;
        return;
      }

      // ✅ Get password
      let password = this.password;
      if (!password) {
        password = await this.prompt.secure("Enter password");
      }

      if (password.length < 8) {
        this.logger.error("Password must be at least 8 characters long");
        this.exitCode = 1;
        return;
      }

      // ✅ Create or update user
      let user: User;

      if (existingUser && force) {
        user = existingUser;
        user.merge({
          fullName,
          password: await hash.make(password),
          role,
          isActive: active,
        });
        await user.save();
        this.logger.success(`User ${email} updated successfully`);
      } else {
        user = await User.create({
          email,
          fullName,
          password: await hash.make(password),
          role,
          isActive: active,
        });
        this.logger.success(`User ${email} created successfully`);
      }

      // ✅ Display user information
      this.logger.info("User details:");
      const table = this.ui.table();
      table.head(["Field", "Value"]);
      table.row(["ID", user.id.toString()]);
      table.row(["Email", user.email]);
      table.row(["Name", user.fullName]);
      table.row(["Role", user.role]);
      table.row(["Active", user.isActive ? "Yes" : "No"]);
      table.row(["Created", user.createdAt.toLocaleString()]);
      table.render();
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`);
      this.exitCode = 1;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
```

### Database Commands

```typescript
// app/commands/database_seed.ts
import { BaseCommand, flags } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";
import Database from "@adonisjs/lucid/services/db";
import { UserFactory } from "#factories/user_factory";
import { PostFactory } from "#factories/post_factory";

export default class DatabaseSeed extends BaseCommand {
  static commandName = "db:seed";
  static description = "Seed the database with sample data";

  @flags.number({
    description: "Number of users to create",
    default: 10,
  })
  declare users: number;

  @flags.number({
    description: "Number of posts per user",
    default: 5,
  })
  declare postsPerUser: number;

  @flags.boolean({
    description: "Truncate existing data",
    default: false,
  })
  declare fresh: boolean;

  static options: CommandOptions = {
    startApp: true,
  };

  async run(): Promise<void> {
    const { users, postsPerUser, fresh } = this;

    try {
      if (fresh) {
        this.logger.info("Truncating existing data...");
        await Database.truncate("posts");
        await Database.truncate("users");
      }

      this.logger.info(
        `Creating ${users} users with ${postsPerUser} posts each...`,
      );

      // ✅ Use progress bar for long operations
      const progressBar = this.ui.progressBar();
      progressBar.start(users, 0);

      for (let i = 0; i < users; i++) {
        const user = await UserFactory.create();
        await PostFactory.merge({ userId: user.id }).createMany(postsPerUser);
        progressBar.update(i + 1);
      }

      progressBar.stop();

      // ✅ Display summary
      const userCount = await Database.from("users")
        .count("* as total")
        .first();
      const postCount = await Database.from("posts")
        .count("* as total")
        .first();

      this.logger.success("Database seeding completed!");
      this.logger.info(`Total users: ${userCount?.total}`);
      this.logger.info(`Total posts: ${postCount?.total}`);
    } catch (error) {
      this.logger.error(`Seeding failed: ${error.message}`);
      this.exitCode = 1;
    }
  }
}
```

### Data Import Commands

```typescript
// app/commands/import_users.ts
import { BaseCommand, args, flags } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";
import fs from "node:fs/promises";
import csv from "csv-parser";
import { createReadStream } from "node:fs";
import User from "#models/user";
import Database from "@adonisjs/lucid/services/db";

export default class ImportUsers extends BaseCommand {
  static commandName = "import:users";
  static description = "Import users from CSV file";

  @args.string({ description: "Path to CSV file" })
  declare filePath: string;

  @flags.number({
    description: "Batch size for processing",
    default: 100,
  })
  declare batchSize: number;

  @flags.boolean({
    description: "Skip invalid rows",
    default: true,
  })
  declare skipInvalid: boolean;

  @flags.boolean({
    description: "Dry run - validate without importing",
    default: false,
  })
  declare dryRun: boolean;

  static options: CommandOptions = {
    startApp: true,
  };

  async run(): Promise<void> {
    const { filePath, batchSize, skipInvalid, dryRun } = this;

    try {
      // ✅ Validate file exists
      await fs.access(filePath);

      this.logger.info(`Reading CSV file: ${filePath}`);

      const rows: any[] = [];
      const errors: string[] = [];
      let lineNumber = 1;

      // ✅ Stream CSV file
      await new Promise((resolve, reject) => {
        createReadStream(filePath)
          .pipe(csv())
          .on("data", (row) => {
            lineNumber++;
            const validation = this.validateRow(row, lineNumber);

            if (validation.valid) {
              rows.push(validation.data);
            } else {
              errors.push(`Line ${lineNumber}: ${validation.error}`);
              if (!skipInvalid) {
                reject(
                  new Error(
                    `Validation failed at line ${lineNumber}: ${validation.error}`,
                  ),
                );
                return;
              }
            }
          })
          .on("end", resolve)
          .on("error", reject);
      });

      // ✅ Display validation results
      this.logger.info(`Found ${rows.length} valid rows`);
      if (errors.length > 0) {
        this.logger.warning(
          `${errors.length} invalid rows ${skipInvalid ? "skipped" : "found"}`,
        );
        if (this.logger.level <= 3) {
          // Debug level
          errors.forEach((error) => this.logger.debug(error));
        }
      }

      if (dryRun) {
        this.logger.info("Dry run completed - no data imported");
        return;
      }

      // ✅ Process in batches
      const progressBar = this.ui.progressBar();
      progressBar.start(rows.length, 0);

      let processed = 0;
      let imported = 0;
      let skipped = 0;

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        const trx = await Database.transaction();

        try {
          for (const row of batch) {
            const existingUser = await User.findBy("email", row.email, {
              client: trx,
            });

            if (existingUser) {
              skipped++;
            } else {
              await User.create(row, { client: trx });
              imported++;
            }

            processed++;
            progressBar.update(processed);
          }

          await trx.commit();
        } catch (error) {
          await trx.rollback();
          throw error;
        }
      }

      progressBar.stop();

      // ✅ Display results
      this.logger.success("Import completed!");
      const table = this.ui.table();
      table.head(["Metric", "Count"]);
      table.row(["Total processed", processed.toString()]);
      table.row(["Successfully imported", imported.toString()]);
      table.row(["Skipped (existing)", skipped.toString()]);
      table.row(["Errors", errors.length.toString()]);
      table.render();
    } catch (error) {
      this.logger.error(`Import failed: ${error.message}`);
      this.exitCode = 1;
    }
  }

  private validateRow(
    row: any,
    lineNumber: number,
  ): { valid: boolean; data?: any; error?: string } {
    const { email, name, role } = row;

    if (!email || !email.trim()) {
      return { valid: false, error: "Email is required" };
    }

    if (!this.isValidEmail(email)) {
      return { valid: false, error: "Invalid email format" };
    }

    if (!name || !name.trim()) {
      return { valid: false, error: "Name is required" };
    }

    const validRoles = ["user", "admin", "moderator"];
    const userRole = role || "user";

    if (!validRoles.includes(userRole)) {
      return { valid: false, error: `Invalid role: ${userRole}` };
    }

    return {
      valid: true,
      data: {
        email: email.trim().toLowerCase(),
        fullName: name.trim(),
        role: userRole,
        password: "temporary123", // Will need to be changed
        isActive: true,
      },
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
```

### System Commands

```typescript
// app/commands/system_health.ts
import { BaseCommand, flags } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";
import Database from "@adonisjs/lucid/services/db";
import redis from "@adonisjs/redis/services/main";

export default class SystemHealth extends BaseCommand {
  static commandName = "system:health";
  static description = "Check system health and dependencies";

  @flags.boolean({
    description: "Output in JSON format",
    default: false,
  })
  declare json: boolean;

  @flags.boolean({
    description: "Exit with error code if unhealthy",
    default: false,
  })
  declare strict: boolean;

  static options: CommandOptions = {
    startApp: true,
  };

  async run(): Promise<void> {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      disk: await this.checkDiskSpace(),
      memory: await this.checkMemory(),
    };

    const overall = Object.values(checks).every(
      (check) => check.status === "healthy",
    );

    if (this.json) {
      this.logger.info(
        JSON.stringify(
          {
            overall: overall ? "healthy" : "unhealthy",
            checks,
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
    } else {
      this.displayHealthReport(checks, overall);
    }

    if (this.strict && !overall) {
      this.exitCode = 1;
    }
  }

  private async checkDatabase(): Promise<{
    status: string;
    message: string;
    details?: any;
  }> {
    try {
      const start = Date.now();
      await Database.rawQuery("SELECT 1");
      const responseTime = Date.now() - start;

      return {
        status: "healthy",
        message: `Connected (${responseTime}ms)`,
        details: { responseTime },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        message: error.message,
      };
    }
  }

  private async checkRedis(): Promise<{
    status: string;
    message: string;
    details?: any;
  }> {
    try {
      const start = Date.now();
      await redis.ping();
      const responseTime = Date.now() - start;

      return {
        status: "healthy",
        message: `Connected (${responseTime}ms)`,
        details: { responseTime },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        message: error.message,
      };
    }
  }

  private async checkDiskSpace(): Promise<{
    status: string;
    message: string;
    details?: any;
  }> {
    try {
      const fs = await import("node:fs/promises");
      const stats = await fs.statfs(".");

      const total = stats.blocks * stats.bsize;
      const free = stats.bavail * stats.bsize;
      const used = total - free;
      const usedPercent = (used / total) * 100;

      const status = usedPercent > 90 ? "unhealthy" : "healthy";
      const message = `${usedPercent.toFixed(1)}% used`;

      return {
        status,
        message,
        details: {
          total: this.formatBytes(total),
          used: this.formatBytes(used),
          free: this.formatBytes(free),
          usedPercent: Math.round(usedPercent),
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        message: error.message,
      };
    }
  }

  private async checkMemory(): Promise<{
    status: string;
    message: string;
    details?: any;
  }> {
    const usage = process.memoryUsage();
    const total = usage.heapTotal;
    const used = usage.heapUsed;
    const usedPercent = (used / total) * 100;

    const status = usedPercent > 90 ? "unhealthy" : "healthy";
    const message = `${usedPercent.toFixed(1)}% used`;

    return {
      status,
      message,
      details: {
        heapTotal: this.formatBytes(usage.heapTotal),
        heapUsed: this.formatBytes(usage.heapUsed),
        external: this.formatBytes(usage.external),
        rss: this.formatBytes(usage.rss),
      },
    };
  }

  private displayHealthReport(checks: any, overall: boolean): void {
    this.logger.info(
      `System Health: ${overall ? "✅ HEALTHY" : "❌ UNHEALTHY"}`,
    );
    this.logger.info("");

    const table = this.ui.table();
    table.head(["Component", "Status", "Details"]);

    for (const [component, check] of Object.entries(checks)) {
      const status = check.status === "healthy" ? "✅ Healthy" : "❌ Unhealthy";
      table.row([
        component.charAt(0).toUpperCase() + component.slice(1),
        status,
        check.message,
      ]);
    }

    table.render();
  }

  private formatBytes(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }
}
```

### Command Registration

Commands are automatically discovered and registered. You can also manually register them:

```typescript
// start/kernel.ts
import { Kernel } from "@adonisjs/core/ace";

// ✅ Auto-discovery (default)
Kernel.defaultImports([
  () => import("#commands/create_user"),
  () => import("#commands/import_users"),
  () => import("#commands/system_health"),
]);
```

### Command Best Practices

#### DO's

```typescript
// ✅ Use descriptive command names
static commandName = 'user:create'
static commandName = 'import:users'
static commandName = 'system:health'

// ✅ Provide helpful descriptions
static description = 'Create a new user account with specified role and permissions'

// ✅ Use progress indicators for long operations
const progressBar = this.ui.progressBar()
progressBar.start(total, 0)

// ✅ Handle errors gracefully
try {
  await operation()
} catch (error) {
  this.logger.error(`Operation failed: ${error.message}`)
  this.exitCode = 1
}

// ✅ Validate inputs
if (!this.isValidEmail(email)) {
  this.logger.error('Invalid email address provided')
  this.exitCode = 1
  return
}

// ✅ Use transactions for database operations
const trx = await Database.transaction()
try {
  // operations
  await trx.commit()
} catch (error) {
  await trx.rollback()
  throw error
}
```

#### DON'Ts

```typescript
// ❌ Vague command names
static commandName = 'do-stuff'
static commandName = 'command1'

// ❌ No error handling
await riskyOperation() // Can fail silently

// ❌ No progress indication for long operations
for (let i = 0; i < 10000; i++) {
  await operation(i) // User has no feedback
}

// ❌ Not setting exit codes
if (error) {
  console.log('Error occurred') // Should set this.exitCode = 1
}
```

### Command Testing

```typescript
// tests/commands/create_user.spec.ts
import { test } from "@japa/runner";
import { AceFactory } from "@adonisjs/core/factories/ace";

test.group("CreateUser Command", () => {
  test("should create user with valid arguments", async ({ assert }) => {
    const ace = await new AceFactory().make();

    const command = await ace.exec("user:create", [
      "test@example.com",
      "Test User",
      "--password=password123",
      "--role=admin",
    ]);

    assert.equal(command.exitCode, 0);
    assert.isTrue(
      command.ui.logger.logs.some((log) =>
        log.message.includes("User test@example.com created successfully"),
      ),
    );

    const user = await User.findBy("email", "test@example.com");
    assert.exists(user);
    assert.equal(user?.role, "admin");
  });

  test("should fail with invalid email", async ({ assert }) => {
    const ace = await new AceFactory().make();

    const command = await ace.exec("user:create", [
      "invalid-email",
      "Test User",
    ]);

    assert.equal(command.exitCode, 1);
    assert.isTrue(
      command.ui.logger.logs.some((log) =>
        log.message.includes("Invalid email address provided"),
      ),
    );
  });
});
```

### Sources

- [Ace Commands Documentation](https://docs.adonisjs.com/guides/ace-commandline)
- [Creating Commands](https://docs.adonisjs.com/guides/ace-commandline#creating-commands)
- [Command Arguments and Flags](https://docs.adonisjs.com/guides/ace-commandline#arguments-and-flags)
- [Command Testing](https://docs.adonisjs.com/guides/testing#testing-ace-commands)
