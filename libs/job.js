var cluster = require('cluster');
var nodemailer = require('nodemailer'),
	EventEmitter = require('events').EventEmitter,
	utilities = require('./utilities'),
	fs = require('fs'),
	_ = require('underscore');

exports.Job = function (obj, opt) {
	/* Called by individual mailer scripts as 'require('gozy').Job~' */
	_.extend(obj, new EventEmitter());
	obj._opt = opt;
	
	if(opt.every) {
		if(cluster.isMaster) global.gozy.info('A Job is scheduled for every ' + opt.every + 'ms');
		setInterval(function () {
			obj.emit('do');
		}, opt.every);
	}
	
	obj.emit('initialize');
};

exports.bind = function (job_path, obj) {
	utilities.requireAllJS(job_path);
};