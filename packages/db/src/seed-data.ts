import type {NewLanguage} from './repositories/language-repository';
import type {ProblemInput} from './repositories/problem-repository';

/**
 * Languages Arena ships with. IDs match Judge0 CE so existing clients keep
 * working; names and versions describe Arena's own images (Chapter 3).
 */
export const SEED_LANGUAGES: NewLanguage[] = [
  {id: 50, slug: 'c', name: 'C', version: 'GCC 14'},
  {id: 54, slug: 'cpp', name: 'C++', version: 'GCC 14'},
  {id: 62, slug: 'java', name: 'Java', version: 'OpenJDK 21'},
  {id: 63, slug: 'javascript', name: 'JavaScript', version: 'Node.js 22'},
  {id: 71, slug: 'python', name: 'Python', version: '3.12'},
  {id: 74, slug: 'typescript', name: 'TypeScript', version: '5 (Node.js 22)'},
];

export const SEED_PROBLEMS: ProblemInput[] = [
  {
    slug: 'sum-of-two',
    title: 'Sum of Two Numbers',
    difficulty: 'easy',
    description:
      'Read two integers `a` and `b` separated by a space and print `a + b`.\n\n' +
      '**Constraints:** −10⁹ ≤ a, b ≤ 10⁹',
    testCases: [
      {input: '2 3\n', expectedOutput: '5\n', isSample: true},
      {input: '-4 10\n', expectedOutput: '6\n', isSample: true},
      {input: '1000000000 1000000000\n', expectedOutput: '2000000000\n'},
      {input: '0 0\n', expectedOutput: '0\n'},
    ],
  },
  {
    slug: 'reverse-string',
    title: 'Reverse a String',
    difficulty: 'easy',
    description: 'Read one line and print it reversed.',
    testCases: [
      {input: 'hello\n', expectedOutput: 'olleh\n', isSample: true},
      {input: 'arena\n', expectedOutput: 'anera\n', isSample: true},
      {input: 'a\n', expectedOutput: 'a\n'},
      {input: 'racecar\n', expectedOutput: 'racecar\n'},
    ],
  },
  {
    slug: 'fizzbuzz',
    title: 'FizzBuzz',
    difficulty: 'easy',
    description:
      'Read `n`. For each `i` from 1 to `n` print `FizzBuzz` if `i` is divisible by 15, ' +
      '`Fizz` if by 3, `Buzz` if by 5, otherwise `i`. One value per line.',
    testCases: [
      {input: '5\n', expectedOutput: '1\n2\nFizz\n4\nBuzz\n', isSample: true},
      {
        input: '15\n',
        expectedOutput: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n',
      },
      {input: '1\n', expectedOutput: '1\n'},
    ],
  },
];
