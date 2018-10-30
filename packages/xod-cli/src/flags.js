import path from 'path';
import { homedir } from 'os';
import { flags } from '@oclif/command';
import * as msg from './messages';

export const help = flags.help({
  char: 'h',
});

export const version = flags.version({
  char: 'v',
});

export const quiet = flags.boolean({
  char: 'q',
  description: msg.quietFlagDescription,
  default: false,
});

export const workspace = flags.string({
  char: 'w',
  description: msg.workspaceFlagDescription,
  env: 'XOD_WORKSPACE',
  default: () => path.resolve(homedir(), 'xod'),
  parse: p => path.resolve(p),
});
