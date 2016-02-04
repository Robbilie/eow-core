	
	'use strict';

	const electron = require('electron');
	// Module to control application life.
	const app = electron.app;
	// Module to create native browser window.
	const BrowserWindow = electron.BrowserWindow;

	app.on('ready', () => this.loadWidget("window-settings"));

	// Quit when all windows are closed.
	app.on('window-all-closed', function () {
		if (process.platform !== 'darwin') {
			app.quit();
		}
	});

	exports.loadWidget = function (windowID) {
		var window = new BrowserWindow({ width: 200, height: 200, transparent: true, frame: false });
			window.loadURL('file://' + __dirname + '/html/widget.html' + (windowID ? "#" + windowID : ""));
			window.webContents.openDevTools();

		return window;
	};
