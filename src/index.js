const argv = require('yargs').argv;
const os = require('os');
const { readConfig } = require('jest-config');
const { Console } = require('jest-util');
const Runtime = require('jest-runtime');
const DependencyResolver = require('jest-resolve-dependencies');
const path = require('path');

const pipe = process.stdout;

const files = argv._;

const getMaxWorkers = () => {
  const cpus = os.cpus().length;
  return Math.max(cpus - 1, 1);
};

const createHasteContext = (config, { hasteFS, moduleMap }) => ({
  config,
  hasteFS,
  moduleMap,
  resolver: Runtime.createResolver(config, moduleMap),
});

const root = argv.root || process.cwd();

const findDependentFiles = ({ config, hasteFS, resolver }, allPaths) => {
  const dependencyResolver = new DependencyResolver(resolver, hasteFS);
  return dependencyResolver.resolveInverse(new Set(allPaths), () => true, {
    skipNodeResolution: config.skipNodeResolution,
  });
};

(async () => {
  const { projectConfig: config } = readConfig(argv, root);
  const hasteMap = Runtime.createHasteMap(config, {
    console: new Console(pipe, pipe),
    maxWorkers: getMaxWorkers(),
    resetCache: !config.cache,
    watch: false,
  });

  try {
    const hasteContext = createHasteContext(config, await hasteMap.build());
    const dependents = findDependentFiles(
      hasteContext,
      files.map(f => path.resolve(f)),
    );

    dependents.forEach(dependentFile => console.log(dependentFile));
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
})();
