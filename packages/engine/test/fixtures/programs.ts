/**
 * Small programs per language, shared by the image tests (Chapter 3) and the
 * executor tests (Chapters 4–5). Each `hello` reads a name from stdin and
 * prints `Hello, <name>!`.
 */
export const HELLO: Record<string, string> = {
  c: `#include <stdio.h>
int main(void) {
  char name[64];
  if (scanf("%63s", name) != 1) return 1;
  printf("Hello, %s!\\n", name);
  return 0;
}
`,
  cpp: `#include <iostream>
#include <string>
int main() {
  std::string name;
  std::cin >> name;
  std::cout << "Hello, " << name << "!" << std::endl;
}
`,
  java: `import java.util.Scanner;
public class Main {
  public static void main(String[] args) {
    Scanner in = new Scanner(System.in);
    System.out.println("Hello, " + in.next() + "!");
  }
}
`,
  javascript: `const name = require('fs').readFileSync(0, 'utf8').trim();
console.log(\`Hello, \${name}!\`);
`,
  python: `name = input().strip()
print(f"Hello, {name}!")
`,
  typescript: `import {readFileSync} from 'fs';
const name: string = readFileSync(0, 'utf8').trim();
console.log(\`Hello, \${name}!\`);
`,
};
