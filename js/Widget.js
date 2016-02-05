
	"use strict";

	var remote = require("remote");

	class Widget {

		// only window config
		constructor (data) {
			this.bw 		= remote.getCurrentWindow();
			this.bodyEl 	= $("#widget > #widgetbody");
			this.controls 	= [
				{ ico: "&#x2299;", 	on: this.togglePin.bind(this) }, 
				{ ico: "&minus;", 	on: this.toggleSize.bind(this) }, 
				{ ico: "&times;", 	on: window.close }];
			this.widgetEl 	= $("#widget");
			this.widgetData = data;
			this.plugins 	= {};

			this.init();
		}

		init () {
			// creates widget tabs & append
			this.tabs 		= eowTabs("div", {}, []);
			this.getBodyElement().appendChild(this.tabs);

			// set position & scale
			this.getWindow().setPosition(
				this.getWidgetData("x"),
				this.getWidgetData("y")
			);
			this.getWindow().setSize(
				this.getWidgetData("width"),
				this.getWidgetData("height")
			);

			// attach events
			this.isPinned = this.isMinimized = this.isMinimizing = this.isQuitting = false;
			this.getWindow().removeAllListeners();
			this.getWindow().on("move", 	this.onMove.bind(this));
			this.getWindow().on("resize", 	this.onResize.bind(this));
			this.getWindow().on("close", 	this.onClose.bind(this));

			let controls = $("#widget > #widgetcontrols");
			this.controls.map(c => controls.appendChild(eowEl("span", { innerHTML: c.ico }).on("click", c.on)));
		}

		addPlugin (name) {
			if(this.getWidgetData("plugins").indexOf(name) < 0) this.getWidgetData("plugins").push(name);
			this.saveWidget();
		}

		removePlugin (name) {
			this.setWidgetData("plugins", this.getWidgetData("plugins").filter(p => p != name));
			delete this.plugins[name];
			if(Object.keys(this.plugins).length > 0)
				this.saveWidget();
			else
				window.close();
		}

		loadPlugin (options, cb) {
			let els = this.getTabs().addTab(options.title, null, options.name);
				els.label.on("dragend", e => {
					let windows = remote.require("./main.js").getWindows();
					Object.keys(windows)
						.filter(k => k != this.getWidgetData("id"))
						.map(k => windows[k].webContents.send("checkTab", { 
							id: this.getWidgetData("id"),
							x: e.clientX, 
							y: e.clientY, 
							name: options.name 
						}));
				});
			let plu = new Plugin(options.name, els, this);
			this.plugins[options.name] = plu;
			this.getTabs().selectTab(options.title);
			cb(plu);
		}

		unloadPlugin (name) {
			this.plugins[name].unload();
		}

		toggleSize () {
			if(this.isMinimized) {
				this.getWindow().setSize(this.width, this.height);
			} else {
				let size = this.getWindow().getSize();
				this.width = size[0];
				this.height = size[1];
				this.isMinimizing = true;
				this.getWindow().setSize(this.width, 34);
			}
			this.isMinimized = !this.isMinimized;
		}

		togglePin () {
			this.getWidgetElement().className = this.isPinned ? "" : "trans";
			this.getWindow().setAlwaysOnTop(!this.isPinned);
			this.isPinned = !this.isPinned;
		}

		// getter/setter
		
		getWindow () { 					return this.bw; }

		getTabs () { 					return this.tabs; }

		getBodyElement () { 			return this.bodyEl; }

		getWidgetElement () { 			return this.widgetEl; }

		getWidgetData (key) { 			return key ? this.widgetData[key] : this.widgetData; }

		setWidgetData (key, data) {		if(data !== undefined) this.widgetData[key] = data; else this.widgetData = key; }

		saveWidget () { 				Widget.saveWidget(this.getWidgetData()); }

		// events
		
		onMove () {
			let pos = this.getWindow().getPosition();
			this.setWidgetData("x", pos[0]);
			this.setWidgetData("y", pos[1]);
			this.saveWidget();
		}

		onResize () {
			if(this.isMinimizing) {
				this.isMinimizing = false;
			} else {
				let size = this.bw.getSize();
				this.setWidgetData("width", size[0]);
				this.setWidgetData("height", size[1]);
				this.saveWidget();
			}
		}

		onClose () {
			if(!this.isQuitting) {
				Widget.deleteWidget(this.getWidgetData("id"));
			}
		}

		onQuit () {
			this.isQuitting = true;
		}

	}

	Widget.INSTANCE 		= null;
	Widget.PLUGINDATA 		= {};

	Widget.getRandom 		= () 			=> Math.random().toString().slice(2);

	Widget.loadData 		= key 			=> JSON.parse(localStorage.getItem(key));

	Widget.storeData 		= (key, value) 	=> { localStorage.setItem(key, JSON.stringify(value)); return value; };

	Widget.loadWidgets 		= () 			=> Widget.loadData("widgets") || {};

	Widget.loadWidget 		= widgetID 		=> Widget.loadWidgets()[widgetID];

	Widget.saveWidget 		= data 			=> { 	Widget.storeData("widgets", ((d) => { let r = Widget.loadData("widgets"); r[d.id] = d; 		return r; })(data)); return data; };

	Widget.deleteWidget 	= id 			=> 		Widget.storeData("widgets", ((d) => { let r = Widget.loadData("widgets"); delete r[d]; 		return r; })(id));

	Widget.createWidget 	= options 		=> {
		let widgets = Widget.loadWidgets();
		if(!options.id) {
			do {
				options.id = `widget-${Widget.getRandom()}`;
			} while(widgets[options.id]);
		}
		return {
			id: 		options.id,
			x: 			options.x 		|| 0,
			y: 			options.y 		|| 0,
			width: 		options.width 	|| 200,
			height: 	options.height 	|| 200,
			plugins: 	options.plugins || []
		};
	};

	Widget.getTemplate 		= (title, name) => {
		return ($(`#coretemplates > #${title}`) || $(`#templates-${name.replace("/", "_")} > #${title}`)).innerHTML;
	};
