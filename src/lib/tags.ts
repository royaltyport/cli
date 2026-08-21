export const TAG_SCOPES = ['contracts', 'statements'] as const;
export type TagScope = (typeof TAG_SCOPES)[number];

const MAX_TAG_NAMES = 50;
const MAX_TAG_NAME_LENGTH = 200;

export function parseTagScope(value: string): TagScope {
  if ((TAG_SCOPES as readonly string[]).includes(value)) return value as TagScope;
  throw new Error(`Tag scope must be one of: ${TAG_SCOPES.join(', ')}`);
}

export function parseTagNames(value: string): string[] {
  const tags = [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))];
  if (tags.length > MAX_TAG_NAMES) throw new Error(`A maximum of ${MAX_TAG_NAMES} tag names is allowed`);
  const tooLong = tags.find((tag) => tag.length > MAX_TAG_NAME_LENGTH);
  if (tooLong) throw new Error(`Tag names may not exceed ${MAX_TAG_NAME_LENGTH} characters`);
  return tags;
}

export function buildTagReplacement(tags: string | undefined, clearTags: boolean | undefined): string[] {
  if (tags !== undefined && clearTags) throw new Error('Use either --tags or --clear-tags, not both');
  if (clearTags) return [];
  if (tags === undefined) throw new Error('Provide --tags <list> or --clear-tags');
  return parseTagNames(tags);
}
