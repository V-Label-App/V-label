# Coding Rules & Best Practices

## 🎯 Core Principles

### 1. **No Hardcoding**
Never hardcode values that might change across environments or deployments.

**❌ Bad:**
```typescript
const dbHost = 'localhost'
const apiUrl = 'http://localhost:4000'
const maxRetries = 3
```

**✅ Good:**
```typescript
const dbHost = process.env.DB_HOST || 'localhost'
const apiUrl = process.env.API_URL || 'http://localhost:4000'
const maxRetries = parseInt(process.env.MAX_RETRIES || '3')
```

### 2. **Environment Configuration**
All configuration must come from environment variables with sensible defaults.

**✅ Example:**
```typescript
// config/env.ts
export const config = {
  port: parseInt(process.env.PORT || '4000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    name: process.env.DB_NAME || 'vlabel_db',
  }
}
```

### 3. **Type Safety**
Use TypeScript strictly. No `any` types unless absolutely necessary.

**❌ Bad:**
```typescript
function processData(data: any) {
  return data.map((item: any) => item.value)
}
```

**✅ Good:**
```typescript
interface DataItem {
  id: string
  value: number
}

function processData(data: DataItem[]): number[] {
  return data.map(item => item.value)
}
```

### 4. **Error Handling**
Always handle errors gracefully with proper logging.

**❌ Bad:**
```typescript
try {
  await database.query(sql)
} catch (e) {
  console.log('Error')
}
```

**✅ Good:**
```typescript
try {
  await database.query(sql)
} catch (error) {
  logger.error('DATABASE', 'Query failed', {
    sql,
    error: error instanceof Error ? error.message : 'Unknown error'
  })
  throw error
}
```

### 5. **Database Queries**
Use parameterized queries to prevent SQL injection.

**❌ Bad:**
```typescript
const sql = `SELECT * FROM users WHERE email = '${email}'`
await pool.query(sql)
```

**✅ Good:**
```typescript
const sql = 'SELECT * FROM users WHERE email = $1'
await pool.query(sql, [email])
```

### 6. **Async/Await**
Use async/await instead of callbacks or raw promises.

**❌ Bad:**
```typescript
function getUser(id: string) {
  return pool.query('SELECT * FROM users WHERE id = $1', [id])
    .then(result => result.rows[0])
    .catch(err => console.error(err))
}
```

**✅ Good:**
```typescript
async function getUser(id: string): Promise<User | null> {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id])
    return result.rows[0] || null
  } catch (error) {
    logger.error('DATABASE', 'Failed to get user', { id, error })
    throw error
  }
}
```

### 7. **File Organization**
Keep related code together, separate concerns clearly.

```
src/
├── config/          # Configuration files
├── middlewares/     # Express middlewares
├── routes/          # API routes
├── services/        # Business logic
├── models/          # Data models/types
├── utils/           # Utility functions
└── migrations/      # Database migrations
```

### 8. **Naming Conventions**

**Variables & Functions:**
- Use `camelCase` for variables and functions
- Use descriptive names that explain purpose

```typescript
// ❌ Bad
const d = new Date()
const fn = () => {}

// ✅ Good
const currentDate = new Date()
const getUserById = () => {}
```

**Constants:**
- Use `UPPER_SNAKE_CASE` for true constants

```typescript
const MAX_RETRY_ATTEMPTS = 3
const DEFAULT_TIMEOUT_MS = 5000
```

**Types & Interfaces:**
- Use `PascalCase` for types and interfaces

```typescript
interface UserProfile {
  id: string
  email: string
}

type RequestStatus = 'pending' | 'success' | 'error'
```

### 9. **Code Comments**
Write self-documenting code. Use comments only when necessary.

**❌ Bad:**
```typescript
// Get user
const u = await getUser(id)
```

**✅ Good:**
```typescript
const user = await getUserById(id)

// Complex business logic that needs explanation
// We retry 3 times because the external API is unreliable
for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
  // ...
}
```

### 10. **DRY Principle**
Don't Repeat Yourself. Extract reusable logic.

**❌ Bad:**
```typescript
app.get('/users', async (req, res) => {
  try {
    const users = await getUsers()
    res.json(users)
  } catch (error) {
    logger.error('API', 'Error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/products', async (req, res) => {
  try {
    const products = await getProducts()
    res.json(products)
  } catch (error) {
    logger.error('API', 'Error', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
```

**✅ Good:**
```typescript
// middlewares/async-handler.ts
export const asyncHandler = (fn: RequestHandler) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next)
    } catch (error) {
      logger.error('API', 'Request failed', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

// routes/users.ts
app.get('/users', asyncHandler(async (req, res) => {
  const users = await getUsers()
  res.json(users)
}))
```

### 11. **Validation**
Validate all inputs at the boundary (API endpoints).

```typescript
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1)
})

app.post('/users', async (req, res) => {
  const validatedData = createUserSchema.parse(req.body)
  // Now validatedData is type-safe
})
```

### 12. **Logging**
Use structured logging with appropriate log levels.

```typescript
// ✅ Good
logger.info('SERVER', 'Server started', { port: 4000 })
logger.error('DATABASE', 'Connection failed', { host, port, error })
logger.debug('AUTH', 'Token validated', { userId })
```

### 13. **Security**

**Never log sensitive data:**
```typescript
// ❌ Bad
logger.info('User login', { email, password })

// ✅ Good
logger.info('User login', { email })
```

**Use environment variables for secrets:**
```typescript
// ❌ Bad
const jwtSecret = 'my-secret-key-123'

// ✅ Good
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  throw new Error('JWT_SECRET must be defined')
}
```

### 14. **Database Migrations**
Never modify existing migrations. Always create new ones.

```bash
# ✅ Good
npm run migration:create -- add_user_role_column
npm run migration
```

### 15. **Git Commits**
Write clear, descriptive commit messages.

```bash
# ❌ Bad
git commit -m "fix"
git commit -m "update"

# ✅ Good
git commit -m "fix: resolve database connection timeout issue"
git commit -m "feat: add user authentication endpoint"
git commit -m "refactor: extract validation logic to middleware"
```

## 📋 Code Review Checklist

Before submitting a PR, ensure:
- [ ] No hardcoded values
- [ ] All environment variables have defaults
- [ ] Proper error handling
- [ ] Type safety (no `any`)
- [ ] Parameterized database queries
- [ ] Meaningful variable names
- [ ] No duplicate code
- [ ] Input validation
- [ ] Appropriate logging
- [ ] No sensitive data in logs
- [ ] Tests added/updated (if applicable)

## 🚀 Performance Guidelines

1. **Use connection pooling** for databases
2. **Avoid N+1 queries** - use joins or batch queries
3. **Index database columns** used in WHERE clauses
4. **Cache frequently accessed data** when appropriate
5. **Use async operations** for I/O-bound tasks

## 📚 Resources

- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
