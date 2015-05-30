#!/usr/bin/env node
'use strict';

function printUsage(msg) {
    if(msg) {
        console.log('Gozy: ' + msg);
        console.log('');
    }
    console.log('Usage: gozy <command>');
    console.log('');
    console.log('<command> is one of...');
    console.log('\tinit');
}

if(process.argv.length < 3) return printUsage();

switch(process.argv[2].toLowerCase()) {
case 'init': return init(); 
default: return printUsage('unknown command: ' + process.argv[2]);
}

// application
//   controller
//   view
//   model
// index.js

function init() {
    var path = require('path'),
        fs = require('fs');

    var cwd = process.cwd();

    var APPLICATION_PATH = path.join(cwd, 'application'),
        VIEW_PATH = path.join(APPLICATION_PATH, 'view'),
        INDEX_GET_JS = path.join(VIEW_PATH, 'Index.GET.js'),
        MODEL_PATH = path.join(APPLICATION_PATH, 'model'),
        MYSQL_TABLE_JS = path.join(MODEL_PATH, 'MySQLTableName.js'),
        REDIS_KEYSPACE_JS = path.join(MODEL_PATH, 'MyRedisKeySpace.js'),
        MONGO_COLLECTION_JS = path.join(MODEL_PATH, 'MyMongoCollectionName.js'),
        INDEX_JS = path.join(cwd, 'index.js');

    // if(!fs.existsSync(APPLICATION_PATH)) {
        // fs.mkdirSync(APPLICATION_PATH);

        // fs.mkdirSync(MODEL_PATH);
        fs.writeFileSync(MYSQL_TABLE_JS, [
                "/*",
                "require('gozy').Model(this, 'MyMySQL', {",
                "    schema: {",
                "        id: { Id: true, type: 'INTEGER' },",
                "        Email: { type: 'STRING' },",
                "        Password: { type: 'BINARY' },",
                "        DateRegistered: { type: 'TIMESTAMP' },",
                "    }",
                "});",
                "*/"
        ].join('\n'));
        fs.writeFileSync(REDIS_KEYSPACE_JS, [
                "/*",
                "require('gozy').Model(this, 'MyRedis', {",
                "    type: 'STRING'",
                "});",
                "*/"
        ].join('\n'));
        fs.writeFileSync(MONGO_COLLECTION_JS, [
                "/*",
                "require('gozy').Model(this, 'MyMongoDB', {",
                "    defaults: {",
                "        UserId: null,",
                "        Mode: 0,",
                "        Tags: [],",
                "        Info: { etc: null }",
                "    }",
                "});",
                "*/"
        ].join('\n'));

        // fs.mkdirSync(VIEW_PATH);
        fs.writeFileSync(INDEX_GET_JS, [
                "require('gozy').View(this, {",
                "    'accept-url': /^\\/$/,",
                "    'accept-method': 'GET'",
                "});",
                "",
                "this.on('initialize', function () { });",
                "",
                "this.on('*/*', function (request, response) {",
                "    return response.OK().html('<html><body>Welcome to blank page!</body></html>').commit();",
                "});"
        ].join('\n'));
    // } else console.error('gozy: ' + APPLICATION_PATH + ' exists.')


    if(!fs.existsSync(INDEX_JS)) {
        fs.writeFileSync(INDEX_JS, [
                "var gozy = require('gozy');",
                "",
                "gozy.logLevel('info')",
                "    .bindModels('" + MODEL_PATH + "')",
                "    .bindViews('" + VIEW_PATH + "')",
                "//  .bindMongo('MyMongoDB', CONNECTION_URL_HERE...)",
                "//  .bindRedis('MyRedis', CONNECTION_URL_HERE...)",
                "//  .bindMySQL('MyMySQL', CONNECTION_URL_HERE...)",
                "    .listen(8080);"
        ].join('\n'));
    } else console.error('gozy: ' + INDEX_JS + ' exists.');
}