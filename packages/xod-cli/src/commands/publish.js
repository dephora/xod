import { exit } from 'process';
import { pick, pipeP } from 'ramda';
import * as xodFs from 'xod-fs';
import {
  getProjectName,
  getProjectDescription,
  getProjectVersion,
} from 'xod-project';
import { cli } from 'cli-ux';
import BaseCommand from '../baseCommand';
import * as commonArgs from '../args';
import * as myFlags from '../flags';
import * as msg from '../messages';
import {
  getAccessToken,
  getLib,
  getUser,
  postUserLib,
  putUserLib,
} from '../apis';

const packLibVersion = async projectDir => {
  const projectWithoutLibs = await xodFs.loadProjectWithoutLibs(
    await xodFs.findClosestProjectDir(projectDir)
  );
  const xodball = await xodFs.pack(projectWithoutLibs, {});
  return {
    libname: getProjectName(xodball),
    version: {
      description: getProjectDescription(xodball),
      folder: { 'xodball.json': JSON.stringify(xodball) },
      semver: `v${getProjectVersion(xodball)}`,
    },
  };
};

const createLibUri = (orgname, libname, tag) => ({
  orgname,
  libname,
  tag,
});

const uriToStringWithoutTag = libUri => `${libUri.orgname}/${libUri.libname}`;

const uriToString = libUri => `${uriToStringWithoutTag(libUri)}@${libUri.tag}`;

class PublishCommand extends BaseCommand {
  async run() {
    this.parseArgv(PublishCommand);
    await this.parseEntrypoint();
    const { api, 'on-behalf': onBehalf } = this.flags;
    const { projectPath } = this.args;

    // prompt for username and password if needed
    const username =
      this.flags.username || (await cli.prompt(msg.usernameFlagDescription));
    const password =
      this.flags.password ||
      (await cli.prompt(msg.passwordFlagDescription, { type: 'hide' }));

    const targetUsername = onBehalf || username;

    // load library
    const { libname, version } = await pipeP(
      () => this.cliActionStartPromise(msg.publishCommandLibLoading),
      () => packLibVersion(projectPath),
      this.tapCliActionStop()
    )();
    const libUri = createLibUri(targetUsername, libname, version.semver);

    // get user's access token
    const accessToken = await pipeP(
      () => this.cliActionStartPromise(msg.publishCommandAuthentication),
      () => getAccessToken(api, username, password),
      this.tapCliActionStop()
    )().catch(err =>
      this.die(msg.publishCommandAuthError(err.statusText || err))
    );

    // check that user exists
    await this.cliActionStartPromise(msg.publishCommandGetUser)
      .then(() => getUser(api, targetUsername))
      .catch(err => {
        if (err.status === 404) {
          this.die(msg.publishCommandUser404(targetUsername));
        } else {
          this.die(msg.publishCommandUserError(err));
        }
      })
      // check access rights
      .then(user => {
        if (
          user.username !== username &&
          user.trusts.indexOf(username) === -1
        ) {
          return this.die(
            msg.publishCommandAccessDenied(username, uriToString(libUri))
          );
        }
        return user;
      })
      .then(this.tapCliActionStop());

    const putLibrary = (user, name) =>
      pipeP(
        () => this.cliActionStartPromise(msg.publishCommandCreateLibrary),
        () => putUserLib(api, accessToken, user, name),
        this.tapCliActionStop()
      );

    // get library
    await this.cliActionStartPromise(msg.publishCommandGetLib)
      .then(() => getLib(api, targetUsername, libname))
      .then(this.tapCliActionStop())
      .catch(err => {
        this.cliActionStop();
        if (err.status !== 404) this.die(msg.publishCommandLibGetError(err));

        // put library
        return putLibrary(targetUsername, libname)().catch(err2 => {
          if (err2.status === 403) {
            this.die(
              msg.publishCommandAccessDenied(username, uriToString(libUri))
            );
          } else {
            this.die(msg.publishCommandLibPutError(err));
          }
        });
      });

    // post library
    await pipeP(
      () => this.cliActionStartPromise(msg.publishCommandLibPost),
      () => postUserLib(api, accessToken, targetUsername, libname, version),
      this.tapCliActionStop(),
      () => exit(0)
    )().catch(err => {
      if (err.status === 409) {
        this.die(msg.publishCommandVersionExists(uriToString(libUri)));
      } else {
        this.die(msg.publishCommandLibPostError(err));
      }
    });
  }
}

PublishCommand.aliases = ['p'];

PublishCommand.description = msg.publishCommandDescription;

PublishCommand.usage = msg.publishCommandUsage;

PublishCommand.flags = {
  ...BaseCommand.flags,
  ...pick(['api', 'password', 'username'], myFlags),
  'on-behalf': myFlags.onBehalf,
};

PublishCommand.args = [commonArgs.entrypoint];

PublishCommand.examples = msg.publishCommandExamples;

PublishCommand.strict = false;

export default PublishCommand;
