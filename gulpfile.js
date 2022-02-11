'use strict';

const gulp        = require('gulp');
const fs          = require('fs');
const pkg         = require('./package.json');
const iopackage   = require('./io-package.json');
const version     = (pkg && pkg.version) ? pkg.version : iopackage.common.version;
const uglify      = require('gulp-uglify');
const concat      = require('gulp-concat');
const sourcemaps  = require('gulp-sourcemaps');
const htmlmin     = require('gulp-htmlmin');
const del         = require('del');



gulp.task('clean', () => {
    return del([
        'widgets/**/*'
    ]);
});

gulp.task('photovoltaikChart', () => {
    return gulp.src([
        './src/js/days.js',
        './src/js/data.js'
    ])
        .pipe(sourcemaps.init())
        .pipe(concat('photovoltaikCharts.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./widgets/photovoltaikchartWidget/js'));
});


gulp.task('photovoltaikchartHTML', () => {
    return gulp.src([
        './src/photovoltaikcharts.html'
    ])
        .pipe(gulp.dest('./widgets'));
});


gulp.task('copyHighchartsjs', () => {
    return gulp.src([
        './node_modules/highcharts/highcharts.js','./node_modules/highcharts/highcharts.js.map', './node_modules/highcharts/highcharts.src.js',
		'./node_modules/highcharts/highcharts-3d.js','./node_modules/highcharts/highcharts-3d.js.map','./node_modules/highcharts/highcharts-3d.src.js',
		'./node_modules/highcharts/modules/boost.js','./node_modules/highcharts/modules/boost.js.map','./node_modules/highcharts/modules/boost.src.js',
		'./node_modules/highcharts/modules/exporting.js','./node_modules/highcharts/modules/exporting.js.map','./node_modules/highcharts/modules/exporting.src.js',
		'./node_modules/highcharts/modules/export-data.js','./node_modules/highcharts/modules/export-data.js.map','./node_modules/highcharts/modules/export-data.src.js',
		'./node_modules/highcharts/modules/offline-exporting.js','./node_modules/highcharts/modules/offline-exporting.js.map','./node_modules/highcharts/modules/offline-exporting.src.js',
		'./node_modules/highcharts/modules/full-screen.js','./node_modules/highcharts/modules/full-screen.js.map','./node_modules/highcharts/modules/full-screen.src.js',
        './node_modules/highcharts/highstock.js','./node_modules/highcharts/highstock.js.map','./node_modules/highcharts/highstock.src.js',
        './node_modules/highcharts/modules/drag-panes.js','./node_modules/highcharts/modules/drag-panes.js.map'		
		
    ],{"allowEmpty": true})
        .pipe(gulp.dest('./widgets/photovoltaikchartWidget/js'));
});

gulp.task('copyHighchartsjs2', () => {
    return gulp.src([
        '../highcharts/highcharts.js','..highcharts/highcharts.js.map', '../highcharts/highcharts.src.js',
		'../highcharts/highcharts-3d.js','../highcharts/highcharts-3d.js.map','../highcharts/highcharts-3d.src.js',
		'../highcharts/modules/boost.js','../highcharts/modules/boost.js.map','../highcharts/modules/boost.src.js',
		'../highcharts/modules/exporting.js','../highcharts/modules/exporting.js.map','../highcharts/modules/exporting.src.js',
		'../highcharts/modules/export-data.js','../highcharts/modules/export-data.js.map','../highcharts/modules/export-data.src.js',
		'../highcharts/modules/offline-exporting.js','../highcharts/modules/offline-exporting.js.map','../highcharts/modules/offline-exporting.src.js',
		'../highcharts/modules/full-screen.js','../highcharts/modules/full-screen.js.map','../highcharts/modules/full-screen.src.js',
        '../highcharts/highstock.js','../highcharts/highstock.js.map','../highcharts/highstock.src.js',
        '../highcharts/modules/drag-panes.js','../highcharts/modules/drag-panes.js.map'		
		
    ],{"allowEmpty": true})
        .pipe(gulp.dest('./widgets/photovoltaikchartWidget/js'));
});


gulp.task('copyCSS', () => {
    return gulp.src([
        './src//css//styles.css'
    ], {"allowEmpty": true})
        .pipe(gulp.dest('./widgets/photovoltaikchartWidget/css'));
});

gulp.task('copyImg', () => {
    return gulp.src([
        './src/img/favicon.png','./src/img/photovoltaikchartsprev.png','./src/img/photovoltaikchartsprev2.png','./src/img/photovoltaikchartsprev3.png','./src/img/photovoltaikchartsprev4.png','./src/img/photovoltaikchartsprev5.png'
    ])
        .pipe(gulp.dest('./widgets/photovoltaikchartWidget/img'));
});




gulp.task('default', gulp.series('photovoltaikChart', 'copyHighchartsjs', 'copyHighchartsjs2','photovoltaikchartHTML', 'copyCSS', 'copyImg'));
