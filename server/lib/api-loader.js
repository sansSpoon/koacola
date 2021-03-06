'use strict';

// TODO: apiRoutes.forEach((route) - uses dynamic require,
//       this needs to be refactored once ECMA dynamic modules
//       has been finalised

// libraries
const { lstatSync, readdirSync, existsSync } = require('fs');
const { resolve } = require('path');

// loaders
const logger = require('./console-wrapper.js');

// utilities
const isDirectory = (source) => lstatSync(source).isDirectory();
const isFile = (source) => lstatSync(source).isFile();
const getDirectories = (source) => readdirSync(source).map((name) => resolve(source, name));

// ! API Loader
/*
** Checks for correctly configured directories (routes) in the API root.
**
** @param app - the Koa application
** @param root - the API root directory
** @return {app}
*/
//
exports.init = function apiInit(app, root) {

	try {
		let apiRoutes = getDirectories(root);

		if (apiRoutes.filter(isFile).length > 0) {

			logger.warn('Warn: API only loads directories, ignoring files.');
		}

		apiRoutes = apiRoutes.filter(isDirectory);

		if (apiRoutes.length === 0) {
			throw new Error('API root must contain properly configured directories.');
		}

		let configs = 0;
		apiRoutes.forEach((route) => {

			if (!existsSync(resolve(route, 'router.js'))) {
				logger.error(`${route} missing router.`);
				configs += 1;
			}
			if (!existsSync(resolve(route, 'controller.js'))) {
				logger.error(`${route} missing controller.`);
				configs += 1;
			}
			if (!existsSync(resolve(route, 'model.js'))) {
				logger.error(`${route} missing model.`);
				configs += 1;
			}
		});

		if (apiRoutes.findIndex((route) => /[^/]*$/.exec(route)[0] === 'users') === -1) {
			logger.error('API missing users route.');
			configs += 1;
		}

		if (apiRoutes.findIndex((route) => /[^/]*$/.exec(route)[0] === 'auth') === -1) {
			logger.error('API missing auth route.');
			configs += 1;
		}

		if (configs > 0) {
			throw new Error(`${configs} errors with the API configuration.`);
		}

		apiRoutes.forEach((route) => {

			let routePath = /[^/]*$/.exec(route)[0];
			routePath = require(resolve('server/api/', routePath, 'router.js'));
			app.use(routePath.routes());
			app.use(routePath.allowedMethods());
		});

		return app;

	} catch (e) {
		logger.error(`${e.name}: ${e.message}`);
		process.exit();
	}
};
