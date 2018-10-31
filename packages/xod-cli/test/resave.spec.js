import { test } from '@oclif/test';
import { assert } from 'chai';
import path from 'path';
import process from 'process';
import fs from 'fs-extra';
import { bundledWorkspacePath, createWorkingDirectory } from './helpers';

// save process.exit for unmocking
const exit = process.exit;

describe('xodc resave', () => {
  // working directory, workspace, src project path
  const wd = createWorkingDirectory('resave');
  const myWSPath = path.resolve(wd, 'workspace');
  const resaveSrcPath = path.resolve(bundledWorkspacePath, 'blink');

  // create working directory
  before(() => fs.ensureDir(wd));

  // remove workspace
  after(() => fs.remove(wd));

  // mock process.exit
  beforeEach(() => {
    process.exit = code => {
      process.exitCode = code;
    };
  });

  // unmock process.exit
  afterEach(() => {
    process.exit = exit;
  });

  const stdMock = test.stdout().stderr();

  stdMock
    .command(['resave', '--help'])
    .catch(/EEXIT: 0/)
    .it(`shows help in stdout, doesn't print to stderr, exits with 0`, ctx => {
      assert.include(ctx.stdout, 'ENTRYPOINT', 'ENTRYPOINT argument not found');
      assert.include(ctx.stdout, '--help', '--help flag not found');
      assert.include(ctx.stdout, '--output', '--output flag not found');
      assert.include(ctx.stdout, '--quiet', '--quiet flag not found');
      assert.include(ctx.stdout, '--version', '--version flag not found');
      assert.include(ctx.stdout, '--workspace', '--workspace flag not found');
      assert.equal(ctx.stderr, '', 'stderr should be emply');
    });

  stdMock
    .command(['resave', '--version'])
    .catch(/EEXIT: 0/)
    .it(
      `shows version in stdout, doesn't print to stderr and exits with 0`,
      ctx => {
        assert.include(ctx.stdout, 'xod-cli', 'version string not found');
        assert.equal(ctx.stderr, '', 'stderr should be emply');
      }
    );

  stdMock
    .command(['resave', `--workspace=${myWSPath}`])
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
    .command([
      'resave',
      `--workspace=${myWSPath}`,
      path.resolve(myWSPath, 'kajsdhflkjsdhflkjashldkfjlkjasdfkjl'),
    ])
    .catch(/Tried to open not a xod file/)
    .it('fails when wrong path to project, exits with non-zero code', ctx => {
      assert.equal(ctx.stdout, '', 'stdout must be empty');
    });

  stdMock
    .command(['resave', `--workspace=${myWSPath}`, resaveSrcPath])
    .it('prints xodball to stdout, messages to stderr and exit with 0', ctx => {
      const xodball = JSON.parse(ctx.stdout);
      assert.equal(xodball.name, 'blink', 'stdout must be json');
      assert.notEqual(ctx.stderr, '', 'stderr must be with messages');
      assert.equal(process.exitCode, 0, 'exit code must be zero');
    });

  stdMock
    .command([
      'resave',
      `--workspace=${myWSPath}`,
      `--output=${path.resolve(wd, 'blink.xodball')}`,
      resaveSrcPath,
    ])
    .it(
      'save xodball to xodball, prints status messages to stderr, stdout is empty, exit with 0',
      async ctx => {
        assert.isOk(
          await fs.pathExists(path.resolve(wd, 'blink.xodball')),
          'xodball should be created'
        );
        assert.notEqual(ctx.stderr, '', 'stderr must be full of messages');
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.equal(process.exitCode, 0, 'exit code must be zero');
      }
    );

  stdMock
    .env({ XOD_WORKSPACE: myWSPath })
    .env({ XOD_OUTPUT: path.resolve(wd, 'blink') })
    .command(['resave', '-q', resaveSrcPath])
    .it(
      'save xodball to directory, quiet flag (stderr is empty, stdout is empty), workspace and output flags from ENV, exit with 0',
      async ctx => {
        assert.isOk(
          await fs.pathExists(path.resolve(wd, 'blink')),
          'project directory should be created'
        );
        assert.equal(ctx.stderr, '', 'stderr must be empty');
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.equal(process.exitCode, 0, 'exit code must be zero');
      }
    );

  stdMock
    .env({ XOD_WORKSPACE: myWSPath })
    .env({ XOD_OUTPUT: '/dev/null/cantcreate' })
    .command(['resave', '-q', resaveSrcPath])
    .it(
      'fails on saving xodball to directory without write access, quiet flag (stderr is empty, stdout is empty), workspace and output flags from ENV, exit with non-zero',
      ctx => {
        assert.equal(ctx.stderr, '', 'stderr must be empty');
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.notEqual(process.exitCode, 0, 'exit code must be non-zero');
      }
    );
});
