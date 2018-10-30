import path from 'path';
import { exit, stdout } from 'process';
import { identity, map, pick, pipeP } from 'ramda';
import { flags } from '@oclif/command';
import { loadProject, writeFile } from 'xod-fs';
import {
  transformProject,
  transformProjectWithDebug,
  transpile,
} from 'xod-arduino';
import { foldEither } from 'xod-func-tools';

import BaseCommand from '../baseCommand';
import * as commonArgs from '../args';
import * as myFlags from '../flags';
import { BUNDLED_WORKSPACE_PATH } from '../constants';
import * as msg from '../messages';

class TranspileCommand extends BaseCommand {
  async run() {
    this.parseArgv(TranspileCommand);
    await this.ensureWorkspace();
    await this.parseEntrypoint();
    const { debug, workspace, output } = this.flags;
    const { projectPath } = this.args;
    const patchName = this.args.patchName || '@/main';

    const saveToFile = (where, code) =>
      pipeP(
        () => this.cliActionStartPromise(msg.transpileCommandSavingTo(where)),
        () => writeFile(where, code, 'utf8'),
        this.tapCliActionStop(),
        () => {
          this.info(msg.transpileCommandDone);
          return exit(0);
        }
      );

    await pipeP(
      () =>
        this.cliActionStartPromise(
          msg.transpileCommandProjectLoading(projectPath)
        ),
      () => loadProject([workspace, BUNDLED_WORKSPACE_PATH], projectPath),
      this.tapCliActionStart(msg.transpileCommandTransforming),
      project =>
        debug
          ? transformProjectWithDebug(project, patchName)
          : transformProject(project, patchName),
      this.tapCliActionStart(msg.transpileCommandTranspiling),
      map(transpile),
      eitherCode => foldEither(err => this.die(err), identity, eitherCode),
      this.tapCliActionStop(),
      code => {
        // print to stdout and exit
        if (!output) {
          stdout.write(code);
          return exit(0);
        }

        return saveToFile(output, code)();
      }
    )().catch(err => this.die(err));
  }
}

TranspileCommand.aliases = ['t'];

TranspileCommand.description = msg.transpileCommandDescription;

TranspileCommand.usage = msg.transpileCommandUsage;

TranspileCommand.flags = {
  ...BaseCommand.flags,
  ...pick(['debug', 'workspace'], myFlags),
  output: flags.string({
    char: 'o',
    description: msg.transpileCommandOutputFlagDescription,
    env: 'XOD_OUTPUT',
    parse: p => path.resolve(p),
  }),
};

TranspileCommand.args = [commonArgs.entrypoint];

TranspileCommand.examples = msg.transpileCommnandExamples;

TranspileCommand.strict = false;

export default TranspileCommand;
