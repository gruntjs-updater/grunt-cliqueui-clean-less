/*
 * grunt-cliqueui-clean-less
 * https://github.com/nielse63/grunt-cliqueui-clean-less
 *
 * Copyright (c) 2015 Erik Nielsen
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

	grunt.initConfig({
		jshint: {
			all: [
			'Gruntfile.js',
			'tasks/*.js',
			'<%= nodeunit.tests %>'
			],
			options: {
				jshintrc: '.jshintrc'
			}
		},

		clean: {
			tests: ['tmp']
		},

		cliqueui_clean_less: {
			options : {
				searchIn : 'tmp',
				log : 'tmp/unused-vars.txt',
				logRepeating : 'tmp/repeating-vars.json',
				displayOutput : false
			},
			default : {
				files: [{
					expand: true,
					cwd: 'tmp',
					src: ['**/*.less', '!mixins/*.less'],
				}]
			}
		},

		nodeunit: {
			tests: ['test/*_test.js']
		}

	});

	grunt.loadTasks('tasks');

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-nodeunit');

	grunt.registerTask('test', ['clean', 'cliqueui_clean_less', 'nodeunit']);

	grunt.registerTask('default', ['jshint', 'test']);

};
