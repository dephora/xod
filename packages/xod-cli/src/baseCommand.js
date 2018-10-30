import path from 'path';
import fs from 'fs-extra';
import { cwd, exit, stderr } from 'process';
import cli from 'cli-ux';
import Command from '@oclif/command';
import {
  allPass,
  complement,
  compose,
  cond,
  either,
  isEmpty,
  isNil,
  pick,
  pipeP,
  startsWith,
  T,
  when,
} from 'ramda';
import {
  getPathToXodProject,
  isBasename,
  isWorkspaceValid,
  resolvePath,
  spawnWorkspaceFile,
} from 'xod-fs';
import { isValidPatchPath } from 'xod-project';
import * as myFlags from './flags';
import * as msg from './messages';

// convert (projectPath, patchPath) to patch name
const getPatchName = (projectPath, patchPath) =>
  cond([
    [isEmpty, () => null],
    [
      T,
      compose(
        name => `@/${name}`,
        when(isBasename('patch.xodp'), path.dirname)
      ),
    ],
  ])(path.relative(projectPath, patchPath));

// convert path to project/path and optional path name
// to full project path and patch name
const getProjectPathPatchName = (somePath, patch = null) => {
  const fullPath = resolvePath(somePath);
  return pipeP(
    p => fs.pathExists(p),
    exists =>
      exists
        ? getPathToXodProject(fullPath)
        : Promise.reject(new Error(msg.openNotAXodFile(fullPath))),
    projectPath =>
      compose(
        patchName => ({
          projectPath,
          patchName,
        }),
        when(allPass([complement(isNil), complement(isValidPatchPath)]), p => {
          throw new Error(msg.patchNotValidPath(p));
        }),
        cond([
          [either(isEmpty, isNil), () => getPatchName(projectPath, fullPath)],
          [T, when(complement(startsWith('@/')), x => `@/${x}`)],
        ])
      )(patch)
  )(fullPath);
};

class BaseCommand extends Command {
  async init() {
    this.flags = {
      quiet: false,
    };
    this.args = {};
  }

  // print normal log message to stderr and pass object
  info(note) {
    return obj => {
      if (!this.flags.quiet) stderr.write(`${note}\n`);
      return obj;
    };
  }

  // print fatal message and exit with non-zero code
  die(err) {
    if (!this.flags.quiet) {
      this.error(err.statusText || err.message || err);
    }
    return exit(1);
  }

  // cli action start and return promise
  cliActionStartPromise(note) {
    if (!this.flags.quiet) {
      cli.action.stop();
      cli.action.start(note);
    }
    return Promise.resolve();
  }

  // cli action stop
  cliActionStop() {
    if (!this.flags.quiet) cli.action.stop();
  }

  // cli action stop and pass promise
  tapCliActionStart(note) {
    return obj => {
      if (!this.flags.quiet) {
        cli.action.stop();
        cli.action.start(note);
      }
      return obj;
    };
  }

  // cli action start and pass promise
  tapCliActionStop() {
    return obj => {
      if (!this.flags.quiet) cli.action.stop();
      return obj;
    };
  }

  // parse flags and args
  parseArgv(cls) {
    const parsed = this.parse(cls);
    this.argv = parsed.argv;
    this.args = parsed.args;
    this.flags = parsed.flags;
  }

  // parse argv to projectPath and patchName
  async parseEntrypoint(argvs) {
    const argv = argvs || this.argv;
    const result = await getProjectPathPatchName(
      argv[0] || cwd(),
      argv[1] || null
    ).catch(err => this.die(err));
    this.args.projectPath = result.projectPath;
    this.args.patchName = result.patchName;
  }

  // ensure workspace
  async ensureWorkspace(wPath) {
    const targetPath = wPath || this.flags.workspace;
    const createWorkspace = where =>
      spawnWorkspaceFile(where).catch(err => {
        throw new Error(msg.workspaceFlagCreationFailed(err.path));
      });

    return (this.flags.workspace = await isWorkspaceValid(targetPath).catch(
      async e => {
        switch (e.errorCode) {
          case 'WORKSPACE_DIR_NOT_EXIST_OR_EMPTY':
            return createWorkspace(e.path);
          case 'INVALID_WORKSPACE_PATH':
            throw new Error(msg.workspaceFlagInvalid(e.path));
          default:
            throw new Error(msg.workspaceFlagCorrupt(e.path));
        }
      }
    ));
  }
}

BaseCommand.flags = pick(['help', 'version', 'quiet'], myFlags);

BaseCommand.action = cli.action;

export default BaseCommand;
