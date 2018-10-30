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

export const api = flags.string({
  description: msg.apiFlagDescription,
  env: 'XOD_API',
  default: 'xod.io',
});

export const debug = flags.boolean({
  description: msg.debugFlagDescription,
  env: 'XOD_DEBUG',
  default: false,
});

export const onBehalf = flags.string({
  description: msg.onBehalfFlagDescription,
  env: 'XOD_ONBEHALF',
});

export const password = flags.string({
  char: 'p',
  description: msg.passwordFlagDescription,
  env: 'XOD_PASSWORD',
});

export const quiet = flags.boolean({
  char: 'q',
  description: msg.quietFlagDescription,
  default: false,
});

export const username = flags.string({
  char: 'u',
  description: msg.usernameFlagDescription,
  env: 'XOD_USERNAME',
});

export const workspace = flags.string({
  char: 'w',
  description: msg.workspaceFlagDescription,
  env: 'XOD_WORKSPACE',
  default: () => path.resolve(homedir(), 'xod'),
  parse: p => path.resolve(p),
});
