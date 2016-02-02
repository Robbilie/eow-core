	
	'use strict';

	const electron = require('electron');
	// Module to control application life.
	const app = electron.app;
	// Module to create native browser window.
	const BrowserWindow = electron.BrowserWindow;

	app.on('ready', () => this.loadWidget("https://github.com/Robbilie/eow-settings.git", true));

	// Quit when all windows are closed.
	app.on('window-all-closed', function () {
		if (process.platform !== 'darwin') {
			app.quit();
		}
	});

	exports.loadWidget = function (url, debugging) {
		var window = new BrowserWindow({ width: 0, height: 0, transparent: true, frame: false });
			window.loadURL('file://' + __dirname + '/html/widget.html#' + url);
			if(true || debugging) window.webContents.openDevTools();

		return window;
	};
