		
	"use strict";

	function $ (id) { return document.querySelector(id); }
	function $$ (id) { return document.querySelectorAll(id); }

	String.prototype.format = function() {
		var args = arguments;
		return this.replace(/\${([a-zA-Z\d\-]+)}/g, function(match, varname) {
			return typeof args[0] != 'undefined' && typeof args[0][varname] != 'undefined' ? args[0][varname] : "";
		});
	};

	// Auxiliary method. Retrieves and sanitises the value of a custom property.
	var getVariable = function(styles, propertyName) {
		return String(styles.getPropertyValue(propertyName)).trim();
	};

	// Auxiliary method. Sets the value of a custom property at the document level.
	var setDocumentVariable = function(propertyName, value) {
		document.documentElement.style.setProperty(propertyName, value);
	};

	function eowEl (el, data) {
		var element = typeof el == "string" ? document.createElement(el) : el;

		if(data) for(var i in data) if(i != "dataset" && i != "style") element[i] = data[i];
		if(data && data.style) for(var j in data.style) element.style.setProperty(j, data.style[j]);
		if(data && data.dataset) for(var k in data.dataset) element.dataset[k] = data.dataset[k];

		element.hide = function () { element.style.display = "none"; return element; };
		element.destroy = function () { element.parentNode.removeChild(element); };
		element.show = function () { element.style.display = "block"; return element; };
		element.fadeIn = function () { element.style.opacity = "1"; return element; };
		element.fadeOut = function () { element.style.opacity = "0"; return element; };
		element.appendChildren = function (childs) { childs.map(function (i) { if(i) element.appendChild(i); }); return element; };
		element.beforeChildren = function (childs) { childs.map(function (i) { if(i) element.parentNode.insertBefore(i, element); }); return element; };
		element.clear = function () { element.innerHTML = ""; return element; };
		element.on = function (listen, cb) { element.addEventListener(listen, cb); return element; };
		element.$ = function (id) { return element.querySelector(id); };
		element.$$ = function (id) { return element.querySelectorAll(id); };

		return element;
	}

	function eowTabs (data, tabs) {
		var id = (Math.random() + "").slice(2);
		data.className = (data.className ? data.className + " " : "") + "tabs";

		var styleData = name => {
			var d = Widget.getCurrentTheme();
				d.name = name;
			return d;
		};

		var createStyle 	= name 			=> {
			var sty = eowEl("style", { 
				innerHTML: Widget.getTemplate("tab").format({ name: name }) 
			});
			return sty;
		};

		var createInput 	= name 			=> eowEl("input", { id: "tab-" + name.replace(/ /g, ""), className: "tab-toggle", name: "tab" + id, type: "radio" });
		var createLabel 	= (name, title) => eowEl("label", { innerHTML: name, htmlFor: "tab-" + name.replace(/ /g, ""), draggable: !!title });
		var createTab 		= name 			=> eowEl("div", { id: "tabcontent-" + name.replace(/ /g, ""), className: "tab", dataset: { name: name } });

		var base = eowEl("div", data)
			.appendChildren(tabs.map(tab => createStyle(tab.name)))
			.appendChildren(tabs.map(tab => createInput(tab.name)))
			.appendChildren([
				eowEl("nav")
					.appendChildren([eowEl("div", { className: "title" })])
					.appendChildren(tabs.map(tab => createLabel(tab.name, tab.title))),
				eowEl("article")
					.appendChildren(tabs.map(tab => createTab(tab.name).appendChildren(tab.content)))
			]);
		base.selectTab = name => { 
			Array.from(base.$$(`:scope > input[name="tab${id}"]`)).map(el => { el.checked = false; });
			base.$("#tab-" + name.replace(/ /g, "")).checked = true;
		};
		base.getTab = name => eowEl(base.$(":scope > article > #tabcontent-" + name.replace(/ /g, "")));
		base.setTabContent = (name, content) => {
			eowEl(base.getTab(name), { innerHTML: "" })
				.appendChildren(content);
		};
		base.addTab = (name, content, title) => {
			let s = createStyle(name);
			let i = createInput(name);
			let l = createLabel(name, title);
			let a = createTab(name).appendChildren([content]);

			base
				.getNav()
				.beforeChildren([
					s,
					i
				])
				.appendChild(
					l
				);
			base
				.getArticle()
				.appendChild(
					a
				);
			base.onTabAdd(name, content, title);
			return {
				style: s,
				input: i,
				label: l,
				article: a
			};
		};
		base.removeTab = filter => {

		};
		base.getNav = () => eowEl(base.$(":scope > nav"));
		base.getArticle = () => eowEl(base.$(":scope > article"));
		base.onTabAdd = data.ontabadd || function () {};

		return base;
	}

	function eowButton (data) {
		var base = eowEl("button", data);
		return base;
	}

	function eowTextfield (data) {
		var base = eowEl("input", data);
		return base;
	}

	function eowDropdown (data) {
		var summary = eowEl("summary");
		var ddbody = eowEl("div", { className: "ddbody" });

		var base = eowEl("details", data);
			base.classList.add("dropdown");
			base.appendChildren([
				summary,
				ddbody
			]);

		base.clearOptions = () => {
			ddbody.clear();
		};

		base.addOption = name => {
			var entry = eowEl("div", { innerHTML: name });
			ddbody.appendChild(entry);
			entry.addEventListener("click", (e) => {
				e.stopPropagation();
				base.setSelected(e.target.innerHTML);
				base.open = false;
			});
		};

		base.setSelected = name => {
			summary.innerHTML = base.selected = name;
		};

		base.getSelected = () => base.selected;

		document.addEventListener("click", () => { base.open = false; });
		base.addEventListener("click", e => e.stopPropagation());

		return base;
	}

	function eowRange (data) {
		data.className = (data.className ? data.className + " " : "") + "range";
		data.type = "range";
		var base = eowEl("input", data);
		return base;
	}