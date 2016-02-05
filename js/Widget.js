
	"use strict";

	var remote = require("remote");

	class Widget {

		// only window config
		constructor (data) {
			this.bw 		= remote.getCurrentWindow();
			this.bodyEl 	= $("#widget > #widgetbody");
			this.controls 	= [{ ico: "&#x2299;", on: this.togglePin.bind(this) }, { ico: "&minus;", on: this.toggleSize.bind(this) }, { ico: "&times;", on: window.close }];
			this.widgetEl 	= $("#widget");
			this.widgetData = data;
			this.plugins 	= [];

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
			remote.app.on("before-quit", 	this.onQuit.bind(this));

			let controls = $("#widget > #widgetcontrols");
			this.controls.map(c => controls.appendChild(eowEl("span", { innerHTML: c.ico }).on("click", c.on)));
		}

		addPlugin (name) {
			if(this.getWidgetData("plugins").indexOf(name) < 0) this.getWidgetData("plugins").push(name);
			this.saveWidget();
		}

		loadPlugin (options, cb) {
			let els = this.getTabs().addTab(options.title, null, options.name);
			let plu = new Plugin(options.name, els, this);
			this.plugins.push(plu);
			this.getTabs().selectTab(options.title);
			cb(plu);
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

		setWidgetData (key, data) {		if(data != undefined) this.widgetData[key] = data; else this.widgetData = key; }

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
			remote.app.removeListeners("before-quit", this.onClose.bind(this));
			if(!this.isQuitting) Widget.deleteWidget(this.getWindowData("id"));
		}

		onQuit () {
			this.isQuitting = true;
		}

	}

	Widget.INSTANCE 		= null;
	Widget.PLUGINDATA 		= {};

	Widget.getRandom 		= () 			=> Math.random().toString().slice(2);

	Widget.loadData 		= key 			=> JSON.parse(localStorage.getItem(key));

	Widget.storeData 		= (key, value) 	=> localStorage.setItem(key, JSON.stringify(value));

	Widget.loadWidgets 		= () 			=> Widget.loadData("widgets") || {};

	Widget.loadWidget 		= widgetID 		=> Widget.loadWidgets()[widgetID];

	Widget.saveWidget 		= data 			=> Widget.storeData("widgets", ((d) => { let r = Widget.loadData("widgets"); r[d.id] = d; 		return r; })(data));

	Widget.deleteWidget 	= data 			=> Widget.storeData("widgets", ((d) => { let r = Widget.loadData("widgets"); delete r[d.id]; 	return r; })(data));

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
