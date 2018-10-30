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
