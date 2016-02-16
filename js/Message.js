
	"use strict";

	class Message {

		constructor (buffer) {
			this.index = 0;
			this.buffer = buffer;

			this.BASE = {
				type: () => { 
					this.index += 4;
					return this.buffer.readUInt32LE(this.index - 4);
				},
				body: {
					connection: {
						version: () => { 
							this.index += 8;
							return this.buffer.readUInt32LE(this.index - 4);
						},
						pid: () => { 
							this.index += 12;
							return this.buffer.readUIntLE(this.index - 8, 8);
						},
						machine_name: () => { 
							this.index += 32;

							var off = this.buffer.indexOf(new Buffer("00", "hex"), this.index - 32, "hex");
							return this.buffer.toString("utf8", this.index - 32, off);
						},
						executable_path: () => {
							this.index += 260;

							var off = this.buffer.indexOf(new Buffer("00", "hex"), this.index - 260, "hex");
							return this.buffer.toString("utf-8", this.index - 260, off);
						}
					},
					text: {
						timestamp: () => { 
							this.index += 8;
							return this.buffer.readUIntLE(this.index - 8, 8);
						},
						severity: () => {
							this.index += 4;
							return this.buffer.readUInt32LE(this.index - 4);
						},
						module: () => {
							this.index += 32;

							var off = this.buffer.indexOf(new Buffer("00", "hex"), this.index - 32, "hex");
							return this.buffer.toString("utf8", this.index - 32, off);
						},
						channel: () => {
							this.index += 32;

							var off = this.buffer.indexOf(new Buffer("00", "hex"), this.index - 32, "hex");
							return this.buffer.toString("utf8", this.index - 32, off);
						},
						message: () => {
							this.index += 256;

							var off = this.buffer.indexOf(new Buffer("00", "hex"), this.index - 256, "hex");
							return this.buffer.toString("utf8", this.index - 256, off);
						}
					}
				}
			};

			this.parsePacket();
		}

		parsePacket () {
			this.ret = { type: this.BASE.type(), body: {} };
			switch(this.ret.type) {
				case Message.TYPE.CONNECTION_MESSAGE:
					this.parseField(this.BASE.body.connection, this.ret.body);
					break;
				default:
					this.index += 4;
					this.parseField(this.BASE.body.text, this.ret.body);
					break;
			}
		}

		parseField (base, ret) {
			Object.keys(base).map(k => {
				switch(typeof(base[k])) {
					case "object":
						ret[k] = {};
						this.parseField(base[k], ret[k]);
						break;
					case "function":
						ret[k] = base[k]();
						break;
					default:
						ret[k] = base[k];
						break;
				}
			});
		}

		getResult () {
			return this.ret;
		}

	}

	Message.TYPE = {
		CONNECTION_MESSAGE: 0,
    	SIMPLE_MESSAGE: 1,
    	LARGE_MESSAGE: 2,
    	CONTINUATION_MESSAGE: 3,
    	CONTINUATION_END_MESSAGE: 4
	};

	Message.VERSION = 2;

	module.exports = Message;