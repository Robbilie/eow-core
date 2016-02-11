
	"use strict";

	var electron 		= require("electron");
	var ipcRenderer 	= electron.ipcRenderer;
	var remote 			= require("remote");
	var fs 				= require("fs");

	window.onload = e => {
		if(!Widget.loadData("isInitialized"))
			initStorage();

		// inject base styling
		$("#css").innerHTML = fs.readFileSync("./css/index.css").toString();
	};

	function initStorage () {
		// init widget store
		Widget.storeData("widgets", {
			"widget-settings": Widget.createWidget({ id: "widget-settings", plugins: ["Robbilie/eow-settings"] })
		});

		// set bool
		Widget.storeData("isInitialized", true);
	}

	ipcRenderer.on("loadWidget", (e, widgetID) => {
		console.log("loadWidget", e, widgetID);
		Widget.INSTANCE = new Widget(Widget.loadWidget(widgetID));
		Widget.INSTANCE.getWidgetData("plugins").map(Plugin.load);
	});

	ipcRenderer.on("checkTab", (e, message) => {
		let el = document.elementFromPoint(message.x - Widget.INSTANCE.getWidgetData("x"), message.y - Widget.INSTANCE.getWidgetData("y"));
		console.log("checkTab", e, message, el);
		let targetID = message.id;
		message.id = Widget.INSTANCE.getWidgetData("id");
		remote.require("./main.js").getWindows()[targetID].webContents.send("foundTab", !Widget.INSTANCE.getPlugin(message.name) && el == Widget.INSTANCE.getTabs().getNav(), message);
	});

	ipcRenderer.on("loadPlugin", (e, message) => {
		console.log("loadPlugin", e, message);
		Widget.INSTANCE.addPlugin(message.name);
		Plugin.load(message.name);
	});

	ipcRenderer.on("before-quit", (e) => {
		console.log("before-quit", e);
		Widget.INSTANCE.onQuit();
	});



