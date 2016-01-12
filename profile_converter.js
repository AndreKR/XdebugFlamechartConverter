"use strict";

var converter = require('./converter.inc.js');
var fs = require('fs');
var path = require('path');
var jsonwriter = require('./json-writer');

var input = new Uint8Array(fs.readFileSync(process.argv[2]));

var last_progress = null;

console.log('Working...');

converter.convert(input, function(output) {

	console.log('Creating JSON...');
	console.time('took');
	jsonwriter(path.dirname(fs.realpathSync(process.argv[2], {}))+'/PHP.cpuprofile', output);
	//fs.writeFileSync(path.dirname(fs.realpathSync(process.argv[2], {}))+'/PHP.cpuprofile', JSON.stringify(output));

	console.timeEnd('took');
	console.log('done.');

}, function (progress) {
	if (progress != last_progress)
		console.log(progress + ' %');
	last_progress = progress;
}, process.argv[3]);
