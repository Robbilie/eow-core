		
	"use strict";

	function $ (id) { return document.querySelector(id); }
	function $$ (id) { return document.querySelectorAll(id); }

	String.prototype.format = function() {
		var args = arguments;
		return this.replace(/\${([a-zA-Z\d]+)}/g, function(match, varname) {
			return typeof args[0] != 'undefined' && typeof args[0][varname] != 'undefined' ? args[0][varname] : "";
		});
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

		var createStyle 	= name 			=> eowEl("style", { innerHTML: Widget.getTemplate("tab").format({ name: name.replace(/ /g, ""), color: Widget.getCurrentTheme()[0] }) });
		var createInput 	= name 			=> eowEl("input", { id: "tab-" + name.replace(/ /g, ""), className: "tab-toggle", name: "tab" + id, type: "radio" });
		var createLabel 	= (name, title) => eowEl("label", { className: "theme-element-background-secondary", innerHTML: name, htmlFor: "tab-" + name.replace(/ /g, ""), draggable: !!title });
		var createTab 		= name 			=> eowEl("div", { id: "tabcontent-" + name.replace(/ /g, ""), className: "tab", dataset: { name: name } });

		var base = eowEl("div", data)
			.appendChildren(tabs.map(tab => createStyle(tab.name)))
			.appendChildren(tabs.map(tab => createInput(tab.name)))
			.appendChildren([
				eowEl("nav")
					.appendChildren([eowEl("div", { className: "title" })])
					.appendChildren(tabs.map(tab => createLabel(tab.name, tab.title))),
				eowEl("article", { className: "theme-element-border-primary" })
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
		data.className = (data.className ? data.className + " " : "") + "theme-element-background-primary theme-element-border-primary";

		var base = eowEl("button", data);

		return base;
	}

	function eowTextfield (data) {
		data.className = (data.className ? data.className + " " : "") + "theme-element-saturate-30 theme-element-background-primary theme-element-border-primary";

		var base = eowEl("input", data);

		return base;
	}