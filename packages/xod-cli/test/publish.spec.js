import { test } from '@oclif/test';
import { assert } from 'chai';
import path from 'path';
import process from 'process';
import fs from 'fs-extra';
import { bundledWorkspacePath, createWorkingDirectory } from './helpers';

// save process.exit for unmocking
const exit = process.exit;

// default inputs
const apiSuffixDefault = 'xod.io';
const apiSuffix = 'xod.lol';
const username = 'username';
const onBehalfUsername = 'bro';
const password = 'password';
const token = 'token';
const projectPath = path.resolve(bundledWorkspacePath, 'blink');

// nock mocks
const postAuthEndpoint = api =>
  api
    .post('/auth', {
      username,
      password,
    })
    .matchHeader('content-type', 'application/json')
    .reply(200, {
      access_token: token,
      refresh_token: 123,
    });

const postAuthEndpointFailed = api => api.post('/auth').reply(403);

const getUserEndpoint = api =>
  api.get(/users\/.*/).reply(200, {
    username,
    trusts: [],
  });

const getUserEndpointFailed404 = api => api.get(/users\/.*/).reply(404);

const getUserEndpointFailed500 = api => api.get(/users\/.*/).reply(500);

const getUserEndpointAnother = api =>
  api.get(`/users/${onBehalfUsername}`).reply(200, {
    username: onBehalfUsername,
    trusts: [username],
  });

const getUserEndpointAnotherWithoutTrust = api =>
  api.get(`/users/${onBehalfUsername}`).reply(200, {
    username: onBehalfUsername,
    trusts: [],
  });

const getLibEndpoint = api => api.get(/users\/.*\/libs\/.*/).reply(200, {});

const getLibEndpointFailed404 = api => api.get(/.*/).reply(404);

const getLibEndpointFailed500 = api => api.get(/.*/).reply(500);

const putLibEndpoint = api =>
  api
    .put(/users\/.*\/libs\/.*/)
    .matchHeader('content-type', 'application/json')
    .matchHeader('authorization', `Bearer ${token}`)
    .reply(200);

const putLibEndpointFailed = api => api.put(/users\/.*\/libs\/.*/).reply(404);

const putLibEndpointFailed403 = api =>
  api.put(/users\/.*\/libs\/.*/).reply(403);

const postVersionEndpoint = api =>
  api
    .post(/users\/.*\/libs\/.*\/versions/, {
      description: /.*/,
      folder: /.*/,
      semver: /.*/,
    })
    .matchHeader('content-type', 'application/json')
    .matchHeader('authorization', `Bearer ${token}`)
    .reply(200);

const postVersionEndpointFailed = api =>
  api.post(/users\/.*\/libs\/.*\/versions/).reply(403);

const postVersionEndpointFailed409 = api =>
  api.post(/users\/.*\/libs\/.*\/versions/).reply(409);

describe('xodc publish', () => {
  // working directory
  const wd = createWorkingDirectory('publish');

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

  // unmock process.exit
  afterEach(async () => {
    process.exit = exit;
  });

  const stdMock = test.stdout().stderr();

  stdMock
    .command(['publish', '--help'])
    .catch(/EEXIT: 0/)
    .it(`shows help in stdout, doesn't print to stderr, exits with 0`, ctx => {
      assert.include(ctx.stdout, 'ENTRYPOINT', 'ENTRYPOINT argument not found');
      assert.include(ctx.stdout, '--help', '--help flag not found');
      assert.include(ctx.stdout, '--password', '--password flag not found');
      assert.include(ctx.stdout, '--quiet', '--quiet flag not found');
      assert.include(ctx.stdout, '--username', '--username flag not found');
      assert.include(ctx.stdout, '--version', '--version flag not found');
      assert.include(ctx.stdout, '--api', '--api flag not found');
      assert.include(ctx.stdout, '--on-behalf', '--on-behalf flag not found');
      assert.equal(ctx.stderr, '', 'stderr should be emply');
    });

  stdMock
    .command(['publish', '--version'])
    .catch(/EEXIT: 0/)
    .it(
      `shows version in stdout, doesn't print to stderr and exits with 0`,
      ctx => {
        assert.include(ctx.stdout, 'xod-cli', 'version string not found');
        assert.equal(ctx.stderr, '', 'stderr should be emply');
      }
    );

  stdMock
    .env({ XOD_USERNAME: username })
    .env({ XOD_PASSWORD: password })
    .command(['publish'])
    .catch(/could not find project directory/)
    .it(
      `cannot find project without argument, prints error to stderr, non-zero exit code`,
      async () => {}
    );

  stdMock
    .env({ XOD_USERNAME: username })
    .env({ XOD_PASSWORD: password })
    .command([
      'publish',
      path.resolve(wd, 'kajsdhflkjsdhflkjashldkfjlkjasdfkjl'),
    ])
    .catch(/Tried to open not a xod file/)
    .it('fails when wrong path to project, exits with non-zero code', ctx => {
      assert.equal(ctx.stdout, '', 'stdout must be empty');
    });

  stdMock
    .nock(`http://pm.${apiSuffix}`, postAuthEndpointFailed)
    .env({ XOD_USERNAME: username })
    .env({ XOD_PASSWORD: password })
    .env({ XOD_API: apiSuffix })
    .env({ XOD_ONBEHALF: onBehalfUsername })
    .command(['publish', projectPath])
    .catch(/Forbidden/)
    .it(
      `can't authenticate, stderr with error, stdin is empty, non-zero exit`,
      ctx => {
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.notEqual(ctx.stderr, '', 'stderr must be with error');
      }
    );

  stdMock
    .nock(`http://pm.${apiSuffix}`, postAuthEndpoint)
    .nock(`http://pm.${apiSuffix}`, getUserEndpointFailed404)
    .env({ XOD_USERNAME: username })
    .env({ XOD_PASSWORD: password })
    .env({ XOD_API: apiSuffix })
    .env({ XOD_ONBEHALF: onBehalfUsername })
    .command(['publish', projectPath])
    .catch(/doesn't exist/)
    .it(
      `can't publish because user not found, stderr with error, stdin is empty, non-zero exit`,
      ctx => {
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.notEqual(ctx.stderr, '', 'stderr must be with error');
      }
    );

  stdMock
    .nock(`http://pm.${apiSuffix}`, postAuthEndpoint)
    .nock(`http://pm.${apiSuffix}`, getUserEndpointFailed500)
    .env({ XOD_USERNAME: username })
    .env({ XOD_PASSWORD: password })
    .env({ XOD_API: apiSuffix })
    .env({ XOD_ONBEHALF: onBehalfUsername })
    .command(['publish', projectPath])
    .catch(/Can't get user/)
    .it(
      `can't publish because of failed fetch of user, stderr with error, stdin is empty, non-zero exit`,
      ctx => {
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.notEqual(ctx.stderr, '', 'stderr must be with error');
      }
    );

  stdMock
    .nock(`http://pm.${apiSuffix}`, postAuthEndpoint)
    .nock(`http://pm.${apiSuffix}`, getUserEndpointAnotherWithoutTrust)
    .env({ XOD_USERNAME: username })
    .env({ XOD_PASSWORD: password })
    .env({ XOD_API: apiSuffix })
    .env({ XOD_ONBEHALF: onBehalfUsername })
    .command(['publish', projectPath])
    .catch(/access/)
    .it(
      `can't publish because of target users not trusts current user, stderr with error, stdin is empty, non-zero exit`,
      ctx => {
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.notEqual(ctx.stderr, '', 'stderr must be with error');
      }
    );

  stdMock
    .nock(`http://pm.${apiSuffix}`, postAuthEndpoint)
    .nock(`http://pm.${apiSuffix}`, getUserEndpointAnother)
    .nock(`http://pm.${apiSuffix}`, getLibEndpointFailed404)
    .nock(`http://pm.${apiSuffix}`, putLibEndpointFailed)
    .env({ XOD_USERNAME: username })
    .env({ XOD_PASSWORD: password })
    .env({ XOD_API: apiSuffix })
    .env({ XOD_ONBEHALF: onBehalfUsername })
    .command(['publish', projectPath])
    .catch(/Can't create library/)
    .it(
      `can't publish because of library not found and can't put new one, stderr with error, stdin is empty, non-zero exit`,
      ctx => {
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.notEqual(ctx.stderr, '', 'stderr must be with error');
      }
    );

  stdMock
    .nock(`http://pm.${apiSuffix}`, postAuthEndpoint)
    .nock(`http://pm.${apiSuffix}`, getUserEndpointAnother)
    .nock(`http://pm.${apiSuffix}`, getLibEndpointFailed500)
    .env({ XOD_USERNAME: username })
    .env({ XOD_PASSWORD: password })
    .env({ XOD_API: apiSuffix })
    .env({ XOD_ONBEHALF: onBehalfUsername })
    .command(['publish', projectPath])
    .catch(/Can't get library/)
    .it(
      `can't publish because of can't get library, stderr with error, stdin is empty, non-zero exit`,
      ctx => {
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.notEqual(ctx.stderr, '', 'stderr must be with error');
      }
    );

  stdMock
    .nock(`http://pm.${apiSuffix}`, postAuthEndpoint)
    .nock(`http://pm.${apiSuffix}`, getUserEndpointAnother)
    .nock(`http://pm.${apiSuffix}`, getLibEndpointFailed404)
    .nock(`http://pm.${apiSuffix}`, putLibEndpointFailed403)
    .env({ XOD_USERNAME: username })
    .env({ XOD_PASSWORD: password })
    .env({ XOD_API: apiSuffix })
    .env({ XOD_ONBEHALF: onBehalfUsername })
    .command(['publish', projectPath])
    .catch(/access/)
    .it(
      `can't publish because of library not found and access denied on creating, stderr with error, stdin is empty, non-zero exit`,
      ctx => {
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.notEqual(ctx.stderr, '', 'stderr must be with error');
      }
    );

  stdMock
    .nock(`http://pm.${apiSuffix}`, postAuthEndpoint)
    .nock(`http://pm.${apiSuffix}`, getUserEndpointAnother)
    .nock(`http://pm.${apiSuffix}`, getLibEndpointFailed404)
    .nock(`http://pm.${apiSuffix}`, putLibEndpoint)
    .nock(`http://pm.${apiSuffix}`, postVersionEndpointFailed)
    .env({ XOD_USERNAME: username })
    .env({ XOD_PASSWORD: password })
    .env({ XOD_API: apiSuffix })
    .env({ XOD_ONBEHALF: onBehalfUsername })
    .command(['publish', projectPath])
    .catch(/Can't publish/)
    .it(
      `can't publish because post version return unknown error, stderr with error, stdin is empty, non-zero exit`,
      ctx => {
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.notEqual(ctx.stderr, '', 'stderr must be with error');
      }
    );

  stdMock
    .nock(`http://pm.${apiSuffix}`, postAuthEndpoint)
    .nock(`http://pm.${apiSuffix}`, getUserEndpointAnother)
    .nock(`http://pm.${apiSuffix}`, getLibEndpointFailed404)
    .nock(`http://pm.${apiSuffix}`, putLibEndpoint)
    .nock(`http://pm.${apiSuffix}`, postVersionEndpointFailed409)
    .env({ XOD_USERNAME: username })
    .env({ XOD_PASSWORD: password })
    .env({ XOD_API: apiSuffix })
    .env({ XOD_ONBEHALF: onBehalfUsername })
    .command(['publish', projectPath])
    .catch(/exists/)
    .it(
      `can't publish because version exists, stderr with error, stdin is empty, non-zero exit`,
      ctx => {
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.notEqual(ctx.stderr, '', 'stderr must be with error');
      }
    );

  stdMock
    .nock(`https://pm.${apiSuffixDefault}`, postAuthEndpoint)
    .nock(`https://pm.${apiSuffixDefault}`, getUserEndpoint)
    .nock(`https://pm.${apiSuffixDefault}`, getLibEndpoint)
    .nock(`https://pm.${apiSuffixDefault}`, postVersionEndpoint)
    .command([
      'publish',
      `--username=${username}`,
      `--password=${password}`,
      projectPath,
    ])
    .it(
      `can publish library when good username and password from flag and default api suffix, stderr with messages, stdout is empty, exits with zero code`,
      ctx => {
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.notEqual(ctx.stderr, '', 'stdout must be with messages');
        assert.equal(process.exitCode, 0, 'exit code must be zero');
      }
    );

  stdMock
    .nock(`http://pm.${apiSuffix}`, postAuthEndpoint)
    .nock(`http://pm.${apiSuffix}`, getUserEndpointAnother)
    .nock(`http://pm.${apiSuffix}`, getLibEndpointFailed404)
    .nock(`http://pm.${apiSuffix}`, putLibEndpoint)
    .nock(`http://pm.${apiSuffix}`, postVersionEndpoint)
    .command([
      'publish',
      `--username=${username}`,
      `--password=${password}`,
      `--api=${apiSuffix}`,
      `--on-behalf=${onBehalfUsername}`,
      `--quiet`,
      projectPath,
    ])
    .it(
      `can publish library on behalf when good username, password from flag set, non-standart api from flag, on-behalf user from flag with with correct trusts, quiet, stderr is empty, stdout is empty, exits with zero code`,
      ctx => {
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.equal(ctx.stderr, '', 'stderr must be empty');
        assert.equal(process.exitCode, 0, 'exit code must be zero');
      }
    );

  stdMock
    .nock(`http://pm.${apiSuffix}`, postAuthEndpoint)
    .nock(`http://pm.${apiSuffix}`, getUserEndpointAnother)
    .nock(`http://pm.${apiSuffix}`, getLibEndpointFailed404)
    .nock(`http://pm.${apiSuffix}`, putLibEndpoint)
    .nock(`http://pm.${apiSuffix}`, postVersionEndpoint)
    .env({ XOD_USERNAME: username })
    .env({ XOD_PASSWORD: password })
    .env({ XOD_API: apiSuffix })
    .env({ XOD_ONBEHALF: onBehalfUsername })
    .command(['publish', `--quiet`, projectPath])
    .it(
      `can publish library on behalf when good username, password from flag set, non-standart api from flag, on-behalf user from flag with with correct trusts, quiet, stderr is empty, stdout is empty, exits with zero code (flags from ENV)`,
      ctx => {
        assert.equal(ctx.stdout, '', 'stdout must be empty');
        assert.equal(ctx.stderr, '', 'stderr must be empty');
        assert.equal(process.exitCode, 0, 'exit code must be zero');
      }
    );
});
