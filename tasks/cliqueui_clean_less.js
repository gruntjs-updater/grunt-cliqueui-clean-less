/*
 * grunt-cliqueui-clean-less
 * https://github.com/nielse63/grunt-cliqueui-clean-less
 *
 * Copyright (c) 2015 Erik Nielsen
 * Licensed under the MIT license.
 */

'use strict';
var path = require('path');
var chalk = require('chalk');
var css = require('css');

module.exports = function(grunt) {

	var getAvailableFiles = function(filesArray) {
		return filesArray.filter(function (filepath) {
			if (!grunt.file.exists(filepath)) {
				grunt.log.warn('Source file ' + chalk.cyan(filepath) + ' not found');
				return false;
			} else {
				return true;
			}
		});
	};

	var fileContainsVariable = function(varObject, content, usingIndex) {
		content = content || grunt.file.read(varObject.file);
		usingIndex = usingIndex == undefined ? true : usingIndex;
		var substring = usingIndex ? content.substring(varObject.index + varObject.variable.length) : content;
		return substring.indexOf(varObject.variable) > -1;
	};

	var getContentArray = function(content) {
		var array = content.split("\n");
		var output = [];
		for(var i = 0; i < array.length; i++) {
			var line = array[i];
			output.push(line);
		}
		return output;
	};

	var getVariableLine = function(varObject, contentArray) {
		contentArray = contentArray || getContentArray(grunt.file.read(varObject.file));
		if(varObject.variable.indexOf(':') < 0) {
			varObject.variable += ':';
		}
		for(var i = 0; i < contentArray.length; i++) {
			var line = contentArray[i];
			if(line.indexOf(varObject.variable) > -1) {
				return i;
			}
		}
		return 0;
	};

	grunt.registerMultiTask('cliqueui_clean_less', 'Grunt plugin for cleaning and optimizing .less files', function() {
		var options = this.options({
			searchIn : 'build/less'
		});
		var searchFiles = [],
			searchDir = path.resolve(options.searchIn);
		grunt.file.recurse(searchDir, function(abspath, rootdir, subdir, filename) {
			if(path.extname(filename) == '.less') {
				searchFiles.push(abspath);
			}
		});
		var unused = [];

		grunt.log.writeln('Searching for unused variables');

		this.files.forEach(function(file) {

			var files = getAvailableFiles(file.src);
			for(var i = 0; i < files.length; i++) {
				var filepath = path.resolve(files[i]);
				if(!grunt.file.exists(filepath)) {
					grunt.warn(files[i] + ' doesn\'t exist.');
					continue;
				}

				var content = grunt.file.read(filepath);
				var vars = content.match(/(@.*?:)/g);
				if(!vars || !vars.length) {
					continue;
				}

				var contentArray = getContentArray(content);
				var varObjects = [];
				for(var n = 0; n < vars.length; n++) {
					var variable = vars[n];
					varObjects.push({
						variable : variable.replace(':', ''),
						index : content.indexOf(variable),
						file : filepath,
						line : getVariableLine({variable : variable }, contentArray)
					});
				}
				for(var n = 0; n < varObjects.length; n++) {
					var varObject = varObjects[n];
					if(!fileContainsVariable(varObject, content)) {
						unused.push(varObject);
					}
				}
			}
		});
		var output = {};
		if(unused.length && searchFiles.length) {
			for(var i = 0; i < searchFiles.length; i++) {
				var filepath = searchFiles[i];
				var content = grunt.file.read(filepath);
				for(var n = 0; n < unused.length; n++) {
					var varObject = unused[n];
					if(varObject.file == filepath) {
						continue;
					}
					if(!fileContainsVariable(varObject, content, false)) {
						if(!output[varObject.file]) {
							output[varObject.file] = [];
						}
						output[varObject.file].push(varObject);
					}
				}
			}
		}
		var keys = Object.keys(output);
		if(keys.length) {
			var outputString = '';
			for(var i = 0; i < keys.length; i++) {
				var key = keys[i];
				var value = output[key];
				var string = value.length + ' unused variable' + (value.length > 1 ? 's' : '') + ' in ' + key.replace(process.cwd(), '');
				outputString += "\n" + chalk.white.bgRed(string);
				for(var n = 0; n < value.length; n++) {
					var varObject = value[n];
					outputString += "\n" + chalk.red(varObject.variable) + ' on line ' + varObject.line;
				}
			}
			grunt.log.writeln(outputString);
		} else {
			grunt.log.ok('No unused variables found.');
		}
	});

};
