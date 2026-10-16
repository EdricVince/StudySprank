import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const TEACHER_DOMAIN = '@teacher.sprk';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  synchronize: false,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
});

async function createTeacher(name: string, password: string) {
  const email = `${name.toLowerCase().replace(/\s+/g, '.')}${TEACHER_DOMAIN}`;

  await AppDataSource.initialize();
  console.log('Connected to database');

  const existing: Array<{ id: number }> = await AppDataSource.query(
    'SELECT id FROM users WHERE email = $1',
    [email],
  );

  if (existing.length > 0) {
    console.error(`❌  Teacher account already exists: ${email}`);
    await AppDataSource.destroy();
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await AppDataSource.query(
    `INSERT INTO users (email, password, name, role_id, is_active)
     VALUES ($1, $2, $3, 2, true)`,
    [email, hashedPassword, name],
  );

  console.log(`✅  Teacher account created successfully!`);
  console.log(`    Email   : ${email}`);
  console.log(`    Password: ${password}`);
  console.log(`    Domain  : ${TEACHER_DOMAIN}`);

  await AppDataSource.destroy();
}

// Usage: ts-node src/scripts/create-teacher.ts "Teacher Name" "password123"
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: pnpm create-teacher "Teacher Name" "password"');
  console.error('Example: pnpm create-teacher "Nguyen Van A" "password123"');
  process.exit(1);
}

const [teacherName, password] = args;
createTeacher(teacherName, password).catch((err: unknown) => {
  console.error(
    'Failed to create teacher:',
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
