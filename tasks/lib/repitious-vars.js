
'use strict';
var path = require('path');
var chalk = require('chalk');
var css = require('css');
var less = require('less');

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
			log : false,
			displayOutput : true
		});
		// var searchFiles = [],
		// 	searchDir = path.resolve(options.searchIn);
		// grunt.file.recurse(searchDir, function(abspath, rootdir, subdir, filename) {
		// 	if(path.extname(filename) == '.less') {
		// 		searchFiles.push(abspath);
		// 	}
		// });
		// var unused = [];

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

				for(var n = 0; n < vars.length; n++) {
					var variable = vars[n];
					if(variable.indexOf(':') < 0) {
						continue;
					}
					var variableArray = variable.split(':');
					var name = variableArray.shift();
					var value = variableArray.join(':').split(';')[0].trim();
					variables.push({
						name : name,
						value : value
					});
				}
			}
		});
		console.log(variables);
	});

};
