/** "Role" → "roles", "Library" → "libraries", "Business unit" → "business units". */
export const pluralLabel = (label: string) => {
  const word = label.toLowerCase();
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
  return `${word}s`;
};
