import type { TagScope } from '../lib/tags.js';

export interface Tag {
  id: number;
  tag: string;
  scope: TagScope;
  usage_count: number;
}

export interface TagsListOptions {
  page: string;
  perPage: string;
  search?: string;
  json?: boolean;
}

export interface TagsUpdateOptions {
  tags?: string;
  clearTags?: boolean;
  json?: boolean;
}

export interface UpdatedTag {
  id: number;
  tag: string;
}

export interface TagUpdateResult {
  resource_id: number;
  scope: TagScope;
  tags: UpdatedTag[];
}
