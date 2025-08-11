# TypeScript Best Practices Guide 2025

## Table of Contents
1. [Core Principles](#core-principles)
2. [Code Quality Standards](#code-quality-standards)
3. [Security Best Practices](#security-best-practices)
4. [Testing and Quality Assurance](#testing-and-quality-assurance)
5. [Modern Tooling and Ecosystem](#modern-tooling-and-ecosystem)
6. [Performance Guidelines](#performance-guidelines)

## Core Principles

### Modern TypeScript Development Standards

#### Strict Type Configuration
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true
  }
}
```

#### Embrace Modern Language Features
- Use ES2022+ features with confidence
- Leverage template literal types for enhanced type safety
- Adopt utility types (`Partial`, `Pick`, `Omit`, `Record`) over manual typing
- Utilize discriminated unions for complex state management

```typescript
// Template literal types
type EventName = `on${Capitalize<string>}`;
type ButtonEvent = `button${Capitalize<'click' | 'hover' | 'focus'>}`;

// Discriminated unions
type LoadingState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: unknown }
  | { status: 'error'; error: Error };
```

### Industry-Accepted Conventions and Patterns

#### SOLID Principles in TypeScript
```typescript
// Single Responsibility
interface UserValidator {
  validate(user: User): ValidationResult;
}

// Open/Closed Principle
abstract class Shape {
  abstract calculateArea(): number;
}

// Interface Segregation
interface Readable {
  read(): string;
}

interface Writable {
  write(data: string): void;
}
```

#### Composition over Inheritance
```typescript
// Prefer composition
interface Logger {
  log(message: string): void;
}

class ServiceWithLogging {
  constructor(private logger: Logger) {}
  
  performAction(): void {
    this.logger.log('Action performed');
  }
}

// Over inheritance
class BaseService {
  protected log(message: string): void {
    console.log(message);
  }
}
```

### Performance Optimization Guidelines

#### Type-Level Performance
- Use `const assertions` for immutable data
- Prefer `interface` over `type` for object types
- Avoid deep recursive types that can slow compilation
- Use generic constraints effectively

```typescript
// Const assertions for better inference
const themes = ['light', 'dark', 'auto'] as const;
type Theme = typeof themes[number]; // 'light' | 'dark' | 'auto'

// Efficient generic constraints
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
}
```

## Code Quality Standards

### Naming Conventions and Style Guidelines

#### Consistent Naming Patterns
```typescript
// PascalCase for types, interfaces, classes, enums
interface UserProfile {}
class ApiClient {}
enum UserRole { ADMIN, USER, GUEST }

// camelCase for variables, functions, methods
const userCount = 10;
function calculateTotal() {}

// SCREAMING_SNAKE_CASE for constants
const API_BASE_URL = 'https://api.example.com';

// kebab-case for file names
// user-profile.service.ts
// api-client.interface.ts
```

#### Interface and Type Naming
```typescript
// Avoid Hungarian notation prefixes
interface User {} // ✅ Good
interface IUser {} // ❌ Avoid

// Use descriptive suffixes when needed
interface UserCreateRequest {}
interface UserUpdatePayload {}
type UserRole = 'admin' | 'user' | 'guest';
```

### Code Organization and Structure

#### Project Structure
```
src/
├── types/           # Shared type definitions
├── interfaces/      # API and contract interfaces  
├── services/        # Business logic
├── utils/           # Utility functions
├── hooks/           # React hooks (if applicable)
├── components/      # UI components (if applicable)
└── __tests__/       # Test files
```

#### File Organization Patterns
```typescript
// Export types and implementations together
export interface UserService {
  getUser(id: string): Promise<User>;
}

export class UserServiceImpl implements UserService {
  async getUser(id: string): Promise<User> {
    // implementation
  }
}

// Use index files for clean imports
// src/services/index.ts
export { UserService, UserServiceImpl } from './user.service';
export { PaymentService } from './payment.service';
```

### Documentation Requirements

#### TSDoc Standards
```typescript
/**
 * Calculates the total price including tax and discounts.
 * 
 * @param basePrice - The base price before tax
 * @param taxRate - Tax rate as a decimal (0.1 for 10%)
 * @param discount - Optional discount amount
 * @returns The final calculated price
 * 
 * @example
 * ```typescript
 * const total = calculatePrice(100, 0.08, 10);
 * console.log(total); // 98
 * ```
 * 
 * @throws {Error} When basePrice is negative
 * @since 2.1.0
 */
function calculatePrice(
  basePrice: number, 
  taxRate: number, 
  discount = 0
): number {
  if (basePrice < 0) {
    throw new Error('Base price cannot be negative');
  }
  return basePrice * (1 + taxRate) - discount;
}
```

## Security Best Practices

### Common Security Vulnerabilities to Avoid

#### Input Validation and Sanitization
```typescript
// Use branded types for validated input
declare const __brand: unique symbol;
type Email = string & { [__brand]: 'Email' };
type UserId = string & { [__brand]: 'UserId' };

function validateEmail(input: string): Email | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input) ? input as Email : null;
}

// Use validation libraries
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email(),
  age: z.number().min(0).max(120),
  role: z.enum(['admin', 'user', 'guest'])
});

type User = z.infer<typeof UserSchema>;
```

#### Secure API Patterns
```typescript
// Never expose sensitive data in types
interface PublicUser {
  id: string;
  name: string;
  email: string;
  // password field omitted
}

interface PrivateUser extends PublicUser {
  passwordHash: string;
  internalNotes: string;
}

// Use readonly for immutable data
interface SecurityConfig {
  readonly apiKeys: readonly string[];
  readonly permissions: ReadonlyArray<Permission>;
}
```

### Secure Coding Patterns

#### Environment Variable Handling
```typescript
// Create a config validation system
const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  API_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
});

export const config = ConfigSchema.parse(process.env);

// Use branded types for sensitive data
type ApiKey = string & { readonly __brand: 'ApiKey' };
type DatabaseUrl = string & { readonly __brand: 'DatabaseUrl' };
```

### Dependency Management Security

#### Package.json Security
```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "scripts": {
    "audit": "npm audit --audit-level moderate",
    "outdated": "npm outdated"
  }
}
```

#### Type-Safe Environment Management
```typescript
// Use dotenv with validation
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().transform(Number),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
```

## Testing and Quality Assurance

### Testing Frameworks and Methodologies

#### Modern Testing Stack (2025)
```typescript
// Vitest configuration
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

#### Type-Safe Testing
```typescript
import { describe, it, expect, vi } from 'vitest';
import type { MockedFunction } from 'vitest';

// Type-safe mocking
interface DatabaseService {
  getUser(id: string): Promise<User>;
}

const mockDatabase: MockedFunction<DatabaseService['getUser']> = vi.fn();

describe('UserService', () => {
  it('should return user when found', async () => {
    const expectedUser: User = { id: '1', name: 'John' };
    mockDatabase.mockResolvedValue(expectedUser);
    
    const result = await userService.getUser('1');
    
    expect(result).toEqual(expectedUser);
    expect(mockDatabase).toHaveBeenCalledWith('1');
  });
});
```

### Code Coverage Expectations

#### Coverage Targets (2025 Standards)
- **Unit Tests**: 90%+ line coverage
- **Integration Tests**: 80%+ feature coverage
- **Critical Paths**: 100% coverage required
- **Type Coverage**: 95%+ with strict TypeScript

#### Testing Patterns
```typescript
// Property-based testing with fast-check
import fc from 'fast-check';

describe('utility functions', () => {
  it('should handle all string inputs', () => {
    fc.assert(fc.property(fc.string(), (input) => {
      const result = processString(input);
      expect(typeof result).toBe('string');
    }));
  });
});

// Snapshot testing for complex types
it('should match API response shape', () => {
  const response: ApiResponse<User> = {
    data: mockUser,
    meta: { total: 1, page: 1 }
  };
  
  expect(response).toMatchSnapshot();
});
```

