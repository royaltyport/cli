export interface KnowledgeSearchOptions {
  limit: string;
}

export interface KnowledgeSearchNode {
  id: number;
  kind: string;
  name: string;
  summary: string | null;
  claims: unknown[];
  relationships: unknown[];
}

export interface KnowledgeSearchResult {
  results: KnowledgeSearchNode[];
  freshness: {
    last_indexed_at: string | null;
    eventually_consistent: boolean;
  };
}
