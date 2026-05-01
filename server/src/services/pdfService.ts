import fs from 'node:fs';
import pdf from 'pdf-parse';

export type ConvertedSection = {
  type: 'heading' | 'paragraph' | 'list' | 'table';
  title: string | null;
  content: string;
  sort_order: number;
};

const isLikelyHeading = (line: string) => {
  const cleaned = line.replace(/[^A-Za-z0-9\s:-]/g, '').trim();
  if (!cleaned || cleaned.length > 80) return false;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 10) return false;
  const upperRatio = cleaned.replace(/[^A-Z]/g, '').length / Math.max(1, cleaned.replace(/[^A-Za-z]/g, '').length);
  return upperRatio > 0.6 || /:$/.test(cleaned);
};

const isLikelyList = (line: string) => /^([\-•*]|\d+[.)])\s+/.test(line);
const isLikelyTable = (line: string) => line.includes('\t') || /\s{3,}/.test(line);

export async function convertPdfToSections(filePath: string): Promise<ConvertedSection[]> {
  try {
    if (!fs.existsSync(filePath)) return [];
    const buffer = fs.readFileSync(filePath);
    const data = await pdf(buffer);
    const raw = (data.text || '').replace(/\r/g, '\n');
    const chunks = raw.split(/\n{2,}/).map((c) => c.trim()).filter(Boolean);

    if (chunks.length === 0) return [];

    const sections: ConvertedSection[] = [];
    chunks.forEach((chunk, idx) => {
      const firstLine = chunk.split('\n')[0]?.trim() || '';
      let type: ConvertedSection['type'] = 'paragraph';
      if (isLikelyHeading(firstLine) && chunk.split('\n').length === 1) type = 'heading';
      else if (isLikelyList(firstLine)) type = 'list';
      else if (isLikelyTable(firstLine)) type = 'table';

      const sanitized = chunk.replace(/\u0000/g, '').trim();
      sections.push({
        type,
        title: type === 'heading' ? firstLine : null,
        content: type === 'heading' ? '' : sanitized,
        sort_order: idx,
      });
    });

    return sections;
  } catch {
    return [];
  }
}
