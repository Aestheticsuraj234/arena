/** Monaco language ID and a starter program for each Arena language slug. */
export const LANGUAGE_UI: Record<string, {monaco: string; starter: string}> = {
  python: {
    monaco: 'python',
    starter: `name = input().strip()
print(f"Hello, {name}!")
`,
  },
  javascript: {
    monaco: 'javascript',
    starter: `const input = require('fs').readFileSync(0, 'utf8').trim();
console.log(\`Hello, \${input}!\`);
`,
  },
  typescript: {
    monaco: 'typescript',
    starter: `import {readFileSync} from 'fs';

const input: string = readFileSync(0, 'utf8').trim();
console.log(\`Hello, \${input}!\`);
`,
  },
  c: {
    monaco: 'c',
    starter: `#include <stdio.h>

int main(void) {
  char name[64];
  scanf("%63s", name);
  printf("Hello, %s!\\n", name);
  return 0;
}
`,
  },
  cpp: {
    monaco: 'cpp',
    starter: `#include <iostream>
#include <string>

int main() {
  std::string name;
  std::cin >> name;
  std::cout << "Hello, " << name << "!" << std::endl;
}
`,
  },
  java: {
    monaco: 'java',
    starter: `import java.util.Scanner;

public class Main {
  public static void main(String[] args) {
    Scanner in = new Scanner(System.in);
    System.out.println("Hello, " + in.next() + "!");
  }
}
`,
  },
};

export const DEFAULT_LANGUAGE_ID = 71;

export function languageUi(slug: string | undefined) {
  return LANGUAGE_UI[slug ?? ''] ?? {monaco: 'plaintext', starter: ''};
}
