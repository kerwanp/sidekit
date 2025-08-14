---
parent: adonisjs
name: Models
description: Guidelines for Lucid ORM models and database operations in AdonisJS 6
type: rule
---

## Models and Lucid ORM

### Model Definition

Models MUST be placed in `app/models/` and follow these patterns:

#### Basic Model Structure

```typescript
// app/models/user.ts
import { DateTime } from "luxon";
import { BaseModel, column, hasMany } from "@adonisjs/lucid/orm";
import type { HasMany } from "@adonisjs/lucid/types/relations";
import Post from "./post.js";

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare email: string;

  @column()
  declare username: string;

  @column({ serializeAs: null }) // Don't serialize password
  declare password: string;

  @column()
  declare fullName: string;

  @column()
  declare isActive: boolean;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  // Relationships
  @hasMany(() => Post)
  declare posts: HasMany<typeof Post>;
}
```

#### Model Naming Conventions

- Model class names MUST be PascalCase and singular (e.g., `User`, `BlogPost`)
- File names MUST be snake_case and singular (e.g., `user.ts`, `blog_post.ts`)
- Table names are automatically inferred as snake_case plural (e.g., `users`, `blog_posts`)
- ALWAYS use explicit `declare` for TypeScript properties

### Column Decorators

```typescript
export default class User extends BaseModel {
  // ✅ Correct: Primary key
  @column({ isPrimary: true })
  declare id: number;

  // ✅ Correct: Custom column name
  @column({ columnName: "full_name" })
  declare fullName: string;

  // ✅ Correct: Don't serialize sensitive data
  @column({ serializeAs: null })
  declare password: string;

  // ✅ Correct: Custom serialization name
  @column({ serializeAs: "display_name" })
  declare fullName: string;

  // ✅ Correct: Data transformation
  @column({
    prepare: (value: string) => value.toLowerCase(),
    consume: (value: string) => value.toUpperCase(),
  })
  declare email: string;

  // ✅ Correct: Auto timestamps
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  // ✅ Correct: Custom datetime column
  @column.dateTime()
  declare lastLoginAt: DateTime | null;
}
```

### Relationships

```typescript
// app/models/user.ts
import { BaseModel, column, hasMany, hasOne } from "@adonisjs/lucid/orm";
import type { HasMany, HasOne } from "@adonisjs/lucid/types/relations";
import Post from "./post.js";
import Profile from "./profile.js";

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  // ✅ Correct: One-to-many relationship
  @hasMany(() => Post)
  declare posts: HasMany<typeof Post>;

  // ✅ Correct: One-to-one relationship
  @hasOne(() => Profile)
  declare profile: HasOne<typeof Profile>;

  // ✅ Correct: Custom foreign key
  @hasMany(() => Post, {
    foreignKey: "authorId",
  })
  declare posts: HasMany<typeof Post>;
}

// app/models/post.ts
import { BaseModel, column, belongsTo, manyToMany } from "@adonisjs/lucid/orm";
import type { BelongsTo, ManyToMany } from "@adonisjs/lucid/types/relations";
import User from "./user.js";
import Tag from "./tag.js";

export default class Post extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare userId: number;

  @column()
  declare title: string;

  // ✅ Correct: Belongs to relationship
  @belongsTo(() => User)
  declare author: BelongsTo<typeof User>;

  // ✅ Correct: Many-to-many relationship
  @manyToMany(() => Tag)
  declare tags: ManyToMany<typeof Tag>;

  // ✅ Correct: Custom pivot table
  @manyToMany(() => Tag, {
    pivotTable: "post_tags",
    pivotForeignKey: "post_id",
    pivotRelatedForeignKey: "tag_id",
  })
  declare tags: ManyToMany<typeof Tag>;
}
```

### Query Patterns

```typescript
// ✅ Correct: Basic queries
export default class UserService {
  async getAllUsers() {
    return await User.all();
  }

  async findUser(id: number) {
    return await User.find(id); // Returns null if not found
  }

  async findUserOrFail(id: number) {
    return await User.findOrFail(id); // Throws exception if not found
  }

  async findByEmail(email: string) {
    return await User.findBy("email", email);
  }

  // ✅ Correct: Query builder
  async getActiveUsers() {
    return await User.query()
      .where("isActive", true)
      .orderBy("createdAt", "desc")
      .limit(50);
  }

  // ✅ Correct: Queries with relationships
  async getUsersWithPosts() {
    return await User.query().preload("posts").where("isActive", true);
  }

  // ✅ Correct: Pagination
  async getUsersPaginated(page: number, limit: number = 20) {
    return await User.query().paginate(page, limit);
  }

  // ✅ Correct: Aggregation
  async getUserStats() {
    return await User.query().count("* as total").first();
  }
}
```

