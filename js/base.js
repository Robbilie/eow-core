		
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

	function eowTabs (el, data, tabs) {
		var id = (Math.random() + "").slice(2);
		data.className = data.className ? data.className + " tabs" : "tabs";

		var base = eowEl(el, data)
			.appendChildren(tabs.map(tab => eowEl("style", { innerHTML: Widget.getTemplate("tab").format({ name: tab.name.replace(/ /g, "") }) })))
			.appendChildren(tabs.map(tab => eowEl("input", { id: "tab-" + tab.name.replace(/ /g, ""), className: "tab-toggle", name: "tab" + id, type: "radio" })))
			.appendChildren([
				eowEl("nav")
					.appendChildren(tabs.map(tab => eowEl("label", { innerHTML: tab.name, htmlFor: "tab-" + tab.name.replace(/ /g, ""), draggable: !!tab.title }))),
				eowEl("article")
					.appendChildren(tabs.map(tab => eowEl("div", { id: "tabcontent-" + tab.name.replace(/ /g, ""), className: "tab", dataset: { name: tab.name } }).appendChildren(tab.content)))
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
			let s = eowEl("style", { innerHTML: Widget.getTemplate("tab").format({ name: name.replace(/ /g, "") }) });
			let i = eowEl("input", { id: "tab-" + name.replace(/ /g, ""), className: "tab-toggle", name: "tab" + id, type: "radio" });
			let l = eowEl("label", { innerHTML: name, htmlFor: "tab-" + name.replace(/ /g, ""), draggable: !!title, dataset: { name: title || "" } })
						.on("dragend", e => console.log(e));
			let a = eowEl("div", { id: "tabcontent-" + name.replace(/ /g, ""), className: "tab", dataset: { name: name } }).appendChildren([content])

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