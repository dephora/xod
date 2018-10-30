# xod-cli

This package is a part of the [XOD](https://github.com/xodio/xod) project.

The package contains implemetation of `xodc` command line utility.

Basically it’s a collection of thin wrappers around NodeJS API’s available via
other packages. The responsibility of `xod-cli` is to parse command line
arguments, call API, and format the result on stdout/stderr properly.

`xodc` uses subcommands like `git` does to perform various functions.
The subcommands handling could be found in `src/commands/*.js`.

![xod-cli](https://img.shields.io/badge/xod-cli-brightgreen.svg)
[![Version](https://img.shields.io/npm/v/xod-cli.svg)](https://npmjs.org/package/xod-cli)
[![Downloads/week](https://img.shields.io/npm/dw/xod-cli.svg)](https://npmjs.org/package/xod-cli)
[![License](https://img.shields.io/npm/l/xod-cli.svg)](https://github.com/xodio/xod/blob/master/packages/xod-cli/package.json)

<!-- toc -->
* [xod-cli](#xod-cli)
* [Usage](#usage)
* [Flags, aliases, environment variables](#flags-aliases-environment-variables)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g xod-cli
$ xodc COMMAND
running command...
$ xodc (-v|--version|version)
xod-cli/0.25.0 linux-x64 node-v10.11.0
$ xodc --help [COMMAND]
USAGE
  $ xodc COMMAND
...
```
<!-- usagestop -->

# Flags, aliases, environment variables

Almost any flag can be replaced with the appropriate environment variable.
For example, instead of `--username` you can declare variable `XOD_USERNAME`.

| Flag         | Alias | Environment variable |
|--------------|-------|----------------------|
| --api        |       | XOD_API              |
| --debug      |       | XOD_DEBUG            |
| --help       | -h    |                      |
| --no-build   |       |                      |
| --on-behalf  |       | XOD_ONBEHALF         |
| --output     | -o    | XOD_OUTPUT           |
| --output-dir | -o    | XOD_OUTPUT           |
| --password   | -p    | XOD_PASSWORD         |
| --quiet      | -q    |                      |
| --username   | -u    | XOD_USERNAME         |
| --version    | -v    |                      |
| --workspace  | -w    | XOD_WORKSPACE        |


# Commands
<!-- commands -->
* [`xodc autocomplete [SHELL]`](#xodc-autocomplete-shell)
* [`xodc help [COMMAND]`](#xodc-help-command)
* [`xodc publish [options] [entrypoint]`](#xodc-publish-options-entrypoint)
* [`xodc resave [options] [entrypoint]`](#xodc-resave-options-entrypoint)
* [`xodc tabtest [options] [project]`](#xodc-tabtest-options-project)
* [`xodc transpile [options] [entrypoint]`](#xodc-transpile-options-entrypoint)

## `xodc autocomplete [SHELL]`

display autocomplete installation instructions

```
USAGE
  $ xodc autocomplete [SHELL]

ARGUMENTS
  SHELL  shell type

OPTIONS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

EXAMPLES
  $ xodc autocomplete
  $ xodc autocomplete bash
  $ xodc autocomplete zsh
  $ xodc autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v0.1.0/src/commands/autocomplete/index.ts)_

## `xodc help [COMMAND]`

display help for xodc

```
USAGE
  $ xodc help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.1.3/src/commands/help.ts)_

## `xodc publish [options] [entrypoint]`

publish a library

```
USAGE
  $ xodc publish [options] [entrypoint]

ARGUMENTS
  ENTRYPOINT
      multipositional argument, reference to project and patch:
      if omitted:
      	if current working directory is a project root, then use this project and @/main patch
      	if current working directory is a patch directory, then use this project and this patch
      if one position:
      	if path to a patch directory or file, then use this project and this patch
      	if path to a project/xodball, then use this project and @/main patch
      if two positions:
      	first position is the path to a project/xodball
      	second position is the patch name like 'main' or '@/main'

OPTIONS
  -h, --help               show CLI help
  -p, --password=password  XOD API password
  -q, --quiet              do not log messages other than errors
  -u, --username=username  XOD API username
  -v, --version            show CLI version
  --api=api                [default: xod.io] XOD API hostname (default: xod.io)
  --on-behalf=on-behalf    publish on behalf of the username

ALIASES
  $ xodc p

EXAMPLES
  Publish the current project with the version defined in `project.xod`
  $ xodc publish
  Publish a project saved as xodball
  $ xodc publish foo.xodball
```

_See code: [src/commands/publish.js](https://github.com/xodio/xod/blob/v0.25.0/packages/xod-cli/src/commands/publish.js)_

## `xodc resave [options] [entrypoint]`

opens a project and saves it in another location or format

```
USAGE
  $ xodc resave [options] [entrypoint]

ARGUMENTS
  ENTRYPOINT
      multipositional argument, reference to project and patch:
      if omitted:
      	if current working directory is a project root, then use this project and @/main patch
      	if current working directory is a patch directory, then use this project and this patch
      if one position:
      	if path to a patch directory or file, then use this project and this patch
      	if path to a project/xodball, then use this project and @/main patch
      if two positions:
      	first position is the path to a project/xodball
      	second position is the patch name like 'main' or '@/main'

OPTIONS
  -h, --help                 show CLI help
  -o, --output=output
  -q, --quiet                do not log messages other than errors
  -v, --version              show CLI version
  -w, --workspace=workspace  [default: /home/sk/xod] use the workspace specified, defaults to $HOME/xod

ALIASES
  $ xodc r

EXAMPLES
  Exports the current multifile project to a xodball
  $ xodc resave . -o ~/foo.xodball

  Outputs the current multifile project as a xodball to stdout
  $ xodc resave

  Resaves one xodball into another (useful for applying migrations)
  $ xodc resave foo.xodball -o bar.xodball

  Converts a xodball to a multifile project
  $ xodc resave foo.xodball -o /some/new/dir
```

_See code: [src/commands/resave.js](https://github.com/xodio/xod/blob/v0.25.0/packages/xod-cli/src/commands/resave.js)_

## `xodc tabtest [options] [project]`

tabtest project

```
USAGE
  $ xodc tabtest [options] [project]

ARGUMENTS
  ENTRYPOINT
      multipositional argument, reference to project and patch:
      if omitted:
      	if current working directory is a project root, then use this project and @/main patch
      	if current working directory is a patch directory, then use this project and this patch
      if one position:
      	if path to a patch directory or file, then use this project and this patch
      	if path to a project/xodball, then use this project and @/main patch
      if two positions:
      	first position is the path to a project/xodball
      	second position is the patch name like 'main' or '@/main'

OPTIONS
  -h, --help                   show CLI help
  -o, --output-dir=output-dir  [default: /tmp/xod-tabtest] path to directory where to save tabtest data
  -q, --quiet                  do not log messages other than errors
  -v, --version                show CLI version
  -w, --workspace=workspace    [default: /home/sk/xod] use the workspace specified, defaults to $HOME/xod
  --no-build                   do not build
```

_See code: [src/commands/tabtest.js](https://github.com/xodio/xod/blob/v0.25.0/packages/xod-cli/src/commands/tabtest.js)_

## `xodc transpile [options] [entrypoint]`

transpile (generate C++) a XOD program

```
USAGE
  $ xodc transpile [options] [entrypoint]

ARGUMENTS
  ENTRYPOINT
      multipositional argument, reference to project and patch:
      if omitted:
      	if current working directory is a project root, then use this project and @/main patch
      	if current working directory is a patch directory, then use this project and this patch
      if one position:
      	if path to a patch directory or file, then use this project and this patch
      	if path to a project/xodball, then use this project and @/main patch
      if two positions:
      	first position is the path to a project/xodball
      	second position is the patch name like 'main' or '@/main'

OPTIONS
  -h, --help                 show CLI help
  -o, --output=output        C++ output file path, default to stdout
  -q, --quiet                do not log messages other than errors
  -v, --version              show CLI version
  -w, --workspace=workspace  [default: /home/sk/xod] use the workspace specified, defaults to $HOME/xod
  --debug                    enable debug traces

ALIASES
  $ xodc t

EXAMPLES
  Transpile a program using the cwd patch as entry point, print to stdout
  $ xodc transpile
  Transpile the current project with `main` patch as entry point, save the output in `x.cpp`
  $ xodc transpile main -o x.cpp
  Transpile a project in the xodball with `main` patch as entry point
  $ xodc transpile foo.xodball main
```

_See code: [src/commands/transpile.js](https://github.com/xodio/xod/blob/v0.25.0/packages/xod-cli/src/commands/transpile.js)_
<!-- commandsstop -->
