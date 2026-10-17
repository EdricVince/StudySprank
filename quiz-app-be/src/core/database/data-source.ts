// DataSource for the TypeORM CLI (pnpm migration:run / migration:generate / migration:revert).
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { databaseOptions, ENTITIES } from './database.config';

dotenv.config();

export default new DataSource({
  ...databaseOptions((key) => process.env[key]),
  // The CLI applies migrations explicitly and must never auto-sync the schema.
  synchronize: false,
  migrationsRun: false,
  entities: ENTITIES,
});
