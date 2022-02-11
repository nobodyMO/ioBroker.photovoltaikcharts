# ioBroker.photovoltaikcharts

Draw charts especially for photovoltaic production and consumption data with [highcharts](http://www.highcharts.com/)

To use the charts one of the history adapters is required: history, sql or InfluxDB.
The two Time Series charts with Navigator currently only work with SQL adapter and MariaDB/mysql. Here I use special SQL queries to significantly reduce the amount of data already in the DBMS. Otherwise, a navigator with a time series with values every 10 seconds and more than one year would not be possible.

I developed this adapter to be able to display the data of my photovoltaic system in an appealing way. 
The generation and consumption data are processed by the statistics adapter and a time series is created using the values in the save area with the SQL adapter. 
The charts each use the last value of the set time unit to obtain the final value saved by the statistical adapter. This is necessary because the history adapters sometimes create additional entries in the time series when they are stopped and started, but these still contain the value of the previous period.

In addition, the ID of the corresponding value from the temp range can be specified. In this case, the current value is additionally displayed and continuously updated. 

In addition to the charts for values from the statistical adapter, there are two types of time series that can be used generically.

All charts update automatically.

The widgets contain many parameters for setting step, stacking, y-axis, etc. The parameters are described at https://api.highcharts.com/. 


## Chart types
### Chart for anual values
![Example](img/screen1.jpg)

### Chart for monthly values
![Example](img/screen2.jpg)

### Chart for time series of statistic adapter
![Example](img/screen3.jpg)

### Chart for time series of normal history data with navigator
![Example](img/screen4.jpg)

### Chart for time series of normal history data without navigator
![Example](img/screen5.jpg)


## How to use
- install "vis"-adapter and create one instance if not installed.
- install this adapter

After this, the new widgets should be offered in the VIS editor. All settings are made directly in the widget.

## Why highcharts
For iobroker, there are already several chart solutions that generate configurable charts with the history data. 
Unfortunately, there is no special support for time series on values of the statistical adapter and display of the current value. 

Of course, the existing chart solutions can be extended for this purpose, but the generic charts are still rather suboptimal for my special use case. Especially with photovoltaic systems, one does not only want to look at the monthly or annual values of the current year, but to compare them directly with the corresponding values of the previous years. However, this is almost impossible with the generic adapters. 
At the latest when it comes to using the charts in the Cordova app, I don't really like any of the existing solutions. Flot does use the socket io connection from vis, but this becomes slow with more than one chart. The widget from the echarts adapter would have to be completely rewritten so that it also works with the app via a reverse proxy.

You could also implement the diagrams with a completely free chart library, but from a purely visual point of view, highcharts is in a different league. In addition, it should also be possible to directly access data from far back in the VIS view. Highstock offers a very smart solution for this with the integrated Navigator.


## Restrictions
The widgets still have development status. 

The time series support zoom and pinch (with shift key), mouse wheel as well as multi-touch gestures. Extensions exist for this, which should also allow this with dynamic loading of data. This is still experimental. Especially with several quick gestures one after the other, the reloading does not follow and can lead to display errors.

The input fields do not all have format checks. Numbers should be entered with a dot (1.2). Some fields require input in JSON format, e.g. to pass categories or value lists. Again, there is no format check in the editor.

<!--
	Placeholder for the next version (at the beginning of the line):
	### __WORK IN PROGRESS__
-->
## Changelog
### 1.10.2 (2022-02-10)
* (nobodyMO) inital version


## iobroker app compatibility 
The widgets works perfect in my self compiled version of the iobroker cordova app for android. The widgets only use the socket io connection from VIS.  Only the export functions of highcharts do not work under Cordova.

However, due to licensing restrictions on the commercial use of highcharts, it is unlikely that this adapter will be included in the official Android app. 

## License
This adapter based on highcharts and highstock. These are commercial products, which requere to obain a appropriate licence. Please check https://www.highcharts.com/license for licensing.
Non commercial use of highcharts and highstock is currently free under a Creative Commons (CC) Attribution-Non-Commercial license.

During the installation of this adapter the npm package highcharts will automaticaly downloaded and the required files are copied to the widget directory.

Copyright (c) 2022 nobodyMO