	
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

	app.on("before-quit", () => Object.keys(windows).map(k => {
		if(windows[k] && windows[k].webContents)
			windows[k].webContents.send("before-quit");
	}));

	const windows = {};

	exports.getWindows = () => windows;

	exports.loadWidget = widgetID => {
		console.log("Open Widget with id ", widgetID);
		let window = new BrowserWindow({ 
				width: 200, 
				height: 200, 
				transparent: true, 
				frame: false, 
				webpreferences: {
					blinkFeatures: "CSSVariables"
				}
			});
			window.webContents.on("did-finish-load", () => {
				window.webContents.send("loadWidget", widgetID);
			});
			window.webContents.on("destroyed", () => {
				delete windows[widgetID];
			});
			window.loadURL(`file://${__dirname}/html/widget.html`);
			window.webContents.openDevTools();
			windows[widgetID] = window;
		return window;
	};
