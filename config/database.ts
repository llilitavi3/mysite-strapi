import path from 'path';
import type { Core } from '@strapi/strapi';

type SupportedClient = 'mysql' | 'mysql2' | 'postgres' | 'sqlite';
type EffectiveClient = 'mysql' | 'postgres' | 'sqlite';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Database => {
  const rawClient = env('DATABASE_CLIENT', 'sqlite') as SupportedClient;
  const client: EffectiveClient = rawClient === 'mysql2' ? 'mysql' : rawClient;
  const acquireConnectionTimeout = env.int('DATABASE_CONNECTION_TIMEOUT', 60000);

  // 1. MYSQL & MYSQL2 CONFIGURATION
  if (client === 'mysql') {
    return {
      connection: {
        client,
        connection: {
          host: env('DATABASE_HOST', 'localhost'),
          port: env.int('DATABASE_PORT', 3306),
          database: env('DATABASE_NAME', 'strapi'),
          user: env('DATABASE_USERNAME', 'strapi'),
          password: env('DATABASE_PASSWORD', 'strapi'),
          ssl: env.bool('DATABASE_SSL', false)
            ? {
                key: env('DATABASE_SSL_KEY', undefined),
                cert: env('DATABASE_SSL_CERT', undefined),
                ca: env('DATABASE_SSL_CA', undefined),
                capath: env('DATABASE_SSL_CAPATH', undefined),
                cipher: env('DATABASE_SSL_CIPHER', undefined),
                rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
              }
            : false,
        },
        pool: {
          min: env.int('DATABASE_POOL_MIN', 2),
          max: env.int('DATABASE_POOL_MAX', 10),
        },
        acquireConnectionTimeout,
      },
    } as unknown as Core.Config.Database;
  }

  // 2. POSTGRESQL CONFIGURATION
  if (client === 'postgres') {
    return {
      connection: {
        client: 'postgres',
        connection: {
          connectionString: env('DATABASE_URL', undefined),
          host: env('DATABASE_HOST', 'localhost'),
          port: env.int('DATABASE_PORT', 5432),
          database: env('DATABASE_NAME', 'strapi_db'),
          user: env('DATABASE_USERNAME', 'strapi_user'),
          password: env('DATABASE_PASSWORD', ''),
          ssl: env.bool('DATABASE_SSL', false)
            ? {
                key: env('DATABASE_SSL_KEY', undefined),
                cert: env('DATABASE_SSL_CERT', undefined),
                ca: env('DATABASE_SSL_CA', undefined),
                capath: env('DATABASE_SSL_CAPATH', undefined),
                cipher: env('DATABASE_SSL_CIPHER', undefined),
                rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
              }
            : false,
          schema: env('DATABASE_SCHEMA', 'public'),
        },
        pool: {
          min: env.int('DATABASE_POOL_MIN', 2),
          max: env.int('DATABASE_POOL_MAX', 10),
        },
        acquireConnectionTimeout,
      },
    } as unknown as Core.Config.Database;
  }

  // 3. SQLITE DEFAULT CONFIGURATION
  return {
    connection: {
      client: 'sqlite',
      connection: {
        filename: path.join(__dirname, '..', '..', env('DATABASE_FILENAME', '.tmp/data.db')),
      },
      useNullAsDefault: true,
      acquireConnectionTimeout,
    },
  } as unknown as Core.Config.Database;
};

export default config;
