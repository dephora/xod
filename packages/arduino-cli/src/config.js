import * as R from 'ramda';
import { tmpdir } from 'os';
import { resolve } from 'path';
import * as fse from 'fs-extra';
import YAML from 'yamljs';

const ADDITIONAL_URLS_PATH = ['board_manager', 'additional_urls'];

const getDefaultConfig = configDir => ({
  sketchbook_path: resolve(configDir, 'sketchbook'),
  arduino_data: resolve(configDir, 'data'),
});

const getAdditionalUrls = R.pathOr([], ADDITIONAL_URLS_PATH);

const overAdditionalUrls = R.over(
  R.lens(getAdditionalUrls, R.assocPath(ADDITIONAL_URLS_PATH))
);

const stringifyConfig = cfg => YAML.stringify(cfg, 10, 2);

// :: Path -> Object -> { config: Object, path: Path }
export const saveConfig = (configPath, config) => {
  const yamlString = YAML.stringify(config, 2);

  // Write config
  fse.writeFileSync(configPath, yamlString);

  // Ensure that sketchbook and data directories are exist
  fse.ensureDirSync(config.sketchbook_path);
  fse.ensureDirSync(config.arduino_data);

  return {
    config,
    path: configPath,
  };
};

// :: Object -> { config: Object, path: Path }
export const configure = inputConfig => {
  const configDir = fse.mkdtempSync(resolve(tmpdir(), 'arduino-cli'));
  const configPath = resolve(configDir, '.cli-config.yml');
  const config = inputConfig || getDefaultConfig(configDir);
  return saveConfig(configPath, config);
};

// :: Path -> [URL] -> Promise [URL] Error
export const addPackageIndexUrls = (configPath, urls) =>
  fse
    .readFile(configPath, { encoding: 'utf8' })
    .then(YAML.parse)
    .then(
      overAdditionalUrls(
        R.pipe(R.concat(R.__, urls), R.reject(R.isEmpty), R.uniq)
      )
    )
    .then(stringifyConfig)
    .then(data => fse.writeFile(configPath, data))
    .then(R.always(urls));

// :: Path -> URL -> Promise URL Error
export const addPackageIndexUrl = (configPath, url) =>
  addPackageIndexUrls(configPath, [url]).then(R.always(url));

// :: Path -> [URL] -> Promise [URL] Error
export const removePackageIndexUrls = (configPath, urls) => {
  let removedUrls = [];

  return fse
    .readFile(configPath, { encoding: 'utf8' })
    .then(YAML.parse)
    .then(cfg => {
      removedUrls = R.compose(R.intersection(urls), getAdditionalUrls)(cfg);
      return overAdditionalUrls(R.difference(R.__, removedUrls))(cfg);
    })
    .then(stringifyConfig)
    .then(data => fse.writeFile(configPath, data))
    .then(R.always(removedUrls));
};
