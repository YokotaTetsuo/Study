import { describe, expect, it } from 'vitest';

import { buildBreadcrumbTrail, crumbLabel } from './breadcrumbs';

const PROJECT_ID = '01HZX0PROJECT0000000000000';
const DOCUMENT_ID = '01HZX0DOCUMENT000000000000';

describe('buildBreadcrumbTrail', () => {
  it('should return only home for the index route', () => {
    expect(buildBreadcrumbTrail('/', {})).toEqual([{ kind: 'home' }]);
  });

  it('should return home → projects for the projects route', () => {
    expect(buildBreadcrumbTrail('/projects', {})).toEqual([
      { kind: 'home' },
      { kind: 'projects' },
    ]);
  });

  it('should include the project id for the documents route', () => {
    expect(
      buildBreadcrumbTrail('/projects/$projectId/documents', {
        projectId: PROJECT_ID,
      }),
    ).toEqual([
      { kind: 'home' },
      { kind: 'projects' },
      { kind: 'project-documents', projectId: PROJECT_ID },
    ]);
  });

  it('should include project and document ids for the document detail route', () => {
    expect(
      buildBreadcrumbTrail('/projects/$projectId/documents/$documentId', {
        projectId: PROJECT_ID,
        documentId: DOCUMENT_ID,
      }),
    ).toEqual([
      { kind: 'home' },
      { kind: 'projects' },
      { kind: 'project-documents', projectId: PROJECT_ID },
      {
        kind: 'document-detail',
        projectId: PROJECT_ID,
        documentId: DOCUMENT_ID,
      },
    ]);
  });

  it('should branch to settings for the project settings route', () => {
    expect(
      buildBreadcrumbTrail('/projects/$projectId/settings', {
        projectId: PROJECT_ID,
      }),
    ).toEqual([
      { kind: 'home' },
      { kind: 'projects' },
      { kind: 'project-settings', projectId: PROJECT_ID },
    ]);
  });

  it('should fall back to home only for an unknown route', () => {
    expect(buildBreadcrumbTrail('/totally/unknown', {})).toEqual([
      { kind: 'home' },
    ]);
  });

  it('should default missing params to empty strings', () => {
    expect(buildBreadcrumbTrail('/projects/$projectId/documents', {})).toEqual([
      { kind: 'home' },
      { kind: 'projects' },
      { kind: 'project-documents', projectId: '' },
    ]);
  });
});

describe('crumbLabel', () => {
  it.each([
    { kind: 'home', label: 'ホーム' },
    { kind: 'projects', label: 'プロジェクト' },
    { kind: 'project-documents', label: '文書' },
    { kind: 'document-detail', label: '文書詳細' },
    { kind: 'project-settings', label: 'プロジェクト設定' },
  ] as const)('should label $kind as $label', ({ kind, label }) => {
    expect(crumbLabel(kind)).toBe(label);
  });
});
