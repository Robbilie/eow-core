	
	"use strict";

	const electron = require("electron");
	const app = electron.app;
	const BrowserWindow = electron.BrowserWindow;

	app.on("ready", () => this.loadWidget("widget-settings"));

	app.on("window-all-closed", () => {
		if (process.platform !== "darwin") {
			app.quit();
		}
	});

	exports.windows = {};
	exports.loadWidget = widgetID => {
		var window = new BrowserWindow({ width: 200, height: 200, transparent: true, frame: false });
			window.loadURL(`file://${__dirname}/html/widget2.html`);
			window.webContents.openDevTools();
			this.windows[widgetID] = window;
			window.webContents.on("did-finish-load", () => {
				window.webContents.send("loadWidget", widgetID);
			});
			window.on("closed", () => {
				delete this.windows[widgetID];
			});
		return window;
	};
