
	"use strict";

	var net 		= require("net");
	var fs 			= require("fs");
	var Message 	= require(__base + "Message");
	var Parser 		= require(__base + "Parser");

	String.prototype.hexEncode = function(){
		var hex, i;

		var result = "";
		for (i=0; i<this.length; i++) {
			hex = this.charCodeAt(i).toString(16);
			result += ("0"+hex).slice(-2);
		}

		return result;
	};

	Object.defineProperty(Buffer.prototype, 'chunk', {
		value: function(chunkSize) {
			var R = [];
			for (var i=0; i<this.length; i+=chunkSize)
				R.push(this.slice(i,i+chunkSize));
			return R;
		}
	});

	class LogServer {

		constructor (debug) {
			this.port = 0xcc9;
			this.clients = [];
			/*
				TYPES
				- connect
				- init
				- character
				- disconnect
			 */
			this.listeners = [];

			this.server = net.createServer(socket => {

				socket.receivedConnectionMessage = false;
				this.clients.push(socket);

				this.distributeMessage("connect", socket);

				var bufferedData = new Buffer("");

				socket.on("data", data => {
					bufferedData = Buffer.concat([bufferedData, data]);

					while(bufferedData.length >= 344) {
						
						var buf = bufferedData.slice(0, 344);
						bufferedData = bufferedData.slice(344, bufferedData.length);

						if(buf.length < 344) {
							console.log(buf.toString("hex"));
							return;
						}

						// parse packet
						var packet = new Message(buf);
						var msg = packet.getResult();

						if((msg.type != Message.TYPE.CONNECTION_MESSAGE) != socket.receivedConnectionMessage) {
							// socket didnt send connection message
							socket.destroy();
							return;
						}

						if(msg.type == Message.TYPE.CONNECTION_MESSAGE) {
							if(msg.body.version > Message.VERSION) {
								// unknown version
								socket.destroy();
								return;
							}
							socket.version 						= msg.body.version;
							socket.receivedConnectionMessage 	= true;
							socket.pid 							= msg.body.pid;
							socket.machineName 					= msg.body.machine_name;
							socket.executablePath 				= msg.body.executable_path;

							this.distributeMessage("init", socket);

							if(debug)
								socket.writer = fs.createWriteStream(`./logs/${socket.pid}.json`);
						}
						if(socket.nextMessage) {
							socket.nextMessage.message += msg.body.message;
						} else {
							var nextMessage = {};
							if(socket.version == 1) {
								nextMessage.timestamp = msg.body.timestamp;
							} else {
								nextMessage.timestamp = msg.body.timestamp;
							}
							nextMessage.pid = socket.pid;
							nextMessage.severity = msg.body.severity;
							nextMessage.machineName = socket.machineName;
							nextMessage.executablePath = socket.executablePath;
							nextMessage.module = msg.body.module;
							nextMessage.channel = msg.body.channel;
							nextMessage.message = msg.body.message;

							socket.nextMessage = nextMessage;
						}
						if(msg.type == Message.TYPE.SIMPLE_MESSAGE || msg.type == Message.TYPE.CONTINUATION_END_MESSAGE) {

							socket.nextMessage.plain = socket.nextMessage.message;
							var pmsg = this.parseMessage(socket.nextMessage.message);
							if(pmsg)
								socket.nextMessage.message = pmsg;

							this.distributeMessage("data", socket, socket.nextMessage);

							if(
								socket.nextMessage.message[0] &&
								socket.nextMessage.message[0] == "Packet::CallReq" &&
								socket.nextMessage.message[1] &&
								socket.nextMessage.message[1].length >= 4 &&
								socket.nextMessage.message[1][3].length == 4 &&
								socket.nextMessage.message[1][3][1].length == 1 &&
								socket.nextMessage.message[1][3][1][0] == "SelectCharacterID"
							) {
								socket.characterID = socket.nextMessage.message[1][3][2][0];
								this.distributeMessage("character", socket);
							}

							if(socket.writer)
								socket.writer.write(JSON.stringify(socket.nextMessage, null, 2));
							delete socket.nextMessage;
						}
					}
				});

				socket.on("end", () => {
					console.log("disconnect", socket.pid);
					this.distributeMessage("disconnect", socket);
					this.clients.splice(this.clients.indexOf(socket), 1);
				});

			}).listen(this.port);

		}

		distributeMessage (type, socket, msg) {
			this.listeners.filter(l => l.type == type).forEach(l => l.listener(socket, msg));
		}

		registerListener (type, listener) {
			this.listeners.push({ type: type, listener: listener });
		}

		removeListener (type, listener) {
			this.listeners = this.listeners.filter(l => !(l.type == type && l.listener == listener));
		}

		parseMessage (msg) {
			if(msg)
				return new Parser(msg.replace(/Read:  |Write:  /, "")).getResult();
			return false;
		}

		getClients () {
			return this.clients;
		}

		getClientByCharacterID (charID) {
			return this.clients.filter(socket => socket.characterID == charID)[0];
		}

	}

	module.exports = LogServer;
