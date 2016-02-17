
	"use strict";

	var fs 				= require("fs");

	class Plugin {

		constructor (name, elements, widget) {
			this.name 		= name;
			this.elements 	= elements;
			this.widget 	= widget;
		}

		getBody () { return this.elements.article; }

		getElements () { return this.elements; }

		getElement (key) { return this.elements[key]; }

		getWidget () { return this.widget; }

		unload () {
			Object.keys(this.getElements()).map(k => this.getElement(k).destroy());
		}

	}

	Plugin.load = name => {
		let repo = {};
		let token = Widget.loadData("accesstoken");

		require('js-github/mixins/github-db')(repo, name, token);
		require('js-git/mixins/create-tree')(repo);
		require('js-git/mixins/mem-cache')(repo);
		require('js-git/mixins/read-combiner')(repo);
		require('js-git/mixins/formats')(repo);

		repo.readRef("refs/heads/master", (err, hash) => {
			if(err) {
				// offline, load from fs
				Plugin.loadOffline(name);
			} else {
				Plugin.loadOnline(name, hash, repo);
			}
		});
	};

	Plugin.loadOffline = name => {
		let path 			= `./plugins/${name}`;
		let plugin 			= JSON.parse(fs.readFileSync(`${path}/package.json`));
			plugin.url 		= `https://github.com/${name}.git`;
			plugin.path 	= path;
			plugin.name 	= name;
		Widget.PLUGINDATA[name] = plugin;

		// inject plugin
		if(plugin.templates)
			document.body.appendChild(eowEl("div", { 
				id: `templates-${name.replace("/", "_")}`, 
				className: "templates", 
				innerHTML: fs.readFileSync(`${path}/${plugin.templates}`) 
			}));

		if(plugin.css)
			document.head.appendChild(eowEl("link", {
				rel: "stylesheet",
				type: "text/css",
				href: `.${path}/${plugin.css}`
			}));

		if(plugin.js)
			document.head.appendChild(eowEl("script", {
				type: "text/javascript",
				src: `.${path}/${plugin.js}`
			}));
	};

	Plugin.loadOnline = (name, hash, repo) => {
		repo.loadAs("commit", hash, (err, commit) => {
			repo.loadAs("tree", commit.tree, (err, tree) => {
				repo.loadAs("text", tree["package.json"].hash, (err, fdata) => {
					let packagedata = JSON.parse(fdata);
					let localdata = { version: "" };
					if(fs.existsSync(`./plugins/${name}/package.json`)) localdata = JSON.parse(fs.readFileSync(`./plugins/${name}/package.json`));
					if(packagedata.version > localdata.version) {
						console.log("updateing plugin: " + name);
						Plugin.store(name, tree, repo, () => {
							console.log("stored");
							Plugin.loadOffline(name);
						});
					} else {
						Plugin.loadOffline(name);
					}
				});
			});
		});
	};

	Plugin.store = (name, tree, repo, cb) => {
		[`./plugins`, `./plugins/${name.split("/")[0]}`, `./plugins/${name}`].map(p => { try { fs.mkdirSync(p); } catch(e) {} });

		let path = `./plugins/${name}/`;

		console.log(tree);

		let store = filename => 
			repo.loadAs("blob", tree[filename].hash, (err, fdata) => {
				fs.writeFileSync(path + filename, fdata);
				count--;
				if(!count) cb();
			});

		let count = Object.keys(tree).length;
		for(let i in tree) store(i);
	};