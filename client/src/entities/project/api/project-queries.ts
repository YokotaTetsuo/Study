import { queryOptions } from '@tanstack/react-query';

import { getProject, listProjects } from './project-api';

export const PROJECTS_QUERY_KEY = ['projects'] as const;

export const projectsQueryOptions = queryOptions({
  queryKey: PROJECTS_QUERY_KEY,
  queryFn: listProjects,
  retry: false,
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- queryOptions の戻り型推論を保持するため
export function projectQueryOptions(id: string) {
  return queryOptions({
    queryKey: [...PROJECTS_QUERY_KEY, id],
    queryFn: () => getProject(id),
    retry: false,
  });
}
