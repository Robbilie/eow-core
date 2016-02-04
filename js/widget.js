	
	"use strict";

	var remote = require("remote");
	
	class Widget {

		constructor (windowData) {
			this.bw 		= remote.getCurrentWindow();
			this.bodyEl 	= $("#window > #winbody");
			this.controls 	= ["pin", "size", "close"];
			this.windowEl 	= $("#window");
			this.windowData = windowData;

			this.initWidget();
			this.initListeners();
			this.initControls();
		}

		appendChild (el) {
			this.getBodyElement().appendChild(el);
		}

		initWidget () {
			this.tabs 		= eowTabs("div", {}, []);
			this.getBodyElement().appendChild(this.tabs);

			this.getWindow().setPosition(
				this.getWindowData("x"),
				this.getWindowData("y")
			);
			this.getWindow().setSize(
				this.getWindowData("width"),
				this.getWindowData("height")
			);
		}

		initControls () {
			var controls = $("#window > #wincontrols");
			for(var control of this.controls) {
				switch (control) {
					case "pin":
						controls.appendChild(eowEl("span", { innerHTML: "&#x2299;" }).on("click", this.togglePin.bind(this)));
						break;
					case "size":
						controls.appendChild(eowEl("span", { innerHTML: "&minus;" }).on("click", this.toggleSize.bind(this)));
						break;
					case "close":
						controls.appendChild(eowEl("span", { innerHTML: "&times;" }).on("click", window.close));
						break;
				}
			}
			this.controls = controls.children;
		}

		initListeners () {
			this.isPinned = false;
			this.isMinimized = false;
			this.isMinimizing = false;
			this.isQuitting = false;

			this.getWindow().removeAllListeners();
			//remote.app.removeAllListeners("before-quit");

			this.getWindow().on("move", this.onMove.bind(this));
			this.getWindow().on("resize", this.onResize.bind(this));
			this.getWindow().on("close", this.onClose.bind(this));
			remote.app.on("before-quit", this.onQuit.bind(this));
		}

		onMove () {
			var pos = this.getWindow().getPosition();
			this.setWindowData("x", pos[0]);
			this.setWindowData("y", pos[1]);
			this.saveWidget();
		}

		onResize () {
			if(this.isMinimizing) {
				this.isMinimizing = false;
			} else {
				var size = this.bw.getSize();
				this.setWindowData("width", size[0]);
				this.setWindowData("height", size[1]);
				this.saveWidget();
			}
		}

		onClose () {
			remote.app.removeListeners("before-quit", this.onClose.bind(this));
			if(!this.isQuitting) {
				alert("IS NOT QUITTING");
				var widgets = Widget.loadData("windows");
					delete widgets[this.getWindowData("id")];
					Widget.storeData("windows", widgets);
			}
		}

		onQuit () {
			this.isQuitting = true;
		}

		loadData (key) {
			return Widget.loadData(`${this.id}-${key}`);
		}

		storeData (key, data) {
			Widget.storeData(`${this.id}-${key}`, data);
		}

		toggleSize () {
			if(this.isMinimized) {
				this.getWindow().setSize(this.width, this.height);
			} else {
				var size = this.getWindow().getSize();
				this.width = size[0];
				this.height = size[1];
				this.isMinimizing = true;
				this.getWindow().setSize(this.width, 34);
			}
			this.isMinimized = !this.isMinimized;
		}

		togglePin () {
			if(this.isPinned) {
				this.getWindowElement().cassName = "";
				this.getWindow().setAlwaysOnTop(false);
			} else {
				this.getWindowElement().cassName = "trans";
				this.getWindow().setAlwaysOnTop(true);
			}
			this.isPinned = !this.isPinned;
		}

		addTab (options, cb) {
			cb(this);
		}

		getWindowElement () {
			return this.windowEl;
		}

		getBodyElement () {
			return this.bodyEl;
		}

		getControlElements () {
			return this.controls;
		}

		getTabs () {
			return this.tabs;
		}

		getWindow () {
			return this.bw;
		}

		getWindowData (key) {
			return key ? this.windowData[key] : this.windowData;
		}

		setWindowData (key, data) {
			if(data != undefined)
				this.windowData[key] = data;
			else
				this.windowData = key;
		}

		saveWidget () {
			var widgets = Widget.loadWidgets();
				widgets[this.getWindowData("id")] = {
					id: 		this.getWindowData("id"),
					x: 			this.getWindowData("x"),
					y: 			this.getWindowData("y"),
					width: 		this.getWindowData("width"),
					height: 	this.getWindowData("height"),
					urls: 		this.getWindowData("urls") || []
				};
			Widget.storeData("windows", widgets);
		}


	}

	Widget.initialize = function (options, cb) {
		if(!Widget.instance) Widget.instance = new Widget();
		Widget.instance.addTab(options, cb);
	};

	Widget.getTemplate = function (name) {
		var id = name.replace(/ /g, "");
		return ($("#coretemplates > #" + id) || $("#templates > #" + id)).innerHTML;
	};

	Widget.loadData = function (key) {
		return JSON.parse(localStorage.getItem(key));
	};

	Widget.storeData = function (key, data) {
		localStorage.setItem(key, JSON.stringify(data));
	};

	Widget.loadWidgets = function () {
		return Widget.loadData("windows") || {}; //{ "window-settings": Widget.createWidgetData({ id: "window-settings", urls: ["https://github.com/Robbilie/eow-settings.git"] }) };
	};

	Widget.createWidgetData = function (options) {
		var data = options || {};
		var widgets = Widget.loadWidgets();
		var id = options.id;
		if(!id) {
			do {
				id = "window-" + (Math.random() + "").slice(2);
			} while(widgets[id]);
		}
		return {
			id: 		id,
			x: 			data.x 			|| 0,
			y: 			data.y 			|| 0,
			width: 		data.width 		|| 200,
			height: 	data.height 	|| 200,
			urls: 		data.urls 		|| []
		};
	};

	Widget.createWidget = function (data) {
		Widget.instance = new Widget(Widget.createWidgetData(data));
	}

	Widget.setWidget = function (i) {
		Widget.instance = i;
	};

	Widget.loadWidget = function (id) {
		var widgets = Widget.loadWidgets();
		Widget.instance = new Widget(widgets[id]);
	};

	Widget.saveWidget = function (data) {
		var widgets = Widget.loadWidgets();
			widgets[data.id] = data;
			Widget.storeData("windows", widgets);
		return data;
	};