import { test } from '@oclif/test';
import { assert } from 'chai';
import path from 'path';
import process from 'process';
import os from 'os';
import fs from 'fs-extra';
import { bundledWorkspacePath, createWorkingDirectory } from './helpers';

// save process.exit for unmocking
const exit = process.exit;

describe('xodc tabtest', () => {
  // working directory, workspace, tabtest output
  const wd = createWorkingDirectory('tabtest');
  const myWSPath = path.resolve(wd, 'workspace');
  const tabtestOutDir = path.resolve(wd, 'tabtests');

  // create working directory
  before(() => fs.ensureDirSync(wd));

  // remove working directory
  after(() =>
    Promise.all([
      fs.remove(wd),
      fs.remove(path.resolve(os.tmpdir(), 'xod-tabtest')),
    ])
  );

  // mock process.exit
  beforeEach(() => {
    process.exit = code => {
      process.exitCode = code;
    };
  });

  afterEach(() => {
    // unmock process.exit
    process.exit = exit;
    // clean out tabtest working directory
    fs.removeSync(tabtestOutDir);
  });

  const stdMock = test.stdout().stderr();

  stdMock
    .command(['tabtest', '--help'])
    .catch(/EEXIT: 0/)
    .it(`shows help in stdout, doesn't print to stderr, exits with 0`, ctx => {
      assert.include(ctx.stdout, 'ENTRYPOINT', 'ENTRYPOINT argument not found');
      assert.include(ctx.stdout, '--help', '--help flag not found');
      assert.include(ctx.stdout, '--no-build', '--no-build flag not found');
      assert.include(ctx.stdout, '--output-dir', '--output-dir flag not found');
      assert.include(ctx.stdout, '--quiet', '--quiet flag not found');
      assert.include(ctx.stdout, '--version', '--version flag not found');
      assert.include(ctx.stdout, '--workspace', '--workspace flag not found');
      assert.equal(ctx.stderr, '', 'stderr should be emply');
    });

  stdMock
    .command(['tabtest', '--version'])
    .catch(/EEXIT: 0/)
    .it(
      `shows version in stdout, doesn't print to stderr and exits with 0`,
      ctx => {
        assert.include(ctx.stdout, 'xod-cli', 'version string not found');
        assert.equal(ctx.stderr, '', 'stderr should be emply');
      }
    );

  stdMock
    .command(['tabtest', `--workspace=${myWSPath}`])
    .catch(/could not find project directory around/)
    .it(
      `cannot find project without argument, but creates workspace, prints error to stderr, non-zero exit code`,
      async () => {
        assert.isOk(
          await fs.pathExists(path.resolve(myWSPath, '.xodworkspace')),
          'workspace should be created'
        );
      }
    );

  stdMock
    .env({ XOD_WORKSPACE: myWSPath })
    .command([
      'tabtest',
      path.resolve(myWSPath, 'kajsdhflkjsdhflkjashldkfjlkjasdfkjl'),
    ])
    .catch(/Tried to open not a xod file/)
    .it(
      'fails when wrong path to project, workspace from ENV, exits with non-zero code',
      ctx => {
        assert.equal(ctx.stdout, '', 'stdout must be empty');
      }
    );

  stdMock
    .env({ XOD_WORKSPACE: myWSPath })
    .command([
      'tabtest',
      path.resolve(bundledWorkspacePath, '__lib__', 'xod', 'bits'),
      'asdfasdfasdfasdfasdfasdfasdf',
    ])
    .catch(/does not exist in the project/)
    .it('fails when wrong patch name, exits with non-zero code', ctx => {
      assert.equal(ctx.stdout, '', 'stdout must be empty');
    });

  stdMock
    .env({ XOD_WORKSPACE: myWSPath })
    .command([
      'tabtest',
      `--output-dir=${tabtestOutDir}`,
      '--no-build',
      path.resolve(bundledWorkspacePath, '__lib__', 'xod', 'bits'),
    ])
    .it(
      'create output dir, run tests for whole project, but do not build (--no-build), stderr with messages, stdout is empty, exit with zero code',
      async ctx => {
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.notEqual(ctx.stderr, '', 'stderr must be with messages');
        assert.equal(process.exitCode, 0, 'exit code must be zero');
        assert.isOk(
          await fs.pathExists(tabtestOutDir),
          'output dir should be created'
        );
        assert.isOk(
          await fs.pathExists(
            path.resolve(tabtestOutDir, 'bcd-to-dec.sketch.cpp')
          ),
          'tabtest sketch must be copied'
        );
      }
    );

  stdMock
    .env({ XOD_WORKSPACE: myWSPath })
    .env({ XOD_OUTPUT: tabtestOutDir })
    .command([
      'tabtest',
      '--no-build',
      '--quiet',
      path.resolve(
        bundledWorkspacePath,
        '__lib__',
        'xod',
        'bits',
        'bcd-to-dec',
        'patch.xodp'
      ),
    ])
    .it(
      'create output dir, run tests for patch by full path, but do not build (--no-build), stderr with messages, stdout is empty, exit with zero code',
      async ctx => {
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.equal(ctx.stderr, '', 'stderr must be empty');
        assert.equal(process.exitCode, 0, 'exit code must be zero');
        assert.isOk(
          await fs.pathExists(tabtestOutDir),
          'output dir should be created'
        );
        assert.isOk(
          await fs.pathExists(
            path.resolve(tabtestOutDir, 'bcd-to-dec.sketch.cpp')
          ),
          'tabtest sketch must be copied'
        );
      }
    );

  stdMock
    .env({ XOD_WORKSPACE: myWSPath })
    .env({ XOD_OUTPUT: tabtestOutDir })
    .command([
      'tabtest',
      '--no-build',
      '--quiet',
      path.resolve(bundledWorkspacePath, '__lib__', 'xod', 'bits'),
      'bcd-to-dec',
    ])
    .it(
      'create output dir, run tests for patch by project path + short patch name, but do not build (--no-build), stderr with messages, stdout is empty, exit with zero code',
      async ctx => {
        assert.isOk(
          await fs.pathExists(tabtestOutDir),
          'output dir should be created'
        );
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.equal(ctx.stderr, '', 'stderr must be empty');
        assert.equal(process.exitCode, 0, 'exit code must be zero');
        assert.isOk(
          await fs.pathExists(
            path.resolve(tabtestOutDir, 'bcd-to-dec.sketch.cpp')
          ),
          'tabtest sketch must be copied'
        );
      }
    );

  stdMock
    .env({ XOD_WORKSPACE: myWSPath })
    .env({ XOD_OUTPUT: tabtestOutDir })
    .command([
      'tabtest',
      '--quiet',
      path.resolve(bundledWorkspacePath, '__lib__', 'xod', 'bits'),
      '@/bcd-to-dec',
    ])
    .it(
      'create output dir, run tests for patch by project path + long patch name, build, stderr with messages, stdout is empty, exit with zero code',
      async ctx => {
        assert.isOk(
          await fs.pathExists(tabtestOutDir),
          'output dir should be created'
        );
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.equal(ctx.stderr, '', 'stderr must be empty');
        assert.equal(process.exitCode, 0, 'exit code must be zero');
        assert.isOk(
          await fs.pathExists(path.resolve(tabtestOutDir, 'bcd-to-dec.run')),
          'tabtest must be compiled'
        );
      }
    );
});
