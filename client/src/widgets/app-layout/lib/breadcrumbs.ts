/**
 * パンくず（ナビゲーション動線）の構造を、現在のルートと params から純粋に導出する。
 * ルーター context に依存しないため Small テストで分岐を網羅できる。
 */

export type Crumb =
  | { readonly kind: 'home' }
  | { readonly kind: 'projects' }
  | { readonly kind: 'project-documents'; readonly projectId: string }
  | {
      readonly kind: 'document-detail';
      readonly projectId: string;
      readonly documentId: string;
    }
  | { readonly kind: 'project-settings'; readonly projectId: string };

export function crumbLabel(kind: Crumb['kind']): string {
  switch (kind) {
    case 'home':
      return 'ホーム';
    case 'projects':
      return 'プロジェクト';
    case 'project-documents':
      return '文書';
    case 'document-detail':
      return '文書詳細';
    case 'project-settings':
      return 'プロジェクト設定';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/**
 * リーフルートの routeId と params から、root → leaf 順のパンくず列を組み立てる。
 * 未知のルートでは「ホーム」のみを返す（少なくとも上位へ戻れる動線を保証する）。
 */
export function buildBreadcrumbTrail(
  routeId: string,
  params: Readonly<Record<string, string>>,
): readonly Crumb[] {
  const home: Crumb = { kind: 'home' };
  const projectId = params.projectId ?? '';
  const documentId = params.documentId ?? '';

  switch (routeId) {
    case '/':
      return [home];
    case '/projects':
      return [home, { kind: 'projects' }];
    case '/projects/$projectId/documents':
      return [
        home,
        { kind: 'projects' },
        { kind: 'project-documents', projectId },
      ];
    case '/projects/$projectId/documents/$documentId':
      return [
        home,
        { kind: 'projects' },
        { kind: 'project-documents', projectId },
        { kind: 'document-detail', projectId, documentId },
      ];
    case '/projects/$projectId/settings':
      return [
        home,
        { kind: 'projects' },
        { kind: 'project-settings', projectId },
      ];
    default:
      return [home];
  }
}
