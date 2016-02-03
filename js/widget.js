	
	"use strict";

	var remote = require("remote");
	
	class Widget {

		constructor (options) {
			this.win 		= $("#window");
			this.nav 		= $("#window > nav");
			this.bod 		= $("#window > article");
			this.title 		= options.title || "Undefined Title";
			this.name 		= PLUGINDATA.title;
			this.id 		= this.name.replace(/ /g, "");
			this.width 		= options.width || 200;
			this.height 	= options.height || 400;
			this.tabs 		= options.tabs || [this.title];
			this.controls 	= $("#window > .wincontrols").children;

			this.isPinned = false;
			this.isMinimized = false;

			this.initWidget();
		}

		initWidget () {
			this.tabs = this.tabs.map(this.addTab.bind(this));
			this.selectTab(this.tabs[0].getAttribute("data-name"));

			// pin
			this.controls[0].addEventListener("click", this.togglePin.bind(this));

			// minimize
			this.controls[1].addEventListener("click", this.toggleSize.bind(this));

			//close
			this.controls[2].addEventListener("click", window.close);

			remote.getCurrentWindow().setSize(this.width, this.height);
		}

		addTab (name) {
			var id = name.replace(/ /g, "");
			var label = document.createElement("label");
				label.innerHTML = name;
				label.htmlFor = "tab-" + id;
				this.nav.appendChild(label);

			var input = document.createElement("input");
				input.id = "tab-" + id;
				input.name = "tab";
				input.setAttribute("type", "radio");
				this.win.insertBefore(input, this.win.firstChild);
				
			var style = document.createElement("style");
				style.innerHTML = this.getTemplate("tab").format({ name: id });
				this.win.insertBefore(style, this.win.firstChild);

			var div = document.createElement("div");
				div.id = id;
				div.className = "tab";
				div.setAttribute("data-name", name);
				this.bod.appendChild(div);

			return div;
		}

		selectTab (name) {
			Array.from($$("#window > input")).map(el => { el.checked = false; });
			$("#window > #tab-" + name).checked = true;
		}

		getTemplate (name) {
			var id = name.replace(/ /g, "");
			return ($("#coretemplates > #" + id) || $("#templates > #" + id)).innerHTML;
		}

		setTabContent (name, content) {
			var id = name.replace(/ /g, "");
			var tab = $("#window > article #" + id);
				tab.innerHTML = "";
				tab.appendChild(content);
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