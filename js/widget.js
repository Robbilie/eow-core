	
	"use strict";

	var remote = require("remote");
	
	class Widget {

		constructor (options) {
			this.win 		= $("#window");
			this.controls 	= options.controls || ["pin", "size", "close"];
			this.bod 		= $("#window > #winbody");
			this.title 		= options.title || "Undefined Title";
			this.name 		= PLUGINDATA.title;
			this.id 		= this.name.replace(/ /g, "");
			this.x 			= this.loadData("x") || options.x || 400;
			this.y 			= this.loadData("y") || options.y || 400;
			this.width 		= this.loadData("width") || options.width || 200;
			this.height 	= this.loadData("height") || options.height || 400;
			this.tabs 		= options.tabs || [this.title];
			this.bw 		= remote.getCurrentWindow();
			this.url 		= location.hash.slice(1);

			this.isPinned = false;
			this.isMinimized = false;
			this.isMinimizing = false;
			this.isQuitting = false;

			this.bw.removeAllListeners();
			remote.app.removeAllListeners("before-quit");

			this.bw.on("move", this.onMove.bind(this));
			this.bw.on("resize", this.onResize.bind(this));
			this.bw.on("close", this.onClose.bind(this));
			remote.app.once("before-quit", this.onQuit.bind(this));

			this.initWidget();
		}

		onMove () {
			var pos = this.bw.getPosition();
			this.x = pos[0];
			this.storeData("x", this.x);
			this.y = pos[1];
			this.storeData("y", this.y);
		}

		onResize () {
			if(this.isMinimizing) {
				this.isMinimizing = false;
			} else {
				var size = this.bw.getSize();
				this.width = size[0];
				this.storeData("width", this.width);
				this.height = size[1];
				this.storeData("height", this.height);
			}
		}

		onClose () {
			if(!this.isQuitting)
			Widget.storeData("windows", Widget.loadData("windows").filter(win => win != this.url));
		}

		onQuit () {
			this.isQuitting = true;
		}

		appendChild (el) {
			this.bod.appendChild(el);
		}

		initWidget () {
			var controls = $("#window > #wincontrols");
			console.log(this.controls);
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

			this.bw.setSize(this.width, this.height);
			this.bw.setPosition(this.x, this.y);
		}

		loadData (key) {
			return JSON.parse(localStorage.getItem(this.id + "-" + key));
		}

		storeData (key, data) {
			localStorage.setItem(this.id + "-" + key, JSON.stringify(data));
		}

		toggleSize () {
			if(this.isMinimized) {
				this.bw.setSize(this.width, this.height);
			} else {
				var size = this.bw.getSize();
				this.width = size[0];
				this.height = size[1];
				this.isMinimizing = true;
				this.bw.setSize(this.width, 34);
			}
			this.isMinimized = !this.isMinimized;
		}

		togglePin () {
			if(this.isPinned) {
				this.win.className = "";
				this.bw.setAlwaysOnTop(false);
			} else {
				this.win.className = "trans";
				this.bw.setAlwaysOnTop(true);
			}
			this.isPinned = !this.isPinned;
		}

	}

	Widget.initialize = function (options, cb) {
		var w = new Widget(options);
		cb(w);
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