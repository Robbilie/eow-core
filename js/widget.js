	
	"use strict";

	var remote = require("remote");
	
	class Widget {

		constructor (options) {
			this.win 		= $("#window");
			this.controls 	= $("#window > .wincontrols").children;
			this.bod 		= $("#window > #winbody");
			this.title 		= options.title || "Undefined Title";
			this.name 		= PLUGINDATA.title;
			this.id 		= this.name.replace(/ /g, "");
			this.width 		= options.width || 200;
			this.height 	= options.height || 400;
			this.tabs 		= options.tabs || [this.title];

			this.isPinned = false;
			this.isMinimized = false;

			this.initWidget();
		}

		appendChild (el) {
			this.bod.appendChild(el);
		}

		initWidget () {
			// pin
			this.controls[0].addEventListener("click", this.togglePin.bind(this));

			// minimize
			this.controls[1].addEventListener("click", this.toggleSize.bind(this));

			//close
			this.controls[2].addEventListener("click", window.close);

			remote.getCurrentWindow().setSize(this.width, this.height);
		}

		storeData (key, data) {
			localStorage.setItem(this.id + "-" + key, JSON.stringify(data));
		}

		loadData (key) {
			return JSON.parse(localStorage.getItem(this.id + "-" + key));
		}

		toggleSize () {
			if(this.isMinimized) {
				remote.getCurrentWindow().setSize(this.width, this.height);
			} else {
				var size = remote.getCurrentWindow().getSize();
				this.width = size[0];
				this.height = size[1];
				remote.getCurrentWindow().setSize(this.width, 34);
			}
			this.isMinimized = !this.isMinimized;
		}

		togglePin () {
			if(this.isPinned) {
				this.win.className = "";
				remote.getCurrentWindow().setAlwaysOnTop(false);
			} else {
				this.win.className = "trans";
				remote.getCurrentWindow().setAlwaysOnTop(true);
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