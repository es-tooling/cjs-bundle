import {mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import * as esbuild from 'esbuild';
import {program} from 'commander';
import {promisify} from 'node:util';
import {exec} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join as joinPath} from 'node:path';

const execAsyncNative = promisify(exec);

const execAsync = async (command, opts) => {
  const result = execAsyncNative(command, opts);
  const [output] = await Promise.all([
    result,
    new Promise((resolve) => {
      result.child.on('close', () => {
        resolve(result);
      });
    })
  ]);
  return output;
};

const rootDir = fileURLToPath(new URL('..', import.meta.url));

const packageKeysToKeep = [
  'version',
  'description',
  'repository',
  'author',
  'license',
  'bugs',
  'homepage',
  'engines'
];

async function createBundle(opts) {
  const packageTemplatePath = joinPath(
    rootDir,
    './scripts/package-template.json'
  );
  const packageTemplate = JSON.parse(
    await readFile(packageTemplatePath, {encoding: 'utf8'})
  );
  const name = opts.name.replaceAll(/[^@\w]/g, '');
  const bundleDirName = 'temp_bundle';
  const cwd = joinPath(rootDir, bundleDirName);
  const actualPackagePath = joinPath(
    rootDir,
    bundleDirName,
    'node_modules',
    name,
    'package.json'
  );
  const bundlePath = joinPath(cwd, 'main.js');

  packageTemplate.name = `@cjs-bundle/${name}`;
  packageTemplate.type = 'module';
  packageTemplate.devDependencies[name] = 'latest';

  console.log('Removing any existing bundle directory');
  await rm(`./${bundleDirName}`, {recursive: true, force: true});

  console.log('Creating bundle directory');
  await mkdir(`./${bundleDirName}`);

  console.log('Creating package.json');
  await writeFile(
    `./${bundleDirName}/package.json`,
    JSON.stringify(packageTemplate, null, 2),
    {encoding: 'utf8'}
  );

  console.log('Running `npm i`');
  await execAsync('npm i', {
    cwd
  });

  const actualPackage = JSON.parse(
    await readFile(actualPackagePath, {encoding: 'utf8'})
  );

  console.log('Copying package.json fields across');
  for (const key of packageKeysToKeep) {
    packageTemplate[key] = actualPackage[key];
  }

  delete packageTemplate.type;
  delete packageTemplate.devDependencies[name];

  console.log('Writing new package.json');
  await writeFile(
    `./${bundleDirName}/package.json`,
    JSON.stringify(packageTemplate, null, 2),
    {encoding: 'utf8'}
  );

  console.log('Bundling');
  await esbuild.build({
    bundle: true,
    absWorkingDir: cwd,
    stdin: {contents: `export * from '${name}';`, resolveDir: cwd},
    format: 'cjs',
    outfile: bundlePath
  });

  console.log('Running `npm pkg fix`');
  await execAsync('npm pkg fix', {cwd});

  console.log('Publishing');
  const publishCommand = opts.dryRun ? 'npm publish --dry-run' : 'npm publish';
  const publishResult = await execAsync(publishCommand, {cwd});

  console.log(publishResult.stderr);
  console.log(publishResult.stdout);
}

program.option('--name <name>').option('--dry-run');

program.parse();

const options = program.opts();

if (options.name) {
  const dryRun = options.dryRun ?? false;
  createBundle({name: options.name, dryRun});
}
