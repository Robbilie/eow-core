
	"use strict";

	var Marshal 	= require(__base + "Marshal");

	var Parsimmon 	= require(__base + "Parsimmon");

	var regex 		= Parsimmon.regex;
	var str 		= Parsimmon.string;
	var lazy 		= Parsimmon.lazy;
	var digits 		= Parsimmon.digits;
	var seq 		= Parsimmon.seq;
	var alt 		= Parsimmon.alt;
	var sepBy 		= Parsimmon.sepBy;

	String.prototype.hexEncode = function(){
		var hex, i;

		var result = "";
		for (i=0; i<this.length; i++) {
			hex = this.charCodeAt(i).toString(16);
			result += ("0"+hex).slice(-2);
		}

		return result;
	};

	class Parser {

		constructor (msg) {

			var expr 			= lazy("expr", () => alt(none, bool, bytes, float, integer, string, unicode_string, array, hash, tuple, klass, marshal_stream));
			var exprs 			= lazy("exprs", () => sepBy(expr, regex(/,\s*/)));

			var dc_string 		= seq(str('"'), this.char_parser(regex(/[^"\\]+/)).many(), str('"'));
			var sc_string 		= seq(str("'"), this.char_parser(regex(/[^'\\]+/)).many(), str("'"));

			var dc_unicode_string = seq(str('u"'), this.char_parser(regex(/[^"\\]+/).many(), "utf-8"));
			var sc_unicode_string = seq(str("u'"), this.char_parser(regex(/[^'\\]+/).many(), "utf-8"));


			var none 			= str("None").map(x => null);
			var bool 			= alt(str("True"), str("False")).map(x => x == "True");
			var payload 		= seq(regex(/LARGE|HUGE|GIANT/), str(" PAYLOAD"), expr).map(x => x.join(""));
			var bytes 			= alt(seq(regex(/[0-9]+/), str(" bytes")).map(x => x.join("")), payload);
			var integer 		= alt(seq(regex(/[-]?[0-9]+/), str("L")).map(x => x[0]), regex(/[-]?[0-9]+/)).map(x => parseInt(x));
			var float 			= regex(/[\-\+]?[0-9]*\.[0-9]+/).map(x => parseFloat(x));
			var string 			= alt(dc_string, sc_string).map(x => x[1]);
			var unicode_string 	= alt(dc_unicode_string, sc_unicode_string).map(x => x[1]);
			var marshal_stream 	= seq(str("<MarshalStream "), string, str(">")).map(x => this.parseMarshal(x[1]));

			var hash_pair 		= seq(string, regex(/\s*:\s*/), expr).map(x => ({ [x[0]]: x[2] }));
			var klass_pair 		= seq(regex(/\w*/), str("="), expr).map(x => ({ [x[0]]: x[2] }));

			var klass_name 		= regex(/\w*(::\w*)*/);

			var array 			= seq(str("["), exprs, str("]")).map(x => x[1]);
			var hash 			= alt(str("{}").map(x => ({})), seq(str("{"), this.elem_parser(hash_pair), str("}")).map(x => this.red(x[1])));
			var tuple 			= alt(str("(,)").map(x => []), seq(str("("), expr, regex(/\s*,\s*\)/)).map(x => x[1]), seq(str("("), exprs, str(")")).map(x => x[1]));
			var klass 			= seq(klass_name, str("("), this.elem_parser(klass_pair), str(")")).map(x => [x[0], this.red(x[2])]);

			var packet 			= seq(klass_name, str(" "), expr, regex(/\s*/)).map(x => [x[0], x[2]]);

			var pars 			= lazy("a packet parser", () => packet);

			this.parsed = pars.parse(msg);

		}

		red (arr) {
			return arr.reduce((a, b) => { Object.keys(b).map(k => { a[k] = b[k]; }); return a; });
		}

		elem_parser (term) {
			return sepBy(term, regex(/\s*,\s*/));
		}

		char_parser (term, enc) {
			var encoding = enc || "ascii-8bit";
			var binary = regex(/[0-9a-f]{2}/).map(x => parseInt(x, 16));
			var escape_char = alt(str('"'), str("'"), str("\\"), str("/"), str("b").map(x => "\b"), str("f").map(x => "\f"), str("n").map(x => "\n"), str("r").map(x => "\r"), str("t").map(x => "\t"), seq(str("x"), binary).map(x => x[1]));
			return alt(term, seq(str("\\"), escape_char).map(x => x[1])).map(x => x);
		}

		parseMarshal (x) {
			var arr = [];
			x.map(x => {
				if(typeof(x) == "string") {
					x.split("").map(x => arr.push(x.charCodeAt(0)));
				} else {
					arr.push(x);
				}
			});
			var b = new Buffer(arr, "hex");
			console.log(b.toString("hex"));
			var m;
			try {
				m = new Marshal(b);
				m = m.parsed;
			} catch(e) {
				console.log("error:", e);
				m = "error";
			}
			return m;
		}

		getResult () {
			return this.parsed.value;
		}

	}

	module.exports = Parser;
