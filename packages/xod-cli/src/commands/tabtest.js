import path from 'path';
import { exit } from 'process';
import { tmpdir } from 'os';
import { append, curry, identity, map, pick, pipeP, toPairs } from 'ramda';
import fs from 'fs-extra';
import { flags } from '@oclif/command';

import childProcess from 'child_process';
import { foldEither, allPromises } from 'xod-func-tools';
import { loadProject } from 'xod-fs';
import * as Tabtest from 'xod-tabtest';

import BaseCommand from '../baseCommand';
import * as commonArgs from '../args';
import * as myFlags from '../flags';
import {
  BUNDLED_WORKSPACE_PATH,
  BUNDLED_TABTEST_WORKSPACE_PATH,
  BUNDLED_TABTEST_SRC_PATH,
  BUNDLED_CATCH2_PATH,
} from '../constants';
import * as msg from '../messages';

const spawn = (cmd, args, opts) =>
  new Promise((resolve, reject) => {
    childProcess.spawn(cmd, args, opts).on('exit', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(msg.tabtestCommandExitedWithCode(cmd, code));
      }
    });
  });

const saveOutFile = (outDir, [filename, content]) =>
  fs.outputFile(path.join(outDir, filename), content);

const generateSuite = (patchName, project) =>
  patchName
    ? Tabtest.generatePatchSuite(project, patchName)
    : Tabtest.generateProjectSuite(project);

class TabtestCommand extends BaseCommand {
  async run() {
    this.parseArgv(TabtestCommand);
    await this.ensureWorkspace();
    await this.parseEntrypoint();
    const { 'output-dir': outDir, workspace, quiet } = this.flags;
    const { projectPath, patchName } = this.args;

    const workspaces = [
      workspace,
      BUNDLED_TABTEST_WORKSPACE_PATH,
      BUNDLED_WORKSPACE_PATH,
    ];

    const childProcessOpts = {
      stdio: quiet
        ? ['inherit', 'ignore', 'ignore']
        : ['inherit', 'inherit', 'inherit'],
      shell: true,
      cwd: outDir,
    };

    const build = () =>
      this.flags['no-build']
        ? Promise.resolve()
        : pipeP(
            this.info('Compiling...'),
            () => spawn('make', [], childProcessOpts),
            this.info('Testing...'),
            () => spawn('make', ['test'], childProcessOpts)
          )(Promise.resolve());

    await pipeP(
      () => this.cliActionStartPromise(msg.tabletestCommandPreparing(outDir)),
      () => fs.emptyDirSync(outDir),
      this.tapCliActionStart(msg.tabletestCommandLoadingProject),
      () => loadProject(workspaces, projectPath),
      this.tapCliActionStart(msg.tabtestCommandGeneratingCpp),
      curry(generateSuite)(patchName),
      foldEither(err => this.die(err), identity),
      toPairs,
      this.tapCliActionStart(msg.tabtestCommandSavingFiles),
      map(curry(saveOutFile)(outDir)),
      append(fs.copy(BUNDLED_TABTEST_SRC_PATH, outDir)),
      append(fs.copy(BUNDLED_CATCH2_PATH, outDir)),
      allPromises,
      this.tapCliActionStop(),
      build,
      () => exit(0)
    )().catch(err => this.die(err));
  }
}

TabtestCommand.aliases = [];

TabtestCommand.description = msg.tabtestCommandDescription;

TabtestCommand.usage = msg.tabtestCommandUsage;

TabtestCommand.flags = {
  ...BaseCommand.flags,
  ...pick(['workspace'], myFlags),
  'output-dir': flags.string({
    char: 'o',
    description: msg.tabtestCommandOutputFlagDescription,
    env: 'XOD_OUTPUT',
    default: path.join(tmpdir(), 'xod-tabtest'),
    parse: p => path.resolve(p),
  }),
  'no-build': flags.boolean({
    description: msg.tabtestCommandNobuildFlagDescription,
    default: false,
  }),
};

TabtestCommand.args = [commonArgs.entrypoint];

TabtestCommand.examples = msg.tabtestCommnandExamples;

TabtestCommand.strict = false;

export default TabtestCommand;
