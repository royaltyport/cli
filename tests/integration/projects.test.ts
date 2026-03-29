import { describe, it, expect } from 'vitest';
import { get, PROJECT_ID } from './setup.js';
import type { Project } from '../../src/types/index.js';

describe('Projects (integration)', () => {
  it('lists projects', async () => {
    const response = await get('/v1/projects');

    const projects = response.data as Project[];
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThan(0);
    expect(projects[0]).toHaveProperty('id');
    expect(projects[0]).toHaveProperty('name');
    expect(projects[0]).toHaveProperty('created_at');
  });

  it('gets a project by ID', async () => {
    const response = await get(`/v1/projects/${PROJECT_ID}`);

    const project = response.data as Project;
    expect(project.id).toBe(PROJECT_ID);
    expect(typeof project.name).toBe('string');
  });
});