### Model Hooks

```typescript
// app/models/user.ts
import { BaseModel, column, beforeSave } from "@adonisjs/lucid/orm";
import hash from "@adonisjs/core/services/hash";

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare email: string;

  @column({ serializeAs: null })
  declare password: string;

  // ✅ Correct: Hash password before saving
  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await hash.make(user.password);
    }
  }

  // ✅ Correct: Custom methods
  async verifyPassword(plainPassword: string) {
    return await hash.verify(this.password, plainPassword);
  }
}
```

### Model Configuration

```typescript
export default class User extends BaseModel {
  // ✅ Correct: Custom table name
  static table = "app_users";

  // ✅ Correct: Custom primary key
  static primaryKey = "userId";

  // ✅ Correct: Self-assigned primary key (UUIDs)
  static selfAssignPrimaryKey = true;

  // ✅ Correct: Custom connection
  static connection = "pg";

  // ✅ Correct: Disable timestamps
  static timestamps = false;

  // ✅ Correct: Custom timestamp columns
  static createdAtColumn = "created_at";
  static updatedAtColumn = "updated_at";
}
```

### Scopes

```typescript
// app/models/user.ts
export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare isActive: boolean;

  @column()
  declare role: string;

  // ✅ Correct: Local scopes
  static scopeActive(query: any) {
    query.where("isActive", true);
  }

  static scopeByRole(query: any, role: string) {
    query.where("role", role);
  }
}

// Usage
const activeUsers = await User.query().active();
const admins = await User.query().byRole("admin");
```

### CRUD Operations

```typescript
export default class UserService {
  // ✅ Correct: Create
  async createUser(data: {
    email: string;
    password: string;
    fullName: string;
  }) {
    return await User.create(data);
  }

  // ✅ Correct: Update
  async updateUser(
    id: number,
    data: Partial<{ email: string; fullName: string }>,
  ) {
    const user = await User.findOrFail(id);
    user.merge(data);
    await user.save();
    return user;
  }

  // ✅ Correct: Delete
  async deleteUser(id: number) {
    const user = await User.findOrFail(id);
    await user.delete();
  }

  // ✅ Correct: Bulk operations
  async updateMultipleUsers(userIds: number[], data: any) {
    await User.query().whereIn("id", userIds).update(data);
  }
}
```

### Model Testing

```typescript
// tests/unit/models/user.spec.ts
import { test } from "@japa/runner";
import User from "#models/user";

test.group("User Model", () => {
  test("should hash password before saving", async ({ assert }) => {
    const user = new User();
    user.email = "test@example.com";
    user.password = "plaintext";

    await user.save();

    assert.notEqual(user.password, "plaintext");
    assert.isTrue(await user.verifyPassword("plaintext"));
  });

  test("should create user with valid data", async ({ assert }) => {
    const user = await User.create({
      email: "test@example.com",
      password: "password123",
      fullName: "Test User",
    });

    assert.equal(user.email, "test@example.com");
    assert.equal(user.fullName, "Test User");
    assert.exists(user.id);
  });
});
```

### Common Anti-Patterns

```typescript
// ❌ Incorrect: Raw queries in controllers
async index({ response }: HttpContext) {
  const users = await Database.rawQuery('SELECT * FROM users')
  return response.json(users)
}

// ✅ Correct: Use model methods
async index({ response }: HttpContext) {
  const users = await User.all()
  return response.json(users)
}

// ❌ Incorrect: Not using relationships
async getUserPosts(userId: number) {
  const posts = await Database.from('posts').where('user_id', userId)
  return posts
}

// ✅ Correct: Use relationships
async getUserPosts(userId: number) {
  const user = await User.query()
    .where('id', userId)
    .preload('posts')
    .firstOrFail()

  return user.posts
}

// ❌ Incorrect: Not using query builder
async searchUsers(searchTerm: string) {
  const sql = `SELECT * FROM users WHERE email LIKE '%${searchTerm}%'`
  return await Database.rawQuery(sql)
}

// ✅ Correct: Use query builder
async searchUsers(searchTerm: string) {
  return await User.query()
    .where('email', 'like', `%${searchTerm}%`)
    .orWhere('fullName', 'like', `%${searchTerm}%`)
}
```

### Sources

- [Lucid ORM Documentation](https://lucid.adonisjs.com)
- [Models Guide](https://lucid.adonisjs.com/docs/models)
- [Relationships](https://lucid.adonisjs.com/docs/relationships)
- [Query Builder](https://lucid.adonisjs.com/docs/select-query-builder)
