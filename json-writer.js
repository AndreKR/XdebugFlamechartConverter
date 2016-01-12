"use strict";
var fs = require('fs');

module.exports = function (file, object) {
	var fd = fs.openSync(file, 'w');
	var buffer = '';

	var maybe_flush = function () {
		if (buffer.length > 100000000) // maximum string length is about 268 MB, so 100 MB is a rather arbitrary chunk size
		{
			fs.writeSync(fd, buffer);
			buffer = '';
		}
	};

	(function write(thing) {
		var i, length, keys;

		if (typeof thing == 'object')
		{
			if (is_array(thing))
			{
				length = thing.length;
				buffer += '[';
				for (i = 0; i < length; i++)
				{
					if (i != 0)
						buffer += ',';
					write(thing[i]);
				}
				buffer += ']';
				maybe_flush();
			}
			else if (thing)
			{
				keys = Object.keys(thing);
				length = keys.length;

				buffer += '{';
				for (i = 0; i < length; i++)
				{
					if (i != 0)
						buffer += ',' + str(keys[i])+':';
					else
						buffer += str(keys[i])+':';
					write(thing[keys[i]]);
				}
				buffer += '}';
				maybe_flush();
			}
			else
			{
				buffer += 'null';
				maybe_flush();
			}
		}
		else
		{
			buffer += str(thing);
			maybe_flush();
		}
	})(object);

	if (buffer.length > 0)
		fs.writeSync(fd, buffer);

	fs.closeSync(fd);

};

function is_array(obj)
{
	return (Object.prototype.toString.apply(obj) === '[object Array]');
}

function str(value) {
	switch (typeof value)
	{
		case 'string':
			return quote(value);

		case 'number':
			return isFinite(value) ? String(value) : 'null';

		case 'boolean':
			return String(value);
	}
}

var	meta = {
	'\b': '\\b',
	'\t': '\\t',
	'\n': '\\n',
	'\f': '\\f',
	'\r': '\\r',
	'"': '\\"',
	'\\': '\\\\'
};

var rx_escapable = /[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

function quote(string)
{
	rx_escapable.lastIndex = 0;
	return rx_escapable.test(string)
	? '"' + string.replace(rx_escapable, function (a)
	{
		var c = meta[a];
		return typeof c === 'string'
		? c
		: '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
	}) + '"'
	: '"' + string + '"';
}

