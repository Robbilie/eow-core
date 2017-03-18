
	"use strict";

	class Marshal {

		constructor (buffer, encoding) {
			this.STORAGE = null;
			this.sharedMapData = null;
			this.sharedMap = null;
			this.sharedCount = 0;
			this.index = 0;
			this.buffer = null;
			this.parsed = null;

			this.load(buffer, encoding);
		}

		load (buffer, encoding) {
			if (buffer instanceof Buffer) {
				this.buffer = buffer;
			} else {
				this.buffer = new Buffer(buffer, encoding);
			}

			var sharedSize		= buffer.readUInt32LE(1);
			var sharedSizeBytes = sharedSize * 4;

			this.sharedMapData	= new ArrayBuffer(sharedSizeBytes);
			( new Uint8Array(this.sharedMapData) ).set(buffer.slice(buffer.length - sharedSizeBytes));

			this.sharedMap 		= new Uint32Array(this.sharedMapData);

			this.STORAGE 		= [];
			this.sharedCount 	= 0;
			this.index 			= 5;
			this.parsed 		= this.parse();
		}

		parse () {
			var typeCode = this.buffer.readUInt8(this.index++);
			var shared = (typeCode & Marshal.SHARED_FLAG) == Marshal.SHARED_FLAG;
			typeCode &= ~Marshal.SHARED_FLAG;

			//console.log("TYPE", typeCode, shared, this.index);

			var res;
			switch (typeCode) {
				case Marshal.TYPE.NONE:
					res = null; break;
				case Marshal.TYPE.GLOBAL:
					res = { "(global)": this.parseString(this.parseIntLE(1)) }; break;
				case Marshal.TYPE.INT64:
					res = this.parseIntLE(8); break;
				case Marshal.TYPE.INT32:
					res = this.parseIntLE(4); break;
				case Marshal.TYPE.INT16:
					res = this.parseIntLE(2); break;
				case Marshal.TYPE.INT8:
					res = this.parseIntLE(1); break;
				case Marshal.TYPE.MINUSONE:
					res = -1; break;
				case Marshal.TYPE.ZERO:
					res = 0; break;
				case Marshal.TYPE.ONE:
					res = 1; break;
				case Marshal.TYPE.FLOAT:
					res = this.buffer.readDoubleLE(this.index);
					this.index += 8; break;
				case Marshal.TYPE.FLOAT0:
					res = 0.0; break;
				case Marshal.TYPE.STRINGL:
				case Marshal.TYPE.STRING:
				case Marshal.TYPE.UNICODE:
				case Marshal.TYPE.BUFFER:
				case Marshal.TYPE.UTF8:
					var l = this.parseIntLE(1);
					if (l == 255)
						l = this.parseIntLE(4);
					res = this.parseString(l); break;
				case Marshal.TYPE.STRING0:
				case Marshal.TYPE.UNICODE0:
					res = ""; break;
				case Marshal.TYPE.STRING1:
					res = this.parseString(1); break;
				case Marshal.TYPE.UNICODE1:
					res = this.parseString(2, "utf16le"); break;
				case Marshal.TYPE.STRINGR:
					res = Marshal.stringTable[this.parseIntLE(1)]; break;
				case Marshal.TYPE.TUPLE:
				case Marshal.TYPE.LIST:
					res = this.parseArray(this.parseIntLE(1)); break;
				case Marshal.TYPE.DICT:
					res = this.parseDict(); break;
				case Marshal.TYPE.INSTANCE:
					res = { "(instancename)": this.parse(), "(instancedata)": this.parse() }; break;
				case Marshal.TYPE.BLUE:
					this.index++;
					res = "(blue)"; break;
				case Marshal.TYPE.CALLBACK:
					res = { "(callback)": this.parse() }; break;
				case Marshal.TYPE.REF:
					res = this.STORAGE[this.parseIntLE(1) - 1]; break;
				case Marshal.TYPE.CHECKSUM:
					this.index++;
					res = "(checksum)"; break;
				case Marshal.TYPE.COMPRESS:
					this.index++;
					res = "(compress)"; break;
				case Marshal.TYPE.TRUE:
					res = true; break;
				case Marshal.TYPE.FALSE:
					res = false; break;
				case Marshal.TYPE.PICKLER:
					this.index++;
					res = "(pickler)"; break;
				case Marshal.TYPE.REDUCE:
					res = { "(reduce)": this.parse() }; break;
				case Marshal.TYPE.NEWOBJ:
					res = { "(newobj)": this.parse() }; break;
				case Marshal.TYPE.TUPLE0:
				case Marshal.TYPE.LIST0:
					res = []; break;
				case Marshal.TYPE.TUPLE1:
				case Marshal.TYPE.LIST1:
					res = this.parseArray(1); break;
				case Marshal.TYPE.DBROW:
					res = { "(dbrow)": this.parseDBRow() }; break;
				case Marshal.TYPE.STREAM:
					res = this.parseStream(); break;
				case Marshal.TYPE.TUPLE2:
					res = this.parseArray(2); break;
				case Marshal.TYPE.MARK:
					res = "(mark)"; break;
				case Marshal.TYPE.LONG:
					res = this.parseIntLE(this.parseIntLE(1)); break;
			}

			if(shared) {
				this.STORAGE[this.sharedMap[this.sharedCount] - 1] = res;
				this.sharedCount += 1;
			}
			return res;
		}

		parseDBRow () {
			var res = {};
				res.columns = this.parse();
			if(!res.columns["(reduce)"])
				return null;
			var cols = res.columns["(reduce)"][1][0];
				//cols = cols.sort((a, b) => { return a[1] > b[1]; });
				//cols.push(cols.shift());

			//this.index += 4;

				res.row = [];
			for(var i = 0; i < cols.length; i++) {
				switch (cols[i][1]) {
					case Marshal.DBTYPE.I2:
						res.row.push(this.parseIntLE(2)); break;
					case Marshal.DBTYPE.I4:
						res.row.push(this.parseIntLE(4)); break;
					case Marshal.DBTYPE.WSTR:
						var strleng = this.parseIntLE(1);
						console.log("strl", strleng);
						res.row.push(this.parseString(strleng)); break;
						
				}
				this.index++;
			}
			//this.index--;

			return res;
		}

		parseIntLE (l) {
			var num = this.buffer.readUIntLE(this.index, l);
			this.index += l;
			return num;
		}

		parseString (l, encoding) {
			var str 	= this.buffer.toString(encoding || "utf8", this.index, this.index + l);
			this.index += l;
			return str;
		}

		parseArray (l) {
			return Array.apply(null, Array(l)).map(this.parse.bind(this));
		}

		parseDict () {
			var l = this.parseIntLE(1);
			var data = {};
			for(var i = 0; i < l; i++) {
				var tmp = this.parse();
				var tmpind = this.parse();

				if(typeof tmpind != "string" && typeof tmp == "string")
					data[tmp] = tmpind;
				else
					data[tmpind] = tmp;
			}
			return data;
		}

		parseStream () {
			var tmpind = this.index;
			var length = this.parseIntLE(1);
			if (length == 255)
				length = this.parseIntLE(4);

			var res = new Marshal(this.buffer.slice(this.index, this.index + length)).parsed;

			this.index += length;

			return res;
		}

	}

	Marshal.PROTOCOL_ID = 	0x7e;
	Marshal.TYPE = {
		NONE: 			0x01,  //  1: None
		GLOBAL: 		0x02,  //  2: usually a type, function or class object, but just the name,
							   //     so it has to exist for this to decode properly.
		INT64: 			0x03,  //  3: 8 byte signed int
		INT32: 			0x04,  //  4: 4 byte signed int
		INT16: 			0x05,  //  5: 2 byte signed int
		INT8: 			0x06,  //  6: 1 byte signed int
		MINUSONE: 		0x07,  //  7: the value of -1
		ZERO: 			0x08,  //  8: the value of 0
		ONE: 			0x09,  //  9: the value of 1
		FLOAT: 			0x0a,  // 10: 8 byte float
		FLOAT0: 		0x0b,  // 11: the value of 0.0
		//COMPLEX: 		0x0c,  // 12: (not used, complex number)
		STRINGL: 		0x0d,  // 13: string, longer than 255 characters using normal count*
		STRING0: 		0x0e,  // 14: string, empty
		STRING1: 		0x0f,  // 15: string, 1 character
		STRING: 		0x10,  // 16: string, next byte is 0x00 - 0xff being the count.
		STRINGR: 		0x11,  // 17: string, reference to line in strings.txt (stringTable)
		UNICODE: 		0x12,  // 18: unicode string, next byte is count*
		BUFFER: 		0x13,  // 19: buffer object... hmmm
		TUPLE: 			0x14,  // 20: tuple, next byte is count*
		LIST: 			0x15,  // 21: list, next byte is count*
		DICT: 			0x16,  // 22: dict, next byte is count*
		INSTANCE: 		0x17,  // 23: class instance, name of the class follows (as string, probably)
		BLUE: 			0x18,  // 24: blue object.
		CALLBACK: 		0x19,  // 25: callback
		//PICKLE: 		0x1a,  // 26: (not used, old pickle method)
		REF: 			0x1b,  // 27: shared object reference
		CHECKSUM: 		0x1c,  // 28: checksum of rest of stream
		COMPRESS: 		0x1d,  // 29: (not used)
		//UNUSED: 		0x1e,  // 30: (not used)
		TRUE: 			0x1f,  // 31: True
		FALSE: 			0x20,  // 32: False
		PICKLER: 		0x21,  // 33: standard pickle of undetermined size
		REDUCE: 		0x22,  // 34: reduce protocol
		NEWOBJ: 		0x23,  // 35: new style class object
		TUPLE0: 		0x24,  // 36: tuple, empty
		TUPLE1: 		0x25,  // 37: tuple, single element
		LIST0: 			0x26,  // 38: list, empty
		LIST1: 			0x27,  // 39: list, single element
		UNICODE0: 		0x28,  // 40: unicode string, empty
		UNICODE1: 		0x29,  // 41: unicode string, 1 character,
		DBROW: 			0x2a,  // 42: database row (quite hard, custom data format)
		STREAM: 		0x2b,  // 43: embedded marshal stream
		TUPLE2: 		0x2c,  // 44: tuple, 2 elements
		MARK: 			0x2d,  // 45: marker (for the NEWOBJ/REDUCE iterators that follow them)
		UTF8: 			0x2e,  // 46: UTF8 unicode string, buffer size count follows*,
		LONG: 			0x2f,  // 47: big int, byte count follows.,
	};
	Marshal.SHARED_FLAG = 	0x40;

	Marshal.DBTYPE = {
		EMPTY: 			0,
		NULL: 			1,
		I2: 			2,
		I4: 			3,
		R4: 			4,
		R8: 			5,
		CY: 			6,
		DATE: 			7,
		BSTR: 			8,
		IDISPATCH: 		9,
		ERROR: 			10,
		BOOL: 			11,
		VARIANT: 		12,
		IUNKNOWN: 		13,
		DECIMAL: 		14,
		UI1: 			17,
		I1: 			16,
		UI2: 			18,
		UI4: 			19,
		I8: 			20,
		UI8: 			21,
		FILETIME: 		64,
		GUID: 			72,
		BYTES: 			128,
		STR: 			129,
		WSTR: 			130,
		NUMERIC: 		131,
		UDT: 			132,
		DBDATE: 		133,
		DBTIME: 		134,
		DBTIMESTAMP: 	135,
		HCHAPTER: 		136,
		DBFILETIME: 	137,
		PROPVARIANT: 	138,
		VARNUMERIC: 	139,
		VECTOR: 		0x1000,
		ARRAY: 			0x2000,
		BYREF: 			0x4000,
		RESERVED: 		0x8000,
	};

	Marshal.stringTable = [null, "*corpid", "*locationid", "age", "Asteroid", "authentication", "ballID", "beyonce", "bloodlineID", "capacity", "categoryID", "character", "characterID", "characterName", "characterType", "charID", "chatx", "clientID", "config", "contraband", "corporationDateTime", "corporationID", "createDateTime", "customInfo", "description", "divisionID", "DoDestinyUpdate", "dogmaIM", "EVE System", "flag", "foo.SlimItem", "gangID", "Gemini", "gender", "graphicID", "groupID", "header", "idName", "invbroker", "itemID", "items", "jumps", "line", "lines", "locationID", "locationName", "macho.CallReq", "macho.CallRsp", "macho.MachoAddress", "macho.Notification", "macho.SessionChangeNotification", "modules", "name", "objectCaching", "objectCaching.CachedObject", "OnChatJoin", "OnChatLeave", "OnChatSpeak", "OnGodmaShipEffect", "OnItemChange", "OnModuleAttributeChange", "OnMultiEvent", "orbitID", "ownerID", "ownerName", "quantity", "raceID", "RowClass", "securityStatus", "Sentry Gun", "sessionchange", "singleton", "skillEffect", "squadronID", "typeID", "used", "userID", "util.CachedObject", "util.IndexRowset", "util.Moniker", "util.Row", "util.Rowset", "*multicastID", "AddBalls", "AttackHit3", "AttackHit3R", "AttackHit4R", "DoDestinyUpdates", "GetLocationsEx", "InvalidateCachedObjects", "JoinChannel", "LSC", "LaunchMissile", "LeaveChannel", "OID+", "OID-", "OnAggressionChange", "OnCharGangChange", "OnCharNoLongerInStation", "OnCharNowInStation", "OnDamageMessage", "OnDamageStateChange", "OnEffectHit", "OnGangDamageStateChange", "OnLSC", "OnSpecialFX", "OnTarget", "RemoveBalls", "SendMessage", "SetMaxSpeed", "SetSpeedFraction", "TerminalExplosion", "address", "alert", "allianceID", "allianceid", "bid", "bookmark", "bounty", "channel", "charid", "constellationid", "corpID", "corpid", "corprole", "damage", "duration", "effects.Laser", "gangid", "gangrole", "hqID", "issued", "jit", "languageID", "locationid", "machoVersion", "marketProxy", "minVolume", "orderID", "price", "range", "regionID", "regionid", "role", "rolesAtAll", "rolesAtBase", "rolesAtHQ", "rolesAtOther", "shipid", "sn", "solarSystemID", "solarsystemid", "solarsystemid2", "source", "splash", "stationID", "stationid", "target", "userType", "userid", "volEntered", "volRemaining", "weapon", "agent.missionTemplatizedContent_BasicKillMission", "agent.missionTemplatizedContent_ResearchKillMission", "agent.missionTemplatizedContent_StorylineKillMission", "agent.missionTemplatizedContent_GenericStorylineKillMission", "agent.missionTemplatizedContent_BasicCourierMission", "agent.missionTemplatizedContent_ResearchCourierMission", "agent.missionTemplatizedContent_StorylineCourierMission", "agent.missionTemplatizedContent_GenericStorylineCourierMission", "agent.missionTemplatizedContent_BasicTradeMission", "agent.missionTemplatizedContent_ResearchTradeMission", "agent.missionTemplatizedContent_StorylineTradeMission", "agent.missionTemplatizedContent_GenericStorylineTradeMission", "agent.offerTemplatizedContent_BasicExchangeOffer", "agent.offerTemplatizedContent_BasicExchangeOffer_ContrabandDemand", "agent.offerTemplatizedContent_BasicExchangeOffer_Crafting", "agent.LoyaltyPoints", "agent.ResearchPoints", "agent.Credits", "agent.Item", "agent.Entity", "agent.Objective", "agent.FetchObjective", "agent.EncounterObjective", "agent.DungeonObjective", "agent.TransportObjective", "agent.Reward", "agent.TimeBonusReward", "agent.MissionReferral", "agent.Location", "agent.StandardMissionDetails", "agent.OfferDetails", "agent.ResearchMissionDetails", "agent.StorylineMissionDetails", "#196", "#197", "#198", "#199", "#200", "#201", "#202", "#203", "#204", "#205", "#206", "#207", "#208", "#209", "#210", "#211", "#212", "#213", "#214", "#215", "#216", "#217", "#218", "#219", "#220", "#221", "#222", "#223", "#224", "#225", "#226", "#227", "#228", "#229", "#230", "#231", "#232", "#233", "#234", "#235", "#236", "#237", "#238", "#239", "#240", "#241", "#242", "#243", "#244", "#245", "#246", "#247", "#248", "#249", "#250", "#251", "#252", "#253", "#254", "#255"];

	module.exports = Marshal;