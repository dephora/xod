import * as msg from './messages';

// fake entrypoint argument just for --help
// use with command's property strict == false
export const entrypoint = {
  name: 'entrypoint',
  required: false,
  hidden: false,
  description: msg.entrypointArgumentDescription,
};

export default {
  entrypoint,
};
