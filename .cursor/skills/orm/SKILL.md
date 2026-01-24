---
name: podverse-orm-patterns
description: Common patterns for the podverse-orm package
version: 1.0.0
---

# Podverse ORM Development Patterns

This skill provides quick reference for common patterns used in the podverse-orm package.

## Monorepo Context

- **ORM package location**: `packages/orm/`
- **Database migrations**: `infra/database/main/migrations/`
- **Shared helpers**: `@podverse/helpers` (from `packages/helpers/`)

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@podverse/helpers` | Types and DTOs |
| `typeorm` | ORM framework |

## Patterns

### Entity Definition

```typescript
// packages/orm/src/entities/Podcast.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { Episode } from './Episode'

@Entity('podcast')
export class Podcast {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  title: string

  @Column({ nullable: true })
  description?: string

  @Column({ unique: true })
  feedUrl: string

  @Column({ nullable: true })
  imageUrl?: string

  @OneToMany(() => Episode, (episode) => episode.podcast)
  episodes: Episode[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
```

### Service Pattern

```typescript
// packages/orm/src/services/PodcastService.ts
import { getRepository } from 'typeorm'
import { Podcast } from '../entities/Podcast'

export const PodcastService = {
  async getById(id: string): Promise<Podcast | null> {
    const repo = getRepository(Podcast)
    return repo.findOne({ where: { id } })
  },

  async getByFeedUrl(feedUrl: string): Promise<Podcast | null> {
    const repo = getRepository(Podcast)
    return repo.findOne({ where: { feedUrl } })
  },

  async create(data: Partial<Podcast>): Promise<Podcast> {
    const repo = getRepository(Podcast)
    const podcast = repo.create(data)
    return repo.save(podcast)
  },

  async update(id: string, data: Partial<Podcast>): Promise<Podcast | null> {
    const repo = getRepository(Podcast)
    await repo.update(id, data)
    return this.getById(id)
  },

  async delete(id: string): Promise<void> {
    const repo = getRepository(Podcast)
    await repo.delete(id)
  }
}
```

### Query Builder Pattern

```typescript
// For complex queries
async findWithFilters(filters: PodcastFilters): Promise<Podcast[]> {
  const repo = getRepository(Podcast)
  const qb = repo.createQueryBuilder('podcast')

  if (filters.searchTerm) {
    qb.where('podcast.title ILIKE :term', { term: `%${filters.searchTerm}%` })
  }

  if (filters.category) {
    qb.andWhere('podcast.category = :category', { category: filters.category })
  }

  qb.orderBy('podcast.createdAt', 'DESC')
    .skip(filters.offset || 0)
    .take(filters.limit || 20)

  return qb.getMany()
}
```

### Relations Pattern

```typescript
// Loading relations
async getByIdWithEpisodes(id: string): Promise<Podcast | null> {
  const repo = getRepository(Podcast)
  return repo.findOne({
    where: { id },
    relations: ['episodes']
  })
}

// Eager vs Lazy loading
@OneToMany(() => Episode, (episode) => episode.podcast, { eager: false })
episodes: Episode[]
```

## Migration Patterns

Migrations are located in `infra/database/main/migrations/`.

### Creating a Migration

```bash
# Generate migration from entity changes
npm run typeorm migration:generate -- -n MigrationName

# Create empty migration
npm run typeorm migration:create -- -n MigrationName
```

### Migration Structure

```typescript
// infra/database/main/migrations/YYYYMMDDHHMMSS-AddPodcastCategory.ts
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddPodcastCategory1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('podcast', new TableColumn({
      name: 'category',
      type: 'varchar',
      isNullable: true
    }))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('podcast', 'category')
  }
}
```

## File Structure

```
packages/orm/
├── src/
│   ├── entities/        # TypeORM entities
│   ├── services/        # Data access services
│   ├── subscribers/     # Entity subscribers
│   └── index.ts         # Public exports
├── package.json
└── tsconfig.json

infra/database/main/
├── migrations/          # TypeORM migrations
└── seeds/               # Seed data (if any)
```

## Best Practices

1. **Always use services**: Don't access repositories directly from controllers
2. **Use transactions**: For operations that modify multiple entities
3. **Index properly**: Add indexes for frequently queried columns
4. **Validate at entity level**: Use class-validator decorators when appropriate
5. **Use DTOs**: Transform entities to DTOs before sending to clients

## Related Skills

- **[API Patterns](../api/SKILL.md)** - Using ORM in controllers
- **[Global Patterns](../global/SKILL.md)** - Monorepo conventions
