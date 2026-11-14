import {createDb} from './client';
import {LanguageRepository} from './repositories/language-repository';
import {ProblemRepository} from './repositories/problem-repository';
import {SEED_LANGUAGES, SEED_PROBLEMS} from './seed-data';

const url = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/arena';
const {db, pool} = createDb(url, 1);

await new LanguageRepository(db).upsertMany(SEED_LANGUAGES);
const problems = new ProblemRepository(db);
for (const problem of SEED_PROBLEMS) await problems.upsert(problem);

console.log(`Seeded ${SEED_LANGUAGES.length} languages and ${SEED_PROBLEMS.length} problems`);
await pool.end();
