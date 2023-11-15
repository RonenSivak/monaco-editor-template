/**
 * Worker to fetch typescript definitions for dependencies.
 * Credits to @CompuIves
 * https://github.com/CompuIves/codesandbox-client/blob/dcdb4169bcbe3e5aeaebae19ff1d45940c1af834/packages/app/src/app/components/CodeEditor/Monaco/workers/fetch-dependency-typings.js
 *
 * global ts
 * @flow
 */

import path from 'path';
import {get as getItem, set as setItem, Store} from 'idb-keyval';

self.importScripts(
  'https://cdnjs.cloudflare.com/ajax/libs/typescript/2.4.2/typescript.min.js'
);

const ROOT_URL = `https://cdn.jsdelivr.net/`;

const store = new Store('typescript-definitions-cache-v1');
const fetchCache = new Map();

const doFetch = url => {
  const cached = fetchCache.get(url);
  if (cached) {
    return cached;
  }

  const promise = fetch(url)
    .then(response => {
      if (response.status >= 200 && response.status < 300) {
        return Promise.resolve(response);
      }

      const error = new Error(response.statusText || response.status);

      return Promise.reject(error);
    })
    .then(response => {
      return response.text()
    });
  fetchCache.set(url, promise);

  return promise;
};

const fetchFromDefinitelyTyped = (dependency, version, fetchedPaths) => {
  return doFetch(
    `${ROOT_URL}npm/@types/${dependency
      .replace('@', '')
      .replace(/\//g, '__')}/index.d.ts`
  ).then(typings => {
    fetchedPaths[`node_modules/${dependency}/index.d.ts`] = typings;
  });
}

const getRequireStatements = (title: string, code: string) => {
  const requires = [];
  const sourceFile = self.ts.createSourceFile(
    title,
    code,
    self.ts.ScriptTarget.Latest,
    true,
    self.ts.ScriptKind.TS
  );

  self.ts.forEachChild(sourceFile, node => {
    switch (node.kind) {
      case self.ts.SyntaxKind.ImportDeclaration: {
        requires.push(node.moduleSpecifier.text);
        break;
      }
      case self.ts.SyntaxKind.ExportDeclaration: {
        // For syntax 'export ... from '...'''
        if (node.moduleSpecifier) {
          requires.push(node.moduleSpecifier.text);
        }
        break;
      }
      default: {
        /* */
      }
    }
  });

  return requires;
};

const tempTransformFiles = files => {
  const finalObj = {};

  files.forEach(d => {
    finalObj[d.name] = d;
  });
  return finalObj;
};

const transformFiles = dir =>
  dir.files
    ? dir.files.reduce((prev, next) => {
      if (next.type === 'file') {
        return {...prev, [next.path]: next};
      }

      return {...prev, ...transformFiles(next)};
    }, {})
    : {};

const getFileMetaData = (dependency, version, depPath) => {
  return doFetch(
    `https://data.jsdelivr.com/v1/package/npm/${dependency}@${version}/flat`
  )
    .then(response => JSON.parse(response))
    .then(response => response.files.filter(f => f.name.startsWith(depPath)))
    .then(tempTransformFiles);
}

const resolveAppropiateFile = (fileMetaData, relativePath) => {
  const absolutePath = `/${relativePath}`;

  if (fileMetaData[`${absolutePath}.d.ts`]) return `${relativePath}.d.ts`;
  if (fileMetaData[`${absolutePath}.ts`]) return `${relativePath}.ts`;
  if (fileMetaData[absolutePath]) return relativePath;
  if (fileMetaData[`${absolutePath}/index.d.ts`])
    return `${relativePath}/index.d.ts`;

  return relativePath;
};

const getFileTypes = (
  depUrl,
  dependency,
  depPath,
  fetchedPaths,
  fileMetaData
) => {
  const virtualPath = path.join('node_modules', dependency, depPath);
  if (fetchedPaths[virtualPath]) return null;
  return doFetch(`${depUrl}/${depPath}`).then(typings => {
    if (fetchedPaths[virtualPath]) return null;

    fetchedPaths[virtualPath] = typings;
    // Now find all require statements, so we can download those types too
    return Promise.all(
      getRequireStatements(depPath, typings)
        .map(relativePath => path.join(path.dirname(depPath), relativePath))
        .map(relativePath => resolveAppropiateFile(fileMetaData, relativePath))
        .map(nextDepPath =>
          getFileTypes(
            depUrl,
            dependency,
            nextDepPath,
            fetchedPaths,
            fileMetaData
          )
        )
    );
  });
};

