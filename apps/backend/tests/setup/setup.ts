import { db } from '@/db';

// Get all model names from the Prisma schema
const modelNames = Object.keys(db).filter(
  (key) =>
    typeof db[key as keyof typeof db] === 'object' &&
    'deleteMany' in db[key as keyof typeof db]
);

// Reset some things before each test runs
beforeEach(async () => {
  // Clear prisma database between tests
  const deleteOperations = modelNames.map((modelName) =>
    // biome-ignore lint/suspicious/noExplicitAny: We can't explicitly type the db models here
    (db[modelName as keyof typeof db] as any).deleteMany()
  );
  await db.$transaction(deleteOperations);
});