### Quality Metrics and Tools

#### Essential Quality Tools
```json
{
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "prettier": "^3.0.0",
    "type-coverage": "^2.27.0",
    "knip": "^4.0.0",
    "publint": "^0.2.0"
  },
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "type-coverage": "type-coverage --at-least 95",
    "unused": "knip",
    "publint": "publint"
  }
}
```

## Modern Tooling and Ecosystem

### Recommended Development Tools

#### Essential 2025 TypeScript Stack
```json
{
  "dependencies": {
    "typescript": "^5.4.0"
  },
  "devDependencies": {
    "vitest": "^1.4.0",
    "tsx": "^4.7.0",
    "tsc-alias": "^1.8.0",
    "@biomejs/biome": "^1.6.0"
  }
}
```

#### Build Configuration
```typescript
// tsup.config.ts - Modern bundler
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  treeshake: true,
});
```

### Build and Deployment Practices

#### CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test:coverage
      - run: npm run build
```

#### Docker Configuration
```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### Popular Libraries and Frameworks (2025)

#### Recommended Libraries
```typescript
// Runtime validation
import { z } from 'zod';

// Date manipulation
import { DateTime } from 'luxon';

// HTTP client
import ky from 'ky';

// Functional programming
import { pipe, map, filter } from 'remeda';

// State management (if needed)
import { create } from 'zustand';
```

## Performance Guidelines

### Optimization Techniques

#### Bundle Optimization
```typescript
// Dynamic imports for code splitting
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Tree-shaking friendly exports
export { UserService } from './services/user.service';
export type { User, UserRole } from './types/user.types';

// Avoid barrel exports for large modules
// ❌ export * from './services';
// ✅ export { UserService } from './services/user.service';
```

#### Type-Level Performance
```typescript
// Use const assertions for better performance
const API_ENDPOINTS = {
  users: '/api/users',
  posts: '/api/posts'
} as const;

// Avoid complex recursive types
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object 
    ? DeepReadonly<T[P]> 
    : T[P];
};

// Prefer simpler alternatives
type ReadonlyUser = Readonly<User>;
```

### Monitoring and Profiling

#### Performance Monitoring
```typescript
// Performance measurement
class PerformanceMonitor {
  static measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      console.log(`${name} took ${duration.toFixed(2)}ms`);
    }
  }
}

// Memory usage tracking
function trackMemoryUsage(label: string): void {
  if (process.env.NODE_ENV === 'development') {
    const used = process.memoryUsage();
    console.log(`${label} - Memory usage:`, {
      rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100
    });
  }
}
```

### Resource Management

#### Memory Management
```typescript
// Use WeakMap for memory-efficient caching
const cache = new WeakMap<object, ComputedValue>();

function getComputedValue(obj: object): ComputedValue {
  if (cache.has(obj)) {
    return cache.get(obj)!;
  }
  
  const computed = expensiveComputation(obj);
  cache.set(obj, computed);
  return computed;
}

// Proper cleanup for event listeners
class EventManager {
  private controller = new AbortController();
  
  addEventListener(element: Element, event: string, handler: EventListener): void {
    element.addEventListener(event, handler, {
      signal: this.controller.signal
    });
  }
  
  cleanup(): void {
    this.controller.abort();
  }
}
```

#### Async Resource Management
```typescript
// Using AsyncDisposable (TC39 Stage 3)
class DatabaseConnection implements AsyncDisposable {
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

// Resource management with using
async function performDatabaseOperation() {
  await using connection = new DatabaseConnection();
  // Connection automatically disposed at end of scope
  return await connection.query('SELECT * FROM users');
}
```

---

This guide represents current TypeScript best practices for 2025, focusing on type safety, performance, security, and maintainability. Regularly review and update these practices as the ecosystem continues to evolve.

---

*Last Updated: 2025-08-11*
*Generated via automated Claude CLI rule updater*
