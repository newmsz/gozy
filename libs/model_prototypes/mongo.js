"use strict";

var cluster = require('cluster');
var _ = require('underscore'),
	mongo = require('mongodb'),
	ObjectID = mongo.ObjectID;

var __primary_key__ = '_id';

function Mongo(name, connection_url) {
	this.name = name;
	this.connection_url = connection_url;
}

Mongo.prototype.connect = function (cb) {	
	if(cluster.isMaster) global.gozy.info('Connecting to MongoDB "' + this.name + '"');
		
	mongo.MongoClient.connect(this.connection_url, _.bind(function (err, db) {
		if(err) return cb(err);
		
		if(cluster.isMaster) global.gozy.info('Successfully connected to ' + this.name);
		this.client = db;
		cb && cb();
	}, this));
};

Mongo.prototype.attachModel = function (model) {
	var collection_name = model._filename,
		defaults = model._opt && model._opt.defaults;
		
	model[collection_name] = this.generate_model(defaults);
	model[collection_name].prototype.id = this.generate_key_function();
	model[collection_name].prototype.save = this.generate_save(collection_name);
	model[collection_name].prototype.update = this.generate_update(collection_name);
	model[collection_name].prototype.del = this.generate_del(collection_name);
	model.findById = this.generate_findById(collection_name, model[collection_name]);
	model.find = this.generate_find(collection_name, model[collection_name]);
	model.remove = this.generate_remove(collection_name, model[collection_name]);
	model.ensureIndex = this.generate_ensureIndex(collection_name);
	model.mapReduce = this.generate_mapReduce(collection_name);
	model.ObjectID = ObjectID;
	
	model.emit('initialize', model[collection_name]);
};

Mongo.prototype.generate_model = function (defaults) {
	return function (val) {
		_.extend(this, defaults, val);
	};
};

Mongo.prototype.generate_key_function = function () {
	return function (val) {
		if(val !== undefined) {
			if(typeof val === 'string')
				this[__primary_key__] = new ObjectID(val);
			else
				this[__primary_key__] = val;
		}
		else return this[__primary_key__];
	};
};

Mongo.prototype.generate_update = function (name) {
	var m = this;
	return function () {
		var collection = m.client.collection(name);
		var _arguments = [], criteria = {};
		criteria[__primary_key__] = this[__primary_key__];
		_arguments.push(criteria);
		for(var i=0; i<arguments.length; i++)
			_arguments.push(arguments[i]);
		collection.update.apply(collection, _arguments);
	};
};

Mongo.prototype.generate_del = function (name) {
	var m = this;
	return function () {
		var collection = m.client.collection(name);
		var _arguments = [], criteria = {};
		criteria[__primary_key__] = this[__primary_key__];
		_arguments.push(criteria);
		for(var i=0; i<arguments.length; i++)
			_arguments.push(arguments[i]);
		collection.remove.apply(collection, _arguments);
	};
};

Mongo.prototype.generate_save = function (name) {
	var m = this;
	return function (cb, safe) {
		var collection = m.client.collection(name),
			self = this;
		
		if(!this[__primary_key__]) {
			collection.insert(this, {safe: safe === undefined ? true : false}, function (err, res) {
				if(err) {
					delete self[__primary_key__];
					return cb(err);
				}
				if(res.length > 0) return cb && cb(err, res[0]);
				return cb && cb(err, null);
			});
		} else {
			var criteria = { };
			criteria[__primary_key__] = this[__primary_key__];
			
			collection.update(criteria, this, {safe: safe === undefined ? true : safe}, function(err, cnt) {
				if (err) return cb && cb(err);
				if (cnt == 0) return cb(new Error('Updating unexisting document (id: ' + self[__primary_key__] + ')'));
				return cb && cb(err, self);
			});
		}	
	};
};

Mongo.prototype.generate_findById = function (name, model) {
	var m = this;
	return function (Id, cb) {
		var q = {};
		if(typeof Id === 'string')
			q[__primary_key__] =  new ObjectID(Id);
		else 
			q[__primary_key__] =  Id;
		
		m.client.collection(name).find(q).toArray(function (err, docs) {
			if(err) return cb(err);
			if(docs.length === 0) return cb(null, null);
			return cb(null, new model(docs[0]));
		});
	};
};

Mongo.prototype.generate_ensureIndex = function (name) {
	var m = this;
	
	return function (idx, opt, cb) {
		var collection = m.client.collection(name);
		if(!cb) cb = function (err) { if(err) global.gozy.error(err); };
		return collection.ensureIndex.call(collection, idx, opt, cb);
	};
};

Mongo.prototype.generate_mapReduce = function (name) {
	var m = this;
	
	return function () {
		var collection = m.client.collection(name);
		return collection.mapReduce.apply(collection, arguments);
	};	
};

function CursorWrapper(cursor, model) {
	this._cursor = cursor;
	this._model = model;
}

CursorWrapper.prototype.toArray = function (cb) {
	this._cursor.toArray(_.bind(function (err, items) {
		if(err) return cb(err);
		for(var i=0; i<items.length ;i++)
			items[i] = new (this._model)(items[i]);
		return cb(err, items);
	}, this));
};

['limit', 'skip', 'sort', 'explain'].forEach(function (method) {
	CursorWrapper.prototype[method] = function () {
		this._cursor[method].apply(this._cursor, arguments);
		return this;
	};
});

Mongo.prototype.generate_find = function (name, model) {
	var m = this;
	return function (cond, cb) {
		m.client.collection(name).find(cond, function (err, cursor) {
			if(err) return cb(err);
			return cb(null, new CursorWrapper(cursor, model));
		});
	};
};

Mongo.prototype.generate_remove = function (name, model) {
	var m = this;
	return function (cond, cb) {
		m.client.collection(name).remove(cond, cb);
	};
};


module.exports = Mongo;
