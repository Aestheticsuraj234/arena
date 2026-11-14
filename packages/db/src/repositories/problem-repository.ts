import {asc, eq} from 'drizzle-orm';

import type {Database} from '../client';
import {problems, testCases} from '../schema';

export type Problem = typeof problems.$inferSelect;
export type TestCase = typeof testCases.$inferSelect;
export type ProblemWithTests = Problem & {testCases: TestCase[]};

export interface ProblemInput {
  slug: string;
  title: string;
  description: string;
  difficulty: Problem['difficulty'];
  timeLimitMs?: number;
  memoryLimitKb?: number;
  testCases: Array<{input: string; expectedOutput: string; isSample?: boolean}>;
}

/** Reads and writes problems together with their test cases. */
export class ProblemRepository {
  constructor(private readonly db: Database) {}

  list(): Promise<Problem[]> {
    return this.db.select().from(problems).orderBy(asc(problems.createdAt), asc(problems.slug));
  }

  /** The problem and all its test cases in order, or undefined. */
  async findBySlug(slug: string): Promise<ProblemWithTests | undefined> {
    const problem = await this.db.query.problems.findFirst({where: eq(problems.slug, slug)});
    if (!problem) return undefined;
    const tests = await this.db
      .select()
      .from(testCases)
      .where(eq(testCases.problemId, problem.id))
      .orderBy(asc(testCases.position));
    return {...problem, testCases: tests};
  }

  /** Creates or replaces a problem by slug, rewriting its test cases. */
  async upsert(input: ProblemInput): Promise<Problem> {
    return this.db.transaction(async (tx) => {
      const values = {
        slug: input.slug,
        title: input.title,
        description: input.description,
        difficulty: input.difficulty,
        timeLimitMs: input.timeLimitMs ?? 2000,
        memoryLimitKb: input.memoryLimitKb ?? 262_144,
      };
      const [problem] = await tx
        .insert(problems)
        .values(values)
        .onConflictDoUpdate({target: problems.slug, set: values})
        .returning();
      if (!problem) throw new Error(`Failed to upsert problem ${input.slug}`);

      await tx.delete(testCases).where(eq(testCases.problemId, problem.id));
      if (input.testCases.length > 0) {
        await tx.insert(testCases).values(
          input.testCases.map((tc, position) => ({
            problemId: problem.id,
            position,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isSample: tc.isSample ?? false,
          })),
        );
      }
      return problem;
    });
  }
}
