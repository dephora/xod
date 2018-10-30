import path from 'path';
import { stdout, exit } from 'process';
import { pick, pipeP } from 'ramda';
import { flags } from '@oclif/command';
import { loadProject, saveProjectAsXodball, saveProjectEntirely } from 'xod-fs';
import { toXodball } from 'xod-project';
import BaseCommand from '../baseCommand';
import * as commonArgs from '../args';
import * as myFlags from '../flags';
import { BUNDLED_WORKSPACE_PATH } from '../constants';
import * as msg from '../messages';

class ResaveCommand extends BaseCommand {
  async run() {
    this.parseArgv(ResaveCommand);
    await this.ensureWorkspace();
    await this.parseEntrypoint();
    const { output, workspace } = this.flags;
    const { projectPath } = this.args;

    const saveToFile = (where, project) =>
      pipeP(
        () => this.cliActionStartPromise(msg.resaveCommandSaving),
        () =>
          path.extname(output) === '.xodball'
            ? saveProjectAsXodball(output, project)
            : saveProjectEntirely(output, project),
        this.tapCliActionStop(),
        () => {
          this.info(msg.resaveSuccess(output));
          return exit(0);
        }
      );

    await pipeP(
      () => this.cliActionStartPromise(msg.resaveCommandProjectLoading),
      () => loadProject([workspace, BUNDLED_WORKSPACE_PATH], projectPath),
      this.tapCliActionStop(),
      project => {
        // print xodball to stdout and exit
        if (!output) {
          stdout.write(toXodball(project));
          return exit(0);
        }

        return saveToFile(output, project)();
      }
    )().catch(err => this.die(err));
  }
}

ResaveCommand.aliases = ['r'];

ResaveCommand.description = msg.resaveCommandDescription;

ResaveCommand.usage = msg.resaveCommandUsage;

ResaveCommand.flags = {
  ...BaseCommand.flags,
  ...pick(['workspace'], myFlags),
  output: flags.string({
    char: 'o',
    description: msg.resaveOutputFlagDescription,
    env: 'XOD_OUTPUT',
    parse: p => path.resolve(p),
  }),
};

ResaveCommand.args = [commonArgs.entrypoint];

ResaveCommand.examples = msg.resaveCommandExamples;

ResaveCommand.strict = false;

export default ResaveCommand;
