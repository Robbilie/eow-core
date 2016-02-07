
	"use strict";

	var remote 			= require("remote");
	var electron 		= require("electron");
	var ipcRenderer 	= electron.ipcRenderer;

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
			// load default theme for now
			Widget.loadTheme("Plasma", 0.5);

			// creates widget tabs & append
			this.tabs 		= eowTabs({}, []);
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
				return window.close();
			if(!this.getTabs().$(":scope > input:checked")) {
				this.getPlugin(Object.keys(this.plugins)[0]).getElement("input").checked = true;
			}
		}

		loadPlugin (options, cb) {
			let els = this.getTabs().addTab(options.title, null, options.name);
				els.label.on("dragend", e => {
					let windows = remote.require("./main.js").getWindows();
					var count = Object.keys(windows).length;
					var foundOnTab = false;

					var cb = (e, found, message) => {
						console.log("foundTab", e, found, message);
						if(!foundOnTab && found) {
							Widget.INSTANCE.unloadPlugin(message.name);
							Widget.INSTANCE.removePlugin(message.name);
							remote.require("./main.js").getWindows()[message.id].webContents.send("loadPlugin", { name: message.name });
						}
						foundOnTab = foundOnTab || found;
						count--;
						if(count === 0) {
							if(!foundOnTab) {
								// create new tab
								Widget.INSTANCE.unloadPlugin(message.name);
								Widget.INSTANCE.removePlugin(message.name);
								remote.require("./main.js").loadWidget(
									Widget.saveWidget(
										Widget.createWidget({ 
											x: 		message.x, 
											y: 		message.y, 
											width: 	message.width,
											height: message.height,
											plugins: [message.name] 
										})
									).id
								);
							}
							ipcRenderer.removeListener("foundTab", cb);
						}
					};
					ipcRenderer.on("foundTab", cb);

					Object.keys(windows)
						.filter(k => k != this.getWidgetData("id"))
						.map(k => windows[k].webContents.send("checkTab", { 
							id: 	this.getWidgetData("id"),
							x: 		e.clientX, 
							y: 		e.clientY, 
							width: 	this.getWidgetData("width"), 
							height: this.getWidgetData("height"),
							name: 	options.name 
						}));

				});
			let plu = new Plugin(options.name, els, this);
			this.setPlugin(options.name, plu);
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
			this.getWidgetElement().classList.toggle("trans");
			this.getWindow().setAlwaysOnTop(!this.isPinned);
			this.isPinned = !this.isPinned;
		}

		// getter/setter
		
		getWindow () { 					return this.bw; }

		getTabs () { 					return this.tabs; }

		getPlugins () { 				return this.plugins; }

		getPlugin (name) { 				return this.plugins[name]; }

		setPlugin (name, plugin) { 		this.plugins[name] = plugin; }

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
			if(!this.isQuitting && this.getWidgetData("id") != "widget-settings") {
				Widget.deleteWidget(this.getWidgetData("id"));
			}
		}

		onQuit () {
			this.isQuitting = true;
		}

	}

	Widget.INSTANCE 		= null;
	Widget.PLUGINDATA 		= {};
	Widget.THEMES 			= {
		Minmatar: 		[[0.4662, 0.3118, 0.2241], 	[0.0679, 0.0718, 0.0736]],
		Minmatar2: 		[[0.4689, 0.3159, 0.1836], 	[0.058, 0.053, 0.0485]],
		Amarr: 			[[0.5882, 0.4529, 0.171], 	[0.0061, 0.0049, 0.0045]],
		Amarr2: 		[[0.6958, 0.5668, 0.2853], 	[0.0303, 0.0187, 0.0226]],
		Gallente: 		[[0.2117, 0.4556, 0.3905], 	[0.0393, 0.0714, 0.08]],
		Gallente2: 		[[0.1983, 0.4517, 0.4556], 	[0.065, 0.0736, 0.0723]],
		Caldari: 		[[0.2823, 0.3898, 0.4926], 	[0.0739, 0.0764, 0.0771]],
		Caldari2: 		[[0.2773, 0.4002, 0.563], 	[0.0676, 0.0674, 0.0674]],
		ORE: 			[[0.585, 0.5541, 0.1278], 	[0.044, 0.069, 0.0872]],
		Guristas: 		[[0.5176, 0.4574, 0.361], 	[0.056, 0.0362, 0.0126]],
		SanshasNation: 	[[0.3269, 0.3395, 0.1569], 	[0.0605, 0.0593, 0.044]],
		BloodRaiders: 	[[0.3529, 0.084, 0.0504], 	[0.0363, 0.0232, 0.0174]],
		AngelCartel: 	[[0.4622, 0.4268, 0.4008], 	[0.057, 0.0315, 0.0205]],
		Serpentis: 		[[0.2529, 0.3849, 0.2538], 	[0.0459, 0.0459, 0.0459]],
		SOE: 			[[0.6353, 0.6353, 0.6353], 	[0.0056, 0.0494, 0.047]],
		MordusLegion: 	[[0.35, 0.3716, 0.4403], 	[0.036, 0.037, 0.0429]],
		DarkMatter: 	[[0.25, 0.25, 0.25], 		[0.01, 0.01, 0.01]],
		Carbon: 		[[0.4315, 0.4315, 0.4315], 	[0.0444, 0.0444, 0.0444]],
		Plasma: 		[[0.088, 0.4377, 0.5722], 	[0.0258, 0.0581, 0.0839]],
		Radar: 			[[0.2369, 0.3167, 0.2396], 	[0.0246, 0.0433, 0.0332]],
		Nebula: 		[[0.4186, 0.1506, 0.1171], 	[0.0131, 0.0285, 0.0262]]
	};

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
			width: 		options.width 	|| 256,
			height: 	options.height 	|| 128,
			plugins: 	options.plugins || []
		};
	};

	Widget.getTemplate 		= (title, name) => {
		return ($(`#coretemplates > #${title}`) || $(`#templates-${name.replace("/", "_")} > #${title}`)).textContent;
	};

	Widget.getTheme 		= (id, opacity) => {
		opacity = opacity || 1;
		return Widget.THEMES[id].map(theme => `rgba(\$\{0}, \$\{1}, \$\{2}, ${opacity})`.format(theme.map(i => parseInt(i * 255))));
	};

	Widget.getCurrentThemeID = () 			=> Widget.currentTheme;
	Widget.getCurrentOpacity = () 			=> Widget.currentOpacity;
	Widget.getCurrentTheme 	 = () 			=> Widget.getTheme(Widget.currentTheme, Widget.currentOpacity);

	Widget.loadTheme 		= (id, opacity) => {
		Widget.currentTheme 			= id;
		Widget.currentOpacity 			= opacity;
		$("#currenttheme").innerHTML 	= Widget.getTemplate("theme").format(Widget.getTheme(id, opacity));
	};
