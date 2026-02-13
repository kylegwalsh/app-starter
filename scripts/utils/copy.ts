import fs from 'node:fs';
import path from 'node:path';

/** Recursively copy files and replace placeholders */
export const copyAndReplace = (src: string, dest: string, replacements: Record<string, string>) => {
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyAndReplace(path.join(src, file), path.join(dest, file), replacements);
    }
  } else {
    let content = fs.readFileSync(src, 'utf8');
    for (const [key, value] of Object.entries(replacements)) {
      content = content.replaceAll(`{{${key}}}`, value);
    }
    fs.writeFileSync(dest, content);
  }
};
