if (typeof window === 'undefined')
{
	var StringDecoder = require('string_decoder').StringDecoder;
	var TextDecoder = function () {
		return {
			decode: function (data) {
				return new StringDecoder('utf8').write(new Buffer(data));
			}
		};
	};
	var JSZip = require('./jszip.min.js');
}


(function(exports){

	exports.convert = function(buffer, finish_callback, progress_callback, depth_limit) {

		// Keeping the large data in one place, so it's easier to make sure nothing is leaked
		var data;
		var stack;

		var process_file = function()
		{
			var LF = 10;

			// If the chunk size is too small, performance suffers. Having one chunk per line (to eliminate the .split())
			// yields unbearable performance. It seems that the ArrayBuffer operations are not as optimized as the String
			// operations yet.
			var chunk_size = 1000000;

			var skip_summary;
			var chunk;
			var chunk_string;
			var cleaned_chunk_string;
			var lines;
			var lf_pos;
			var chunk_no;
			var offset;
			var deleted;
			var current_block;
			var reading;

			var skip_first_block;

			offset = 0;
			chunk_no = 0;
			deleted = 0;
			reading = false;
			skip_summary = 0;
			current_block = [];

			stack = [];
			skip_first_block = true;

			(function cont() {

				chunk_no++;

				// Search for first line break of next chunk
				lf_pos = data.indexOf(LF, chunk_no * chunk_size - deleted) + deleted;

				if (lf_pos == -1 + deleted)
					lf_pos = data.length + deleted;

				chunk = data.slice(offset - deleted, lf_pos - deleted);
				offset = lf_pos + 1;

				//noinspection JSUnresolvedFunction
				chunk_string = new TextDecoder('utf-8').decode(chunk);

				cleaned_chunk_string = chunk_string.split('\r').join(''); // http://jsperf.com/replace-all-vs-split-join
				lines = cleaned_chunk_string.split('\n');

				lines.forEach(function (line) {

					if (reading)
					{
						if (line != '' && !skip_summary)
						{
							current_block.push(line);
							if (line == 'fn={main}')
								skip_summary = 3;
						}
						else
						{
							if (skip_summary)
								skip_summary--;
							else
							{
								if (!skip_first_block)
									process_block(current_block);
								skip_first_block = false;

								current_block = [];
							}
						}
					}
					else
					{
						if (line.substr(0, 7) == 'events:')
							reading = true;
					}

				});

				if (chunk_no % 100 == 0 && data.length > offset - deleted)
				{
					data = data.slice(offset - deleted);
					deleted += offset - deleted;
				}

				progress_callback(Math.round(100 / (data.length + deleted) * offset));

				if (lf_pos < (data.length + deleted))
					setTimeout(cont, 0);
				else
				{
					chunk = undefined;
					chunk_string = undefined;
					cleaned_chunk_string = undefined;
					lines = undefined;
					data = undefined;
					process_stack();
				}
			})();
		};

		var process_block  = function(v)
		{
			var entry;
			var child;
			var i;

			if (v.length)
			{
				entry = {};
				entry.fl = v[0].substr(3);
				entry.fn = v[1].substr(3);

				entry.self_us = v[2].split(' ')[1] / 10;

				if (v.length > 3)
				{
					entry.children = [];
					for (i = (v.length-3) / 4 ; i > 0 ; i--)
					{
						child = stack.pop();

						if (child.fl != v[3 + (i-1)*4].substr(4) || child.fn != v[4 + (i-1)*4].substr(4))
							console.log('Mismatch!');

						child.cum_us = v[6 + (i-1)*4].split(' ')[1] / 10;

						child.called_from_file = entry.fl;
						child.called_from_line = parseInt(v[6 + (i-1)*4].split(' ')[0]);

						entry.children.push(child);
					}
					entry.children.reverse();
				}

				stack.push(entry);
			}
		};

		var process_stack = function() {
			var output;
			var current_id;
			var current_timestamp;
			var depth;
			var head_root_children;

			output = {
				head: {},
				samples: [],
				timestamps: []
			};


			current_id = 0;
			current_timestamp = 0;
			depth = 0;
			head_root_children = (function write(partial_tree_parent) {
				var head_tree = [];

				var output_inhibited = (depth_limit && depth > depth_limit);

				var partial_tree = partial_tree_parent.children;

				partial_tree.forEach(function (v) {
					var head_entry;
					var timestamp_before_children;
					var display_time;
					var this_id;
					var children_time;
					var timestamp_shifted_by;

					current_id++;
					this_id = current_id;

					if (!output_inhibited)
					{
						output.timestamps.push(current_timestamp);
						output.samples.push(this_id);
					}

					head_entry = {
						"functionName": v.fn,
						"scriptId": "0",
						"url": v.called_from_file,
						"lineNumber": v.called_from_line,
						"columnNumber": 0,
						"hitCount": 1,
						"callUID": this_id,
						"children": [],
						"positionTicks": [],
						"deoptReason": "",
						"id": this_id
					};

					timestamp_before_children = current_timestamp;
					timestamp_shifted_by = 0;
					if ('children' in v)
					{
						children_time = 0;
						v.children.forEach(function (v) {
							children_time += v.cum_us;
						});

						// Shift the childrens' timestamps by half the self time of this function to align them in the middle
						timestamp_shifted_by = Math.max((v.cum_us - children_time) / 2, 0);
						current_timestamp += timestamp_shifted_by;
						timestamp_before_children += timestamp_shifted_by;

						depth++;
						head_entry.children = write(v);
						depth--;
						v.children = undefined;
					}

					// add a sample about the return to this function
					if (!output_inhibited)
					{
						output.timestamps.push(current_timestamp);
						output.samples.push(this_id);
					}

					display_time = v.cum_us;
					display_time -= (current_timestamp - timestamp_before_children); // self time = cumulated time - childrens' time
					display_time -= timestamp_shifted_by;
					if (!output_inhibited)
						display_time = Math.max(display_time, 0.1); // make nothing shorter than 100 ns
					current_timestamp += display_time;

					// add a sample about the end of this function
					if (!output_inhibited)
					{
						output.timestamps.push(current_timestamp);
						output.samples.push(this_id);
					}

					if (!output_inhibited)
						head_tree.push(head_entry);
				});

				partial_tree_parent.children = undefined;

				return head_tree;
			})(stack[0]);

			output.head = {
				"functionName": "(root)",
				"scriptId": "0",
				"url": "",
				"lineNumber": 0,
				"columnNumber": 0,
				"hitCount": 0,
				"callUID": 0,
				children: head_root_children
			};

			stack = undefined;
			finish_callback(output);
		};

		var filename;

		data = new Uint8Array(buffer);

		//noinspection JSUnresolvedFunction
		if (new TextDecoder('utf8').decode(data.slice(0,2)) == 'PK')
		{
			//noinspection JSUnresolvedFunction
			var zip = new JSZip();
			zip.load(data);

			//noinspection LoopStatementThatDoesntLoopJS
			for (filename in zip.files) break;

			data = zip.file(filename).asUint8Array();
		}

		process_file();
	};


})(typeof exports === 'undefined'? this['converter']={}: exports);
