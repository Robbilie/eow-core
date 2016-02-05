
	"use strict";

	var electron 		= require("electron");
	var ipcRenderer 	= electron.ipcRenderer;
	var remote 			= require("remote");
	var fs 				= require("fs");

	window.onload = e => {
		if(!Widget.loadData("isInitialized"))
			initStorage();
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
		Widget.INSTANCE = new Widget(Widget.loadWidget(widgetID));
		Widget.INSTANCE.getWidgetData("plugins").map(Plugin.load);
	});
