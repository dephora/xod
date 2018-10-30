export const entrypointArgumentDescription =
  `multipositional argument, reference to project and patch:\n` +
  `if omitted:\n` +
  `\tif current working directory is a project root, then use this project and @/main patch\n` +
  `\tif current working directory is a patch directory, then use this project and this patch\n` +
  `if one position:\n` +
  `\tif path to a patch directory or file, then use this project and this patch\n` +
  `\tif path to a project/xodball, then use this project and @/main patch\n` +
  `if two positions:\n` +
  `\tfirst position is the path to a project/xodball\n` +
  `\tsecond position is the patch name like 'main' or '@/main'`;

export const openNotAXodFile = path => `Tried to open not a xod file: ${path}`;

export const quietFlagDescription = 'do not log messages other than errors';

export const resaveCommandDescription =
  'opens a project and saves it in another location or format';

export const resaveCommandExamples = [
  `Exports the current multifile project to a xodball\n` +
    `$ xodc resave . -o ~/foo.xodball\n`,
  `Outputs the current multifile project as a xodball to stdout\n` +
    `$ xodc resave\n`,
  `Resaves one xodball into another (useful for applying migrations)\n` +
    `$ xodc resave foo.xodball -o bar.xodball\n`,
  `Converts a xodball to a multifile project\n` +
    `$ xodc resave foo.xodball -o /some/new/dir\n`,
];

export const resaveCommandProjectLoading = 'Project loading';

export const resaveCommandSaving = 'Saving';

export const resaveCommandUsage = 'resave [options] [entrypoint]';

export const resaveCommandOutputFlagDescription =
  'xodball or multifile directory output path, defaults to stdout';

export const resaveSuccess = p => `Project resaved into ${p}`;

export const workspaceFlagDescription =
  'use the workspace specified, defaults to $HOME/xod';

export const workspaceFlagNotExists = wPath =>
  `Workspace directory ${wPath} not exist or empty\n`;

export const workspaceFlagInvalid = wPath =>
  `Invalid workspace path ${wPath}\n`;

export const workspaceFlagCorrupt = wPath =>
  `Workspace directory ${wPath} is corrupt\n`;

export const workspaceFlagCreationFailed = wPath =>
  `Can't create workspace file in ${wPath}\n`;
