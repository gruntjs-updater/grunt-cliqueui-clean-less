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
var less = require('less');

// Internal modules
// var findRepeating = require('./lib/repitious-vars');

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
		return (substring.indexOf(varObject.variable) > -1 ||
				substring.indexOf('@{' + varObject.variable.replace('@', '') + '}') > -1 ||
				substring.indexOf('// ' + varObject.variable) > -1);
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

	var arrayUnique = function(a) {
		return a.reduce(function(p, c) {
			if (p.indexOf(c) < 0) p.push(c);
			return p;
		}, []);
	};

	grunt.registerMultiTask('cliqueui_clean_less', 'Grunt plugin for cleaning and optimizing .less files', function() {
		var options = this.options({
			searchIn : '',
			log : false,
			logRepeating : false,
			displayOutput : true
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

		var files, variables = [];

		this.files.forEach(function(file) {

			files = getAvailableFiles(file.src);
			for(var i = 0; i < files.length; i++) {
				var file = files[i];
				if(!grunt.file.exists(file)) {
					grunt.warn(file + ' doesn\'t exist.');
					continue;
				}
				var filepath = path.resolve(file);

				var content = grunt.file.read(file);
				// var vars = content.match(/(@\S[^";,) ]*?:)/g);
				var vars = content.match(/@(.*);/g);
				if(!vars || !vars.length) {
					continue;
				}
				
				var contentArray = getContentArray(content);
				var varObjects = [];

				for(var n = 0; n < vars.length; n++) {

					// Find repeating variables
					var variable = vars[n];
					if(variable.indexOf(':') < 0) {
						continue;
					}
					var variableArray = variable.split(':');
					var name = variableArray.shift();
					var value = variableArray.join(':').split(';')[0].trim();
					if(value[0] != '@') {
						var foundRepeating = false;
						for(var j = 0; j < variables.length; j++) {
							var thisVariable = variables[j];
							if(thisVariable.value == value) {
								thisVariable.locations.push({
									name : name,
									file : file,
									line : getVariableLine({variable : name }, contentArray)
								});
								foundRepeating = true
								break;
							}
						}
						if(!foundRepeating) {
							variables.push({
								value : value,
								locations : [{
									name : name,
									file : file,
									line : getVariableLine({variable : name }, contentArray)
								}]
							});
						}
					}

					// Look for unused variablesvar variable = vars[n];
					varObjects.push({
						variable : name,
						index : content.indexOf(variable),
						file : filepath,
						line : getVariableLine({variable : name }, contentArray)
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
		var repeatingOutput = [];
		for(var i = 0; i < variables.length; i++) {
			var variable = variables[i];
			if(variable.locations.length > 1) {
				repeatingOutput.push(variable);
			}
		}
		if(options.logRepeating) {
			grunt.log.ok('Saving output to log: ' + options.logRepeating);
			grunt.file.write(options.logRepeating, JSON.stringify(repeatingOutput, null, '\t'));
		}

		var output = {};
		var passed = [];
		if(unused.length && searchFiles.length) {
			for(var i = 0; i < searchFiles.length; i++) {
				var filepath = searchFiles[i];
				var content = grunt.file.read(filepath);
				for(var n = 0; n < unused.length; n++) {
					var varObject = unused[n];
					if(varObject.file == filepath || passed.indexOf(varObject.variable) > -1) {
						continue;
					}
					if(!fileContainsVariable(varObject, content, false)) {
						if(!output[varObject.file]) {
							output[varObject.file] = [];
						}
						output[varObject.file].push(varObject);
					} else {
						passed.push(varObject.variable);
					}
				}
			}
		}

		var keys = Object.keys(output);
		if(keys.length) {
			var outputString = '';
			var logString = '';
			for(var i = 0; i < keys.length; i++) {
				var key = keys[i];
				var value = arrayUnique(output[key]);
				var newValues = [];
				for(var n = 0; n < value.length; n++) {
					var varObject = value[n];
					if(passed.indexOf(varObject.variable) < 0) {
						newValues.push(varObject);
					}
				}
				value = newValues;
				var string = value.length + ' unused variable' + (value.length > 1 ? 's' : '') + ' in ' + key.replace(process.cwd(), '');
				outputString += "\n" + chalk.white.bgRed(string);
				logString += "\n" + string + "\n// ========================================================================";
				for(var n = 0; n < value.length; n++) {
					var varObject = value[n];
					outputString += "\n" + chalk.red(varObject.variable) + ' on line ' + varObject.line;
					logString += "\n\t" + varObject.variable + ' on line ' + varObject.line;
				}
				logString += "\n";
			}
			if(options.displayOutput) {
				grunt.log.writeln(outputString);
			} else if(options.log) {
				grunt.log.ok('Saving output to log: ' + options.log);
				grunt.file.write(path.resolve(options.log), logString);
			}
		} else {
			grunt.log.ok('No unused variables found.');
		}
	});

};
