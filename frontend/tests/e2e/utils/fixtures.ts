import path from 'path';

export function getPublicFixturePath(fileName: string) {
  return path.join(__dirname, '../../../public', fileName);
}