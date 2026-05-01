import fs from 'node:fs';
import pdf from 'pdf-parse';

export async function convertPdfToSections(filePath: string) {
  try {
    const data = await pdf(fs.readFileSync(filePath));
    const lines = data.text.split(/\n+/).map((l) => l.trim()).filter(Boolean);

    return lines.map((line, index) => {
      const likelyHeading = line.length < 70 && /^[A-Z0-9\s\-:]+$/.test(line);
      return {
        type: likelyHeading ? 'heading' : 'paragraph',
        title: likelyHeading ? line : null,
        content: likelyHeading ? '' : line,
        sort_order: index
      };
    });
  } catch {
    return [];
  }
}
