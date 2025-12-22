import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: undefined | PrismaClient
}

let prisma: PrismaClient | undefined
let prismaPromise: Promise<PrismaClient> | undefined

function createDevClient(): PrismaClient {
  if (globalThis.prisma) return globalThis.prisma
  const client = new PrismaClient()
  globalThis.prisma = client
  return client
}

async function createProdClient(): Promise<PrismaClient> {
  // For Cloudflare Workers/Pages, use PrismaPg adapter with pg Pool
  // The adapter handles the database connection without native binaries
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const { Pool } = await import('pg')

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

async function getClient(): Promise<PrismaClient> {
  if (prisma) return prisma

  if (process.env.NODE_ENV === 'production') {
    if (!prismaPromise) {
      prismaPromise = createProdClient().then(client => {
        prisma = client
        return client
      })
    }
    return prismaPromise
  } else {
    prisma = createDevClient()
    return prisma
  }
}

// Create a proxy that handles nested property access (e.g., db.yearlyBudget.findFirst())
function createNestedProxy(clientPromise: Promise<PrismaClient>, path: string[] = []): any {
  return new Proxy(() => {}, {
    get(_target, prop: string | symbol) {
      if (typeof prop === 'symbol') return undefined
      return createNestedProxy(clientPromise, [...path, prop])
    },
    apply(_target, _thisArg, args) {
      return clientPromise.then(client => {
        let parent: any = client
        let result: any = client
        for (const key of path) {
          parent = result
          result = result[key]
        }
        if (typeof result === 'function') {
          return result.apply(parent, args)
        }
        return result
      })
    },
  })
}

const db = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'symbol') return undefined
    return createNestedProxy(getClient(), [prop])
  },
})

export default db
