import { join } from 'path';
import bodyParser from 'body-parser';
import glob from 'glob';
import assert from 'assert';
import chokidar from 'chokidar';
import { pathToRegexp } from 'path-to-regexp';
import signale from 'signale';
import multer from 'multer';

// const VALID_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head'];
const BODY_PARSED_METHODS = ['post', 'put', 'patch', 'delete'];

const debug = require('debug')('mock-api');

export default function getMockMiddleware(mockDir, options) {
  const absMockPath = mockDir;
  const errors = [];

  let mockData = getConfig();
  watch();

  function watch() {
    if (process.env.WATCH_FILES === 'none') return;
    const watcher = chokidar.watch([absMockPath], {
      ignoreInitial: true,
    });
    watcher.on('all', (event, file) => {
      debug(`[${event}] ${file}, reload mock data`);
      mockData = getConfig();
      if (!errors.length) {
        signale.success(`Mock file parse success`);
      }
    });
  }

  function getConfig() {
    // Clear errors
    errors.splice(0, errors.length);

    cleanRequireCache();
    let ret = {};
    const mockFiles = glob
      .sync('**/*.[jt]s', {
        cwd: absMockPath,
        ignore: (options || {}).ignore || [],
      })
      .map((p) => join(absMockPath, p));
    debug(`load mock data from ${absMockPath}, including files ${JSON.stringify(mockFiles)}`);
    try {
      ret = mockFiles.reduce((memo, mockFile) => {
        const m = require(mockFile); // eslint-disable-line
        memo = {
          ...memo,
          ...(m.default || m),
        };
        return memo;
      }, {});
    } catch (e) {
      errors.push(e);
      signale.error(`Mock file parse failed: ${e.message}`);
    }
    return normalizeConfig(ret);
  }

  function parseKey(key) {
    let method = 'get';
    let path = key;
    if (key.indexOf(' ') > -1) {
      const splited = key.split(' ');
      method = splited[0].toLowerCase();
      path = splited[1]; // eslint-disable-line
    }
    // debug(`parsed: ${method} ${path}`);
    // assert(
    //   VALID_METHODS.includes(method),
    //   `Invalid method ${method} for path ${path}, please check your mock files.`
    // );
    return {
      method,
      path,
    };
  }

  function createHandler(method, path, handler) {
    return function (req, res, next) {
      if (BODY_PARSED_METHODS.includes(method)) {
        bodyParser.json({ limit: '5mb', strict: false })(req, res, () => {
          bodyParser.urlencoded({ limit: '5mb', extended: true })(req, res, () => {
            sendData();
          });
        });
      } else {
        sendData();
      }

      function sendData() {
        if (typeof handler === 'function') {
          multer().any()(req, res, () => {
            handler(req, res, next);
          });
        } else {
          res.json(handler);
        }
      }
    };
  }

  function normalizeConfig(config) {
    return Object.keys(config).reduce((memo, key) => {
      const handler = config[key];
      const type = typeof handler;
      assert(
        type === 'function' || type === 'object',
        `mock value of ${key} should be function or object, but got ${type}`
      );
      const { method, path } = parseKey(key);
      const keys = [];
      const pathOptions = {
        whitelist: ['%'], // treat %3A as regular chars
      };
      const re = pathToRegexp(path, keys, pathOptions);
      // debug(re);
      memo.push({
        method,
        path,
        re,
        keys,
        handler: createHandler(method, path, handler),
      });
      return memo;
    }, []);
  }

  function cleanRequireCache() {
    Object.keys(require.cache).forEach((file) => {
      if (file.indexOf(absMockPath) > -1) {
        delete require.cache[file];
      }
    });
  }

  function matchMock(req) {
    const targetPath = req.path;
    const targetMethod = req.method.toLowerCase();
    // debug(`${targetMethod} ${targetPath}`);

    for (const mock of mockData) {
      const { method, re, keys } = mock;
      if (method === targetMethod) {
        const match = re.exec(targetPath);
        if (match) {
          const params = {};

          for (let i = 1; i < match.length; i += 1) {
            const key = keys[i - 1];
            const prop = key.name;
            const val = decodeParam(match[i]);

            if (val !== undefined || !hasOwnProperty.call(params, prop)) {
              params[prop] = val;
            }
          }
          req.params = params;
          return mock;
        }
      }
    }

    function decodeParam(val) {
      if (typeof val !== 'string' || val.length === 0) {
        return val;
      }

      try {
        return decodeURIComponent(val);
      } catch (err) {
        if (err instanceof URIError) {
          err.message = `Failed to decode param ' ${val} '`;
          err.status = 400;
          err.statusCode = 400;
        }

        throw err;
      }
    }

    return mockData.filter(({ method, re }) => {
      return method === targetMethod && re.test(targetPath);
    })[0];
  }

  return function mockMiddleware(req, res, next) {
    const match = matchMock(req);

    if (match) {
      debug(`mock matched: [${match.method}] ${match.path}`);
      return match.handler(req, res, next);
    } else {
      return next();
    }
  };
}
