import { test } from '@oclif/test';
import { assert } from 'chai';
import path from 'path';
import process from 'process';
import fs from 'fs-extra';
import { bundledWorkspacePath, createWorkingDirectory } from './helpers';

// save process.exit for unmocking
const exit = process.exit;

describe('xodc transpile', () => {
  // working directory and workspace
  const wd = createWorkingDirectory('transpile');
  const myWSPath = path.resolve(wd, 'workspace');
  const outCppPath = path.resolve(wd, 'out.cpp');
  const projectSrcPath = path.resolve(bundledWorkspacePath, 'blink');

  // create working directory
  before(() => fs.ensureDir(wd));

  // remove working directory
  after(() => fs.remove(wd));

  // mock process.exit
  beforeEach(() => {
    process.exit = code => {
      process.exitCode = code;
    };
  });

  afterEach(async () => {
    // unmock process.exit
    process.exit = exit;
    // remove output file
    await fs.remove(outCppPath);
  });

  const stdMock = test.stdout().stderr();

  stdMock
    .command(['transpile', '--help'])
    .catch(/EEXIT: 0/)
    .it(`shows help in stdout, doesn't print to stderr, exits with 0`, ctx => {
      assert.include(ctx.stdout, 'ENTRYPOINT', 'ENTRYPOINT argument not found');
      assert.include(ctx.stdout, '--help', '--help flag not found');
      assert.include(ctx.stdout, '--output', '--output flag not found');
      assert.include(ctx.stdout, '--quiet', '--quiet flag not found');
      assert.include(ctx.stdout, '--version', '--version flag not found');
      assert.include(ctx.stdout, '--workspace', '--workspace flag not found');
      assert.include(ctx.stdout, '--debug', '--debug flag not found');
      assert.equal(ctx.stderr, '', 'stderr should be emply');
    });

  stdMock
    .command(['transpile', '--version'])
    .catch(/EEXIT: 0/)
    .it(
      `shows version in stdout, doesn't print to stderr and exits with 0`,
      ctx => {
        assert.include(ctx.stdout, 'xod-cli', 'version string not found');
        assert.equal(ctx.stderr, '', 'stderr should be emply');
      }
    );

  stdMock
    .command(['transpile', `--workspace=${myWSPath}`])
    .catch(/could not find project directory around/)
    .it(
      `cannot find project without argument, but creates workspace, stderr , non-zero exit code`,
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
      'transpile',
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
    .command(['transpile', projectSrcPath, 'asdfasdfasdfasdfasdfasdfasdf'])
    .catch(/ENTRY_POINT_PATCH_NOT_FOUND_BY_PATH/)
    .it('fails when wrong patch name, exits with non-zero code', ctx => {
      assert.equal(ctx.stdout, '', 'stdout must be empty');
    });

  stdMock
    .env({ XOD_WORKSPACE: myWSPath })
    .command(['transpile', `--output=${outCppPath}`, projectSrcPath])
    .it(
      'transpiles project (default patchname - main) to output path, stderr with messages, stdout is empty, exit with zero code',
      async ctx => {
        assert.isOk(
          await fs.pathExists(outCppPath),
          'output file should be created'
        );
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.notEqual(ctx.stderr, '', 'stderr must be full of messages');
        assert.equal(process.exitCode, 0, 'exit code must be zero');
      }
    );

  stdMock
    .env({ XOD_WORKSPACE: myWSPath })
    .env({ XOD_OUTPUT: outCppPath })
    .command(['transpile', '--quiet', projectSrcPath, '@/main'])
    .it(
      'transpiles project to output path (from ENV), stderr is empty, stdout is empty, exit with zero code',
      async ctx => {
        assert.isOk(
          await fs.pathExists(outCppPath),
          'output file should be created'
        );
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.equal(ctx.stderr, '', 'stderr must be empty');
        assert.equal(process.exitCode, 0, 'exit code must be zero');
      }
    );

  stdMock
    .env({ XOD_WORKSPACE: myWSPath })
    .command(['transpile', projectSrcPath])
    .it(
      'transpiles project (default patchname - main) to stdout, stderr with messages, exit with zero code',
      ctx => {
        assert.include(
          ctx.stdout,
          'namespace xod {',
          'stdout must containt C++ source'
        );
        assert.match(
          ctx.stdout,
          /^\/\/#define XOD_DEBUG$/gm,
          'debug must be disabled'
        );
        assert.notEqual(ctx.stderr, '', 'stderr must be with messages');
        assert.equal(process.exitCode, 0, 'exit code must be zero');
      }
    );

  stdMock
    .env({ XOD_WORKSPACE: myWSPath })
    .command(['transpile', '--debug', projectSrcPath])
    .it(
      'transpile project (default patchname - main) to stdout with debug on, stderr with messages, exit with zero code',
      ctx => {
        assert.include(
          ctx.stdout,
          'namespace xod {',
          'stdout must containt C++ source'
        );
        assert.match(
          ctx.stdout,
          /^#define XOD_DEBUG$/gm,
          'debug must be enabled'
        );
        assert.notEqual(ctx.stderr, '', 'stderr must be with messages');
        assert.equal(process.exitCode, 0, 'exit code must be zero');
      }
    );
});
