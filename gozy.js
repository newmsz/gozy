"use strict";

var cluster = require('cluster'),
	http = require('http'),
	_ = require('underscore'),
	logger = require('./libs/logger'),
	model = require('./libs/model'),
	view = require('./libs/view'),
	mailer = require('./libs/mailer'),
	job = require('./libs/job'),
	renderer = require('./libs/renderer'),
	HttpRequest = require('./libs/HttpRequest'),
	HttpResponse = require('./libs/HttpResponse');

function Gozy() {
	this._logger = logger.defaultLogger();
	this._websocket = false;
	this._jobpath = null;
	this._workers = require('os').cpus().length; 
}

Gozy.prototype.logLevel = function (level) {
	this._logger = logger.defaultLogger(level);
	return this;
};

Gozy.prototype.bindModels = function (path) {
    if(!path) throw 'ModelPath is not defined';
	model.bind(path, this);
	return this;
};

Gozy.prototype.bindViews = function (path) {
    if(!path) throw 'ViewPath is not defined';
	view.bind(path, this);
	return this;
};

Gozy.prototype.bindJobs = function (path) {
    if(!path) throw 'JobPath is not defined';
	this._jobpath = path;
	//job.bind(path, this);
	return this;
};

Gozy.prototype.bindResources = function (path, bind_url, debug) {
	renderer.bindResources(path, bind_url, debug);
	return this;
};

Gozy.prototype.setNumberOfWorkers = function (num) {
	this._workers = num;
	return this;
};


Gozy.prototype.listen = function (port) {
	prep.call(this, _.bind(function (err) {
		if(err) global.gozy.error(err);
		if (cluster.isMaster) {
			for (var i = 0; i < this._workers; i++)
				cluster.fork();
			
			cluster.on('exit', function(worker, code, signal) {
				global.gozy.warn('worker ' + worker.process.pid + ' died (' + (signal || code) + '). restarting...');
				cluster.fork();
			});
		} else {
			var server = http.createServer(this.onRequest);
			server.maxConnections = 200;
			server.listen(port);
			global.gozy.info('Gozy(pid: ' + process.pid + ') is opened on port ' + port);
		}
		
		
	}, this));
};

Gozy.prototype.onRequest = function (request, response) {
	new (HttpRequest.HttpRequest)(request, function (http_req) {
		new (HttpResponse.HttpResponse)(response, function (http_res) {
			if(renderer.interceptResourceRequest(http_req, http_res)) return;
			
			http_res.setLocale(http_req.locale());
			
			view.control(http_req, http_res);	
		});			
	});	
};

Gozy.prototype.enableWebSocket = function () {
	this._websocket = true;
	return this;
};

Gozy.prototype.Model = model.Model;
Gozy.prototype.View = view.View;
Gozy.prototype.Mailer = mailer.Mailer;
Gozy.prototype.Job = job.Job;

Gozy.prototype.bindMongo = model.bindMongo;
Gozy.prototype.bindRedis = model.bindRedis;
Gozy.prototype.bindMySQL = model.bindMySQL;

Gozy.prototype.bindMailer = mailer.bindMailer;

function prep(cb) {
	var self = this;
	
	model.connectAll(function (err, res) {
		if(err) return cb(err);
		
		mailer.initializeAll();
		//view.prepareView();
		
		if(self._jobpath) job.bind(self._jobpath, self); 
		return cb(null);
	});
}

module.exports = new Gozy();