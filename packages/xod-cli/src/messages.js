export const apiFlagDescription = 'XOD API hostname (default: xod.io)';

export const debugFlagDescription = 'enable debug traces';

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

export const patchNotFound = 'Patch not found';

export const patchNotValidPath = path => `Not a valid patch path: ${path}`;

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

export const tabtestCommandDescription = 'tabtest project';

export const tabtestCommandUsage = 'tabtest [options] [project]';

export const tabtestCommandGeneratingCpp = 'Generating C++ code';

export const tabtestCommandExamples = [
  `Build tabtests for project in current working directory\n` +
    `$ xodc tabtest`,
  `Specify target directory and project, only generate tests\n` +
    `$ xodc tabtest --no-build --output-dir=/tmp/xod-tabtest ./workspace/__lib__/xod/net`,
];

export const tabtestCommandExitedWithCode = (cmd, code) =>
  `${cmd} exited with code ${code}`;

export const tabtestCommandNobuildFlagDescription = 'do not build';

export const tabletestCommandLoadingProject = 'Loading project';

export const tabtestCommandOutputFlagDescription =
  'path to directory where to save tabtest data';

export const tabtestCommandSavingFiles = 'Saving files';

export const tabletestCommandPreparing = dir =>
  `Preparing test directory: ${dir}`;

export const transpileCommandDescription =
  'transpile (generate C++) a XOD program';

export const transpileCommandDone = 'Done!';

export const transpileCommnandExamples = [
  'Transpile a program using the cwd patch as entry point, print to stdout\n' +
    '$ xodc transpile',
  'Transpile the current project with `main` patch as entry point, save the output in `x.cpp`\n' +
    '$ xodc transpile main -o x.cpp',
  'Transpile a project in the xodball with `main` patch as entry point\n' +
    '$ xodc transpile foo.xodball main',
];

export const transpileCommandOutputFlagDescription =
  'C++ output file path, default to stdout';

export const transpileCommandProjectLoading = projectPath =>
  `Loading project ${projectPath}`;

export const transpileCommandSavingTo = outPath => `Saving to ${outPath}`;

export const transpileCommandUsage = 'transpile [options] [entrypoint]';

export const transpileCommandTransforming = 'Transforming';

export const transpileCommandTranspiling = 'Transpiling';

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
