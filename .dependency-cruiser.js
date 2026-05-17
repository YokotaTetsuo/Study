/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    // ── パッケージ間境界 ──────────────────────────────────────────────
    // shared は他パッケージに依存しない
    {
      name: 'no-cross-pkg-from-shared',
      severity: 'error',
      from: { path: '^shared/src/' },
      to: { path: '^(client|server|infra)/src/' },
    },
    // client → server: type-only のみ許可
    {
      name: 'no-cross-pkg-from-client-to-server',
      severity: 'error',
      from: { path: '^client/src/' },
      to: {
        path: '^server/src/',
        dependencyTypesNot: ['type-only'],
      },
    },
    // client → infra: 完全禁止
    {
      name: 'no-cross-pkg-from-client-to-infra',
      severity: 'error',
      from: { path: '^client/src/' },
      to: { path: '^infra/src/' },
    },
    // server は client・infra に依存しない
    {
      name: 'no-cross-pkg-from-server',
      severity: 'error',
      from: { path: '^server/src/' },
      to: { path: '^(client|infra)/src/' },
    },
    // infra は client・shared に依存しない (server は可)
    {
      name: 'no-cross-pkg-from-infra',
      severity: 'error',
      from: { path: '^infra/src/' },
      to: { path: '^(client|shared)/src/' },
    },

    // ── server 内レイヤー依存方向ガード ──────────────────────────────
    // domain → application / adapters / infrastructure は禁止
    {
      name: 'layer-domain-no-upstream',
      severity: 'error',
      from: { path: '^server/src/[^/]+/domain/' },
      to: {
        path: '^server/src/[^/]+/(application|adapters)/|^server/src/infrastructure/',
      },
    },
    // application → adapters / infrastructure は禁止
    {
      name: 'layer-application-no-upstream',
      severity: 'error',
      from: { path: '^server/src/[^/]+/application/' },
      to: {
        path: '^server/src/[^/]+/adapters/|^server/src/infrastructure/',
      },
    },
    // adapters → infrastructure は禁止
    {
      name: 'layer-adapters-no-upstream',
      severity: 'error',
      from: { path: '^server/src/[^/]+/adapters/' },
      to: { path: '^server/src/infrastructure/' },
    },

    // ── FSD レイヤー依存方向ガード ────────────────────────────────────
    // shared は pages/app に依存しない
    {
      name: 'fsd-shared-no-upstream',
      severity: 'error',
      from: { path: '^client/src/shared/' },
      to: { path: '^client/src/(pages|app)/' },
    },
    // pages は app に依存しない
    {
      name: 'fsd-pages-no-upstream',
      severity: 'error',
      from: { path: '^client/src/pages/' },
      to: { path: '^client/src/app/' },
    },
    // features 内のクロススライス依存は禁止
    {
      name: 'fsd-no-cross-slice-features',
      severity: 'error',
      from: { path: '^client/src/features/([^/]+)/' },
      to: {
        path: '^client/src/features/',
        pathNot: '^client/src/features/$1/',
      },
    },
    // entities 内のクロススライス依存は禁止
    {
      name: 'fsd-no-cross-slice-entities',
      severity: 'error',
      from: { path: '^client/src/entities/([^/]+)/' },
      to: {
        path: '^client/src/entities/',
        pathNot: '^client/src/entities/$1/',
      },
    },
    // ── shared-kernel 分離 ──────────────────────────────────────────────
    // shared-kernel は server/src/ 内の他モジュールに依存しない
    {
      name: 'shared-kernel-isolation',
      severity: 'error',
      from: { path: '^server/src/shared-kernel/' },
      to: { path: '^server/src/', pathNot: '^server/src/shared-kernel/' },
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    // 本リポ向け改善: 上流は `\\.(test|spec)\\.ts$` で .tsx を除外できない。
    // client(tsx) のテストも依存検査対象外にするため tsx を含める。
    exclude: { path: '\\.(test|spec)\\.tsx?$' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
  },
};