function fetchFromMeta(dependency, version, fetchedPaths) {
  const depUrl = `https://data.jsdelivr.com/v1/package/npm/${dependency}@${version}/flat`;
  let dtsFiles;
  return doFetch(depUrl)
    .then(response => JSON.parse(response))
    .then(meta => {
      const filterAndFlatten = (files, filter) =>
        files.reduce((paths, file) => {
          if (filter.test(file.name)) {
            paths.push(file.name);
          }
          if (paths.length) {
            // console.log(paths)
          }
          return paths;
        }, []);
      console.log(dependency, meta.files)
      let dtsFiles = filterAndFlatten(meta.files, /\.d\.ts$/);
      console.log(dtsFiles)
      if (dtsFiles.length === 0) {
        // if no .d.ts files found, fallback to .ts files
        dtsFiles = filterAndFlatten(meta.files, /\.ts$/);
      }

      if (dtsFiles.length === 0) {
        throw new Error(`No inline typings found for ${dependency}@${version}`);
      }

      dtsFiles.forEach(file => {
        return doFetch(`https://cdn.jsdelivr.net/npm/${dependency}@${version}${file}`)
          .then(dtsFile => {
            fetchedPaths[`node_modules/${dependency}${file}`] = dtsFile;
          })
          .catch(() => {
          });
      });
    });
}

function fetchFromTypings(dependency, version, fetchedPaths) {
  const depUrl = `${ROOT_URL}npm/${dependency}@${version}`;
  return doFetch(`${depUrl}/package.json`)
    .then(response => JSON.parse(response))
    .then(packageJSON => {
      const types = packageJSON.typings || packageJSON.types;
      if (types) {
        // Add package.json, since this defines where all types lie
        fetchedPaths[
          `node_modules/${dependency}/package.json`
          ] = JSON.stringify(packageJSON);
        // get all files in the specified directory
        return getFileMetaData(
          dependency,
          version,
          path.join('/', path.dirname(types))
        ).then(fileData =>
          getFileTypes(
            depUrl,
            dependency,
            resolveAppropiateFile(fileData, types),
            fetchedPaths,
            fileData
          )
        );
      }

      throw new Error(
        `No typings field in package.json for ${dependency}@${version}`
      );
    });
}

function fetchDefinitions(name, version) {
  if (!version) {
    return Promise.reject(new Error(`No version specified for ${name}`));
  }

  // Query cache for the defintions
  const key = `${name}@${version}`;

  return getItem(key, store)
    .catch(e => {
      console.error('An error occurred when getting definitions from cache', e);
    })
    .then(result => {
      // if (result) {
      //   return result;
      // }

      // If result is empty, fetch from remote
      const fetchedPaths = {};

      return fetchFromTypings(name, version, fetchedPaths)
        .catch(() => {
            console.log(name, 'catch 1')
            // not available in package.json, try checking meta for inline .d.ts file
            const fetchFiles = fetchFromMeta(name, version, fetchedPaths)
            if (Object.keys(fetchedPaths).length) {
              return fetchedPaths;
            }
            return fetchFiles;
          }
        )
        .catch(() => {
            console.log(name, 'catch 2')
            // Not available in package.json or inline from meta, try checking in @types/
            const fetchFiles = fetchFromDefinitelyTyped(name, version, fetchedPaths);
            if (Object.keys(fetchedPaths).length) {
              return fetchedPaths;
            }
            return fetchFiles;
          }
        )
        .then(() => {
          if (Object.keys(fetchedPaths).length) {
            // Also cache the definitions
            setItem(key, fetchedPaths, store);
            return fetchedPaths;
          } else {
            throw new Error(`Type definitions are empty for ${key}`);
          }
        });
    });
}

self.addEventListener('message', event => {
  console.log(event)
  const {name, version} = event.data;
  fetchDefinitions(name, version).then(
    result => {
      const message = {
        name,
        version,
        typings: result,
      }
      console.log('in promise:', message)
      return self.postMessage({
        name,
        version,
        typings: result,
      })
    },
    error => {
      if (process.env.NODE_ENV !== 'production') {
        console.error(error);
      }
    }
  );
  // console.log(fetchedData)
});
