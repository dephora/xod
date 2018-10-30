import path from 'path';

export const BUNDLED_WORKSPACE_PATH = path.resolve(
  __dirname,
  '..',
  'bundle',
  'workspace'
);

export const BUNDLED_TABTEST_WORKSPACE_PATH = path.resolve(
  __dirname,
  '..',
  'bundle',
  'tabtest-workspace'
);

export const BUNDLED_TABTEST_SRC_PATH = path.resolve(
  __dirname,
  '..',
  'bundle',
  'tabtest-cpp'
);

export const BUNDLED_CATCH2_PATH = path.resolve(
  __dirname,
  '..',
  'bundle',
  'catch2'
);
