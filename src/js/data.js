'use strict';

function readOneChart(seriesData,id,instance,currentId,multiplicator, index, callback,mode,startdate,seriesCount) {

    var option = {};
	var eventDate;
	var currentYear=new Date ().getFullYear();
	var startYear=new Date (startdate).getFullYear();
	
	var numberOfYears=currentYear - startYear + 1;
	option.start=startdate;
	option.end=(new Date(currentYear, 11, 31,23,59)).getTime();
    option.instance  = instance;
	option.aggregate='none';
	option.count=1000;
	option.timeout=12000;
    console.log(new Date(option.start) + ' - ' + new Date(option.end));
	vis.getHistory(id, option, function (err, res) {
		console.log('got History data');
        if (err && Object.keys(err).length > 0) console.error('Error Object: ' + JSON.stringify(err));


        if (!err && res) {
            for (var i = 0; i < res.length; i++) {
				eventDate=new Date (res[i].ts);
				if (mode===1){
					seriesData[(eventDate.getFullYear()-startYear)*(seriesCount) + index].data[eventDate.getMonth()]=(res[i].val || 0) * multiplicator;
				} else {
					seriesData[index].data[numberOfYears-1 - currentYear + eventDate.getFullYear()]=(res[i].val || 0) *multiplicator;
					
				}
			} 	
            // free memory
            res = null;
        }

        if (currentId) {
			if (mode===1){
				seriesData[(currentYear-startYear)*(seriesCount) + index].data[(new Date ()).getMonth()]=(vis.states[currentId + '.val'] || 0) * multiplicator;
			} else {
				seriesData[index].data[numberOfYears-1]=(vis.states[currentId + '.val']|| 0) * multiplicator;
			}		
		};
  	    if (callback) callback();
    });
}


function _readData(seriesData,oidList,callback, j,mode,startdate) {
    j = j || 0;
    if (j >= oidList.length) {
        return callback && callback();
    } else {
		if (oidList[j].historyOID && oidList[j].instance) {
			readOneChart(seriesData,oidList[j].historyOID,oidList[j].instance,oidList[j].currentOID,oidList[j].multiplicator,j, function () {
				setTimeout(function () {
					_readData(seriesData,oidList,callback, j + 1,mode,startdate);
				}, 10);
			},mode,startdate,oidList.length);
		}else{
            setTimeout(function () {
                _readData(seriesData,oidList,callback, j + 1,mode,startdate);
            }, 10);			
		}
    }
}


function loadSelectorData(data,id,instance,currentId,multiplicator,mode,duration,callback) {
	var startDate=new Date ();
	startDate.setMonth (-1 * duration);
	var start=startDate.getTime();
    if (id && instance){
		vis.conn.sendTo(instance, 'query', 
			"select id from iobroker.datapoints where name ='" + id + "'"
		, function (result) {
			if (result.error) {
				console.error(result.error);			
				if (callback) callback();
			} else {
				// show result
				console.log('Rows: ' + JSON.stringify(result.result));
				if (result.result[0] && result.result[0].id){
					var dbid=result.result[0].id;
					vis.conn.sendTo(instance, 'query', 
						"select COUNT(ts) AS rowcount from iobroker.ts_number where id=" + dbid + " and ts>" + start
					, function (result) {
						if (result.error) {
							console.error(result.error);			
							if (callback) callback();
						} else {
							// show result
							console.log('Rows: ' + JSON.stringify(result.result));
							if (result.result[0] && result.result[0].rowcount){
								var rowcount=result.result[0].rowcount;
								if (rowcount<1000) {
									var sql = "SELECT ts,val FROM iobroker.ts_number where id=" + dbid;
								} else if (rowcount<10000) {
									var sql = "SELECT * FROM ( SELECT @row := @row +1 AS rownum, ts,val FROM (SELECT @row :=0) r, iobroker.ts_number where id=" + dbid +" and ts>" + start +") ranked WHERE rownum % (" + rowcount + " DIV 1000) = 1";																
								} else if (rowcount<50000) {
									var sql = "SELECT * FROM ( SELECT @row := @row +1 AS rownum, ts,val FROM (SELECT @row :=0) r, iobroker.ts_number where id=" + dbid +" and ts>" + start +") ranked WHERE rownum % (" + rowcount + " DIV 500) = 1";																
								} else {
									var sql = "SELECT * FROM ( SELECT @row := @row +1 AS rownum, ts,val FROM (SELECT @row :=0) r, iobroker.ts_number where id=" + dbid +" and ts>" + start +") ranked WHERE rownum % (" + rowcount + " DIV 300) = 1";																
								}
								vis.conn.sendTo(instance, 'query', sql
								, function (result) {
									if (result.error) {
										console.error(result.error);			
										if (callback) callback();
									} else {
										// show result
										for (var i = 0; i < result.result.length; i++) {
											eventDate=normalizeDate(new Date (result.result[i].ts),mode);
											console.log(eventDate + ':' + result.result[i].val);
											data.push ([eventDate.getTime(),(result.result[i].val || 0) * multiplicator]);
										} 	
										// free memory
										res = null;		
										if (currentId) {
											data.push ([normalizeDate(new Date (),mode).getTime(),(vis.states[currentId + '.val'] || 0) * multiplicator]);
										};
										if (callback) callback();
									}								
								});					
							} else {
								if (callback) callback();
							}	
						}	
					});									
				} else {
					if (callback) callback();
				}				
			}
		});
	} else {
		if (callback) callback();
	}
}


function readOneLineRange(chart,id,instance,currentId,multiplicator, index,mode,start,end,virtualStart,virtualEnd,callback) {

    var option = {};
	var eventDate;
	var lastEventDate=new Date (0);	
	var currentYear=new Date ().getFullYear();
	var data = [];
	if (virtualStart<start) data.push([virtualStart,0]);
	option.start=start;
	option.end=end;
    option.instance  = instance;
	option.aggregate='minmax';
	//option.count=2000;
	option.timeout=12000;
    console.log(JSON.stringify(option));
    console.log('Load Range for ' + id +' '+ new Date(option.start) + ' - ' + new Date(option.end));
	vis.getHistory(id, option, function (err, res) {
        if (err && Object.keys(err).length > 0) console.error('Error Object: ' + JSON.stringify(err));
        if (!err && res) {
			console.log('got History data. Count:' + res.length);		
            for (var i = 0; i < res.length; i++) {
				eventDate=normalizeDate(new Date (res[i].ts),mode);
				//console.log(id +' '+ new Date (res[i].ts)+ ' n ' + eventDate + ':' + res[i].val);
				if (res[i].val!=null){
					if (lastEventDate.getTime()==eventDate.getTime()) {
						//console.log('replace ' + new Date (data[data.length-1][0]) + ':' + res[i].val);					
						data[data.length-1][1]=(res[i].val || 0) * multiplicator;
					} else {
						data.push ([eventDate.getTime(),(res[i].val || 0) * multiplicator]);
						lastEventDate=eventDate;
					}
				}
			} 	
            // free memory
            res = null;
        }

        if (currentId) {
			console.log ('Add current value for ' + currentId + ': date ' + normalizeDate(new Date (),mode).getTime() + 'value ' + vis.states[currentId + '.val']);
			if (data.length>0 && data[data.length-1][0]== normalizeDate(new Date (),mode).getTime()){
				data[data.length-1][1]=(vis.states[currentId + '.val']|| 0) * multiplicator;
			} else {
				data.push ([normalizeDate(new Date (),mode).getTime(),(vis.states[currentId + '.val']|| 0) * multiplicator]);
			}
		};
		if (virtualEnd>end) data.push([virtualEnd,0]);
		chart.series[index].setData (data,false);
  	    if (callback) callback();
    });
}

function readAndAddOneLineRange(chart,id,instance,multiplicator, index,mode,start,end,newMax,callback) {

    var option = {};
	var eventDate;
	var lastEventDate=new Date (0);	
	var currentYear=new Date ().getFullYear();
	var data = [];
	option.start=start;
	option.end=end;
    option.instance  = instance;
	option.aggregate='minmax';
	option.timeout=12000;
    console.log('Load Range for ' + id +' '+ new Date(option.start) + ' - ' + new Date(option.end));
	vis.getHistory(id, option, function (err, res) {
        if (err && Object.keys(err).length > 0) console.error('Error Object: ' + JSON.stringify(err));
        if (!err && res) {
			console.log('got History data. Count:' + res.length);		
            for (var i = 0; i < res.length; i++) {
				eventDate=normalizeDate(new Date (res[i].ts),mode);
				if (res[i].val!=null){
					if (lastEventDate.getTime()==eventDate.getTime()) {
						data[data.length-1][1]=(res[i].val || 0) * multiplicator;
					} else {
						data.push ([eventDate.getTime(),(res[i].val || 0) * multiplicator]);
						lastEventDate=eventDate;
					}
				}
			} 	
            // free memory
            res = null;
			if (data.length>0 && newMax< data[data.length-1][0])newMax=data[data.length-1][0];
			for (var i=0;i<data.length;i++){
				//console.log(' add point to ' + id + ':' + JSON.stringify(data[i]));	
				chart.series[index].addPoint (data[i],false,false,false,false); 				
			};				
        }
  	    if (callback) callback(newMax);
    });
}


function loadSeriesRange(chart,oidList, j,mode,start, end,virtualStart,virtualEnd, callback) {
    j = j || 0;
    if (j >= oidList.length) {
        return callback && callback();
    } else {
		if (oidList[j].historyOID && oidList[j].instance) {
			readOneLineRange(chart,oidList[j].historyOID,oidList[j].instance,oidList[j].currentOID,oidList[j].multiplicator,j,mode,start,end,virtualStart,virtualEnd, function () {
				setTimeout(function () {
					loadSeriesRange(chart,oidList, j+1,mode,start, end,virtualStart,virtualEnd, callback);
				}, 10);
			});
		}else{
            setTimeout(function () {
					loadSeriesRange(chart,oidList, j+1,mode,start, end,virtualStart,virtualEnd, callback);
            }, 10);			
		}
    }
}


function loadAndAddSeriesRange(chart,oidList, j,mode,start, end, newMax, callback) {
    j = j || 0;
    if (j >= oidList.length) {
        return callback && callback(newMax);
    } else {
		if (oidList[j].historyOID && oidList[j].instance) {
			readAndAddOneLineRange(chart,oidList[j].historyOID,oidList[j].instance,oidList[j].multiplicator,j,mode,start,end,newMax, function (newMax) {
				setTimeout(function () {
					loadAndAddSeriesRange(chart,oidList, j+1,mode,start, end,newMax, callback);
				}, 10);
			});
		}else{
            setTimeout(function () {
					loadAndAddSeriesRange(chart,oidList, j+1,mode,start, end,newMax, callback);
            }, 10);			
		}
    }
}

function normalizeDate (date,mode) {
	if (mode=='hour') {
		date.setMilliseconds(0);
		date.setSeconds(0);	
		date.setMinutes(0);
	} else if (mode=='day') {
		date.setUTCMilliseconds(0);
		date.setUTCSeconds(0);	
		date.setUTCMinutes(0);
		date.setUTCHours(0);		
	} else if (mode=='week') {
		var day = date.getDay();
		var diff = date.getDate() - day + (day == 0 ? -6:1);
		date=new Date(date.setDate(diff));
		date.setUTCMilliseconds(0);
		date.setUTCSeconds(0);	
		date.setUTCMinutes(0);
		date.setUTCHours(0);				
		return date;
	} else if (mode=='month') {
		date.setUTCMilliseconds(0);
		date.setUTCSeconds(0);	
		date.setUTCMinutes(0);
		date.setUTCHours(0);		
		date.setUTCDate(1);
	} else if (mode=='year') {
		date.setUTCMilliseconds(0);
		date.setUTCSeconds(0);	
		date.setUTCMinutes(0);
		date.setUTCHours(0);		
		date.setUTCDate(1);
		date.setUTCMonth(0);
	};
	return date;
}



	
	
	
 	var minDate=new Date (2020,0,1).getTime();
(function(H) {
    H.Chart.prototype.pan = function(e, panning) {
        var chart = this,
            hoverPoints = chart.hoverPoints,
            panningOptions, chartOptions = chart.options.chart,
            doRedraw, type;
        if (typeof panning === 'object') {
            panningOptions = panning;
        } else {
            panningOptions = {
                enabled: panning,
                type: 'x'
            };
        }
        if (chartOptions && chartOptions.panning) {
            chartOptions.panning = panningOptions;
        }
        type = panningOptions.type;
        H.fireEvent(this, 'pan', {
            originalEvent: e
        }, function() {
            // remove active points for shared tooltip
            if (hoverPoints) {
                hoverPoints.forEach(function(point) {
                    point.setState();
                });
            }
            // panning axis mapping
            var xy = [1]; // x
            if (type === 'xy') {
                xy = [1, 0];
            } else if (type === 'y') {
                xy = [0];
            }
            xy.forEach(function(isX) {
                var axis = chart[isX ? 'xAxis' : 'yAxis'][0],
                    axisOpt = axis.options,
                    horiz = axis.horiz,
                    mousePos = e[horiz ? 'chartX' : 'chartY'],
                    mouseDown = horiz ? 'mouseDownX' : 'mouseDownY',
                    startPos = chart[mouseDown],
                    halfPointRange = (axis.pointRange || 0) / 2,
                    pointRangeDirection = (axis.reversed && !chart.inverted) ||
                    (!axis.reversed && chart.inverted) ?
                    -1 :
                    1,
                    extremes = axis.getExtremes(),
                    panMin = axis.toValue(startPos - mousePos, true) +
                    halfPointRange * pointRangeDirection,
                    panMax = axis.toValue(startPos + axis.len - mousePos, true) -
                    halfPointRange * pointRangeDirection,
                    flipped = panMax < panMin,
                    newMin = flipped ? panMax : panMin,
                    newMax = flipped ? panMin : panMax,
                    
                    // CHANGE
                    
                    paddedMin = minDate,
                    paddedMax = new Date().getTime(),
                            
                    // CHANGE
                            
                    spill;

                // It is not necessary to calculate extremes on ordinal axis,
                // because the are already calculated, so we don't want to
                // override them.
                if (!axisOpt.ordinal) {
                    // If the new range spills over, either to the min or max,
                    // adjust the new range.
                    if (isX) {
                        spill = paddedMin - newMin;
                        if (spill > 0) {
                            newMax += spill;
                            newMin = paddedMin;
                        }
                        spill = newMax - paddedMax;
                        if (spill > 0) {
                            newMax = paddedMax;
                            newMin -= spill;
                        }
                    }
                    // Set new extremes if they are actually new
                    if (axis.series.length &&
                        newMin !== extremes.min &&
                        newMax !== extremes.max &&
                        isX ? true : (axis.panningState &&
                            newMin >= axis.panningState
                            .startMin &&
                            newMax <= axis.panningState
                            .startMax //
                        )) {
                        axis.setExtremes(newMin, newMax, false, false, {
                            trigger: 'pan'
                        });
                        doRedraw = true;
                    }
                    // set new reference for next run:
                    chart[mouseDown] = mousePos;
                }
            });
            if (doRedraw) {
                chart.redraw(false);
            }
            H.css(chart.container, {
                cursor: 'move'
            });
        });
				
    };
	
	/**
	 * Zoom into a given portion of the chart given by axis coordinates.
	 *
	 * @private
	 * @function Highcharts.Chart#zoom
	 * @param {Highcharts.SelectEventObject} event
	 */
	H.Chart.prototype.zoom = function (event) {
		console.log ("Chart Zoom handler ");
		var chart = this,
			pointer = chart.pointer,
			mouseDownPos = chart.inverted ?
				pointer.mouseDownX : pointer.mouseDownY;
		var displayButton = false,
			hasZoomed;
		// If zoom is called with no arguments, reset the axes
		if (!event || event.resetSelection) {
			chart.axes.forEach(function (axis) {
				hasZoomed = axis.zoom();
			});
			pointer.initiated = false; // #6804
		}
		else { // else, zoom in on all axes
			event.xAxis.concat(event.yAxis).forEach(function (axisData) {
				var axis = axisData.axis,
					axisStartPos = chart.inverted ? axis.left : axis.top,
					axisEndPos = chart.inverted ?
						axisStartPos + axis.width : axisStartPos + axis.height,
					isXAxis = axis.isXAxis;
				var isWithinPane = false;
				// Check if zoomed area is within the pane (#1289).
				// In case of multiple panes only one pane should be zoomed.
				if ((!isXAxis &&
					mouseDownPos >= axisStartPos &&
					mouseDownPos <= axisEndPos) ||
					isXAxis ||
					!H.defined(mouseDownPos)) {
					isWithinPane = true;
				}
				// don't zoom more than minRange
				if (pointer[isXAxis ? 'zoomX' : 'zoomY'] && isWithinPane) {
					hasZoomed = axis.zoom(axisData.min, axisData.max);
					if (axis.displayBtn) {
						displayButton = true;
					}
				}
			});
		}
		// Show or hide the Reset zoom button
		var resetZoomButton = chart.resetZoomButton;
		if (displayButton && !resetZoomButton) {
			chart.showResetZoom();
		}
		else if (!displayButton && H.isObject(resetZoomButton)) {
			chart.resetZoomButton = resetZoomButton.destroy();
		}
		// Redraw
		if (hasZoomed) {
			chart.redraw(H.pick(chart.options.chart.animation, event && event.animation, chart.pointCount < 100));
		}
	};
		
		
	H.Axis.prototype.zoom = function (newMin, newMax) {
		console.log ("Axis Zoom handler min:"+ new Date(newMin) + " max:" + new Date (newMax));
		var chart = this
		var maxX,minX;
		var chart=this.chart;
		if (chart && chart.navigator && chart.navigator.xAxis) {
			minX=chart.navigator.xAxis.min;
			maxX=chart.navigator.xAxis.max;
		}
		var axis = this,
			dataMin = this.dataMin,
			dataMax = this.dataMax,
			options = this.options,
			min = Math.min(dataMin,
			H.pick(options.min,
			dataMin),minX),
			max = Math.max(dataMax,
			H.pick(options.max,
			dataMax),maxX),
			evt = {
				newMin: newMin,
				newMax: newMax
			};
		H.fireEvent(this, 'zoom', evt, function (e) {
			// Use e.newMin and e.newMax - event handlers may have altered them
			var newMin = e.newMin,
				newMax = e.newMax;
			if (newMin !== axis.min || newMax !== axis.max) { // #5790
				// Prevent pinch zooming out of range. Check for defined is for
				// #1946. #1734.
				if (!axis.allowZoomOutside) {
					// #6014, sometimes newMax will be smaller than min (or
					// newMin will be larger than max).
					if (H.defined(dataMin)) {
						if (newMin < min) {
							newMin = min;
						}
						if (newMin > max) {
							newMin = max;
						}
					}
					if (H.defined(dataMax)) {
						if (newMax < min) {
							newMax = min;
						}
						if (newMax > max) {
							newMax = max;
						}
					}
				}
				// In full view, displaying the reset zoom button is not
				// required
				//axis.displayBtn = (typeof newMin !== 'undefined' ||
				//	typeof newMax !== 'undefined');
				axis.displayBtn = false;
				// Do it
				axis.setExtremes(newMin, newMax, false, void 0, { trigger: 'zoom' });
			}
			e.zoomed = true;
		});
		return evt.zoomed;
	};
		
	/**
	 * Handle touch events with two touches
	 * @private
	 * @function Highcharts.Pointer#pinch
	 */
	H.Pointer.prototype.pinch = function (e) {
		console.log ("Pointer pinch handler ");
	
		var self = this,
			chart = self.chart,
			pinchDown = self.pinchDown,
			touches = (e.touches || []),
			touchesLength = touches.length,
			lastValidTouch = self.lastValidTouch,
			hasZoom = self.hasZoom,
			transform = {},
			fireClickEvent = touchesLength === 1 && ((self.inClass(e.target, 'highcharts-tracker') &&
				chart.runTrackerClick) ||
				self.runChartClick),
			clip = {};
		var selectionMarker = self.selectionMarker;
		// Don't initiate panning until the user has pinched. This prevents us
		// from blocking page scrolling as users scroll down a long page
		// (#4210).
		if (touchesLength > 1) {
			self.initiated = true;
		}
		else if (touchesLength === 1 && this.followTouchMove) {
			// #16119: Prevent blocking scroll when single-finger panning is
			// not enabled
			self.initiated = false;
		}
		// On touch devices, only proceed to trigger click if a handler is
		// defined
		if (hasZoom &&
			self.initiated &&
			!fireClickEvent &&
			e.cancelable !== false) {
			e.preventDefault();
		}
		// Normalize each touch
		[].map.call(touches, function (e) {
			return self.normalize(e);
		});
		// Register the touch start position
		if (e.type === 'touchstart') {
			[].forEach.call(touches, function (e, i) {
				pinchDown[i] = { chartX: e.chartX, chartY: e.chartY };
			});
			lastValidTouch.x = [pinchDown[0].chartX, pinchDown[1] &&
					pinchDown[1].chartX];
			lastValidTouch.y = [pinchDown[0].chartY, pinchDown[1] &&
					pinchDown[1].chartY];
			// Identify the data bounds in pixels
			chart.axes.forEach(function (axis) {
				if (axis.zoomEnabled) {
					var bounds = chart.bounds[axis.horiz ? 'h' : 'v'],
						minPixelPadding = axis.minPixelPadding,
						min = axis.toPixels(Math.min(H.pick(axis.options.min,
						axis.dataMin),
						axis.dataMin,minDate)),
						max = axis.toPixels(Math.max(H.pick(axis.options.max,
						axis.dataMax),
						axis.dataMax,new Date().getTime())),
						absMin = Math.min(min,
						max),
						absMax = Math.max(min,
						max);
					// Store the bounds for use in the touchmove handler
					bounds.min = Math.min(axis.pos, absMin - minPixelPadding);
					bounds.max = Math.max(axis.pos + axis.len, absMax + minPixelPadding);
				}
			});
			self.res = true; // reset on next move
			// Optionally move the tooltip on touchmove
		}
		else if (self.followTouchMove && touchesLength === 1) {
			this.runPointActions(self.normalize(e));
			// Event type is touchmove, handle panning and pinching
		}
		else if (pinchDown.length) { // can be 0 when releasing, if touchend
			// fires first
			H.fireEvent(chart, 'touchpan', { originalEvent: e }, function () {
				// Set the marker
				if (!selectionMarker) {
					// @todo It's a mock object, so maybe we need a separate
					// interface
					self.selectionMarker = selectionMarker = extend({
						destroy: H.noop,
						touch: true
					}, chart.plotBox);
				}
				self.pinchTranslate(pinchDown, touches, transform, selectionMarker, clip, lastValidTouch);
				self.hasPinched = hasZoom;
				// Scale and translate the groups to provide visual feedback
				// during pinching
				self.scaleGroups(transform, clip);
			});
			if (self.res) {
				self.res = false;
				this.reset(false, 0);
			}
		}
	};
	
}(Highcharts));
 

var types = ['DOMMouseScroll', 'mousewheel'];

$.event.special.mousewheel = {
    setup: function() {
        if ( this.addEventListener ) {
            for ( var i=types.length; i; ) {
                this.addEventListener( types[--i], handler, false );
            }
        } else {
            this.onmousewheel = handler;
        }
    },
    
    teardown: function() {
        if ( this.removeEventListener ) {
            for ( var i=types.length; i; ) {
                this.removeEventListener( types[--i], handler, false );
            }
        } else {
            this.onmousewheel = null;
        }
    }
};

$.fn.extend({
    mousewheel: function(fn) {
        return fn ? this.bind("mousewheel", fn) : this.trigger("mousewheel");
    },
    
    unmousewheel: function(fn) {
        return this.unbind("mousewheel", fn);
    }
});


function handler(event) {
    var orgEvent = event || window.event, args = [].slice.call( arguments, 1 ), delta = 0, returnValue = true, deltaX = 0, deltaY = 0;
    event = $.event.fix(orgEvent);
    event.type = "mousewheel";
    
    // Old school scrollwheel delta
    if ( event.wheelDelta ) { delta = event.wheelDelta/120; }
    if ( event.detail     ) { delta = -event.detail/3; }
    
    // New school multidimensional scroll (touchpads) deltas
    deltaY = delta;
    
    // Gecko
    if ( orgEvent.axis !== undefined && orgEvent.axis === orgEvent.HORIZONTAL_AXIS ) {
        deltaY = 0;
        deltaX = -1*delta;
    }
    
    // Webkit
    if ( orgEvent.wheelDeltaY !== undefined ) { deltaY = orgEvent.wheelDeltaY/120; }
    if ( orgEvent.wheelDeltaX !== undefined ) { deltaX = -1*orgEvent.wheelDeltaX/120; }
    
    // Add event and delta to the front of the arguments
    args.unshift(event, delta, deltaX, deltaY);
    
    return $.event.handle.apply(this, args);
}
  
 

	  
	vis.binds.photovoltaikcharts = {
		version: "1.0.9",
		updateIntervalHandler:[],
		reloadIntervalHandler:[],
		delayedRefreshHandler:[],
		
		showVersion: function () {
			if (vis.binds.photovoltaikcharts.version) {
				console.log('Version vis-photovoltaikcharts: ' + vis.binds.photovoltaikcharts.version);
				vis.binds.photovoltaikcharts.version = null;
			}
		},
		
		highchartsOptions:{
				lang: {
					months: [
						'Januar', 'Februar', 'März', 'April',
						'Mai', 'Juni', 'Juli', 'August',
						'September', 'Oktober', 'November', 'Dezember'
					],
					weekdays: [
						'Sonntag', 'Montag', 'Dienstag', 'Mittwoch',
						'Donnerstag', 'Freitag', 'Samstag'
					],
					shortWeekdays:[
						'So', 'Mo', 'Di', 'Mi',
						'Do', 'Fr', 'Sa'
					],
					shortMonths:["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun",
											"Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
					contextButtonTitle: 'Kontextmenü',
					decimalPoint:',',
					downloadCSV:'CSV-Datei herunterladen',
					downloadJPEG:'JPG-Datei herunterladen',
					downloadPDF:'PDF-Datei herunterladen',
					downloadPNG:'PNG-Datei herunterladen',
					downloadSVG:'SVG-Datei herunterladen',
					downloadXLS:'XLS-Datei herunterladen',
					exitFullscreen:'Vollbildanzeige beenden',
					hideData: 'Datentabellen ausblenden',
					loading:'Laden...',
					noData:'Keine Daten',
					numericSymbols:["k", "M", "G", "T", "P", "E"],
					printChart:'Diagramm drucken',
					resetZoom: 'Zoom zurücksetzen',
					resetZoomTitle: 'Zoom auf 1:1 zurücksetzen',
					viewData: 'Datentabelle anzeigen',
					viewFullscreen:'Als Vollbild anzeigen',
					exportData:{
						annotationHeader:'Anmerkungen',
					  categoryDatetimeHeader:'Datum/Zeit',
					  categoryHeader:'Kategorie'
					},
					
				}
			},
		
		highchartsSeriesUnits:[[
									'second',
									[1]
								], [
									'minute',
									[1]
								], [
									'hour',
									[1]
								], [
									'day',
									[1]
								], [
									'week',
									[1]
								], [
									'month',
									[1, 3, 6]
								], [
									'year',
									null
								]],
								
		highchartsDateTimeLabelFormats:{
						millisecond: '%H:%M:%S.%L',
						second: '%H:%M:%S',
						minute: '%H:%M',
						hour: '%H:%M',
						day: '%e. %b',
						week: '%e. %b',
						month: '%b \'%y',
						year: '%Y'      
					},
		scrollspeed:0.3,
								
								
								
		getUniqueOID: function (oidList) {
			var result = [];
			oidList.forEach(function(item) {
				 if(result.indexOf(item.currentOID) < 0) {
					 result.push(item.currentOID);
				 }
			});
			return result;
		},
		
		findOID: function findOid (oidList,iod){				
			var result = [];
			for (var i=0;i<	oidList.length;i++){
				if (oidList[i].currentOID + '.val'==iod) result.push (i);
			}
			return result;			
		},

		createMonthlyWidget: function (widgetID, view, data, style) {
			var seriesData = [];
			var oidList = [];
			var targetArray = null;
			var divId = 'chart_placeholder';
			var chart = null;

			var fbobj=this;
			console.log(' vis-photovoltaikcharts: Create Monthly Widget');
		
			var $div = $('#' + widgetID);
			// if nothing found => wait
			if (!$div.length) {
				return setTimeout(function () {
					fbobj.createMonthlyWidget(widgetID, view, data, style);
				}, 100);
			}
			console.log ("Initialize Chart Widget #" + widgetID );
			var systemLang = 'en';
			if (typeof sysLang !== 'undefined') {
				systemLang = sysLang || 'en';
			}
			if (data.target) {
				targetArray =data.target.split (',');
			}								
			
			oidList =[];
			seriesData=[];
			var j=0;
			var k;
			for (k=1;k<=data.seriesCount;k++){
				if (data['serieshistoryoid'+k] && data ['instance'+ k ]){
					oidList.push ({id:j, historyOID:data['serieshistoryoid' + k],instance:data ['instance'+ k ],currentOID:data ['seriescurrentoid' + k],  multiplicator:parseFloat(data ['multiplicator'+ k ]) || 1,lastX:0 });					
					j++;
				}
			}

			var today = new Date();
			var numberOfYears=data.numberOfYears || 3;

			var year = today.getFullYear();
			var targetData = [[0,0,0],[0.8,0,0],[1.7,0,0],[2.6,0,0],[3.5,0,0],[4.7,0,0],[5.7,0,0],[6.7,0,0],[7.6,0,0],[8.6,0,0],[9.5,0,0],[10.4,0,0],[11.4,0,0]];
			var categories = [year.toString(), (year-1).toString(), (year-2).toString()];
			var categories = [];
			seriesData=[];
			for (var i=0;i<numberOfYears;i++){
				categories.push (year-i);
				
				for (k=1;k<=data.seriesCount;k++){
					if (data['serieshistoryoid'+k] && data ['instance'+ k ]){
						seriesData.push ({
							name: (data['serieslabel' + k] || '') + ' ' + (year-numberOfYears+i+1).toString().substr(-2),
							data: [0, 0, 0, 0, 0,0, 0, 0, 0, 0, 0, 0],
							stack: numberOfYears-i-1,
							color: data['yearcolor'+ k + (numberOfYears-i) ] || undefined,
							lineWidth: data['serieslinewidth'+ k] || 1,
							fillOpacity: (data['seriesopacity'+k]? parseFloat(data['seriesopacity'+k])/100 : 0.3),
							type: data['seriesType'+k] || 'column',
							opacity: 0.9

						});
					}
				}
			};
			
			if (Array.isArray(targetArray)) {
				for (var index = 0; index < targetArray.length; index++) {
					targetData [index][1]=parseFloat(targetArray[index]);
				}		
				
				seriesData.push (
				{
					type: 'scatter',
					lineWidth:2,
							name: data.targetName || 'Target',
							step: 'left',
							data: targetData,
							color: '#A4A4A4',
							marker: {
								enabled:false
							}
				});
			}

			if (vis.language === 'de') Highcharts.setOptions(fbobj.highchartsOptions);
			_readData(seriesData,oidList,function () {
					var unit=data.unit;
					chart = Highcharts.chart(divId + widgetID, {
					chart: {
						width: $div.width()-2,
						height: $div.height()-2,
						zoomType: 'x',
						type: 'column',
								options3d: {
									enabled: true,
									alpha: data.alpha || 8,
									beta: data.beta || 8,
									depth: data.depth || 200,
									viewDistance: data.viewDistance || 5,
									frame: {
										bottom: {
										size: 1,
										color: 'rgba(0,0,0,0.05)'
										}
									}
								}
							},
							title: {
								text: data.title
							},
							xAxis: {
									categories: months [systemLang]
							},
							yAxis: {
								title: {
									text: unit
								}
							},
							zAxis: {
							  min: 0,
							  max: 2,
							  labels: {
								y: 5,
								rotation: 18
							  },
						categories: categories

							},
							
						  plotOptions: {
									column: {
										stacking: 'normal'
									},
						  series: {
							groupZPadding: 10,
							depth: 50,
							groupPadding: 0.05,
							grouping: false,
						  }
					  },
						legend: {
							enabled: data.showLegend,
						},
						exporting: {
							enabled: data.showMenu,
						},
					  
						tooltip: {
							formatter: function () {
								if (this.point.stackTotal){
									return '<b>' + this.x + ' ' + this.series.chart.zAxis[0].options.categories[this.series.userOptions.stack] +  '</b><br/>' +
										this.series.name + ': ' + this.y + '<br/>' +
										(data.stacklabel || 'Erzeugung:') + ' ' + this.point.stackTotal +
										(Array.isArray(targetArray)?'<br/>' +(data.targetName || 'Target') + ': ' + targetArray[this.point.x]:'')											
										;
								} else {
									return '<b>' + this.x + '</b><br/>' +
										this.series.name + ': ' + this.y;
								}
							}
						},
						series: seriesData,
						
						credits: {
							enabled: false
						}
				   });						

			 },0,1,(new Date(year-numberOfYears+1, 0, 1)).getTime());

			function getUniqueOID (oidList) {
				var result = [];
				oidList.forEach(function(item) {
					 if(result.indexOf(item.currentOID) < 0) {
						 result.push(item.currentOID);
					 }
				});
				return result;
			}
			
            function findOid (oidList,iod){				
				for (var i=0;i<	oidList.length;i++){
					if (oidList[i].currentOID + '.val'==iod) return i;
				}
			};
			

			// subscribe on updates of value
			
			function onChangeSeries (e, newVal, oldVal) {
				if (!chart || newVal==oldVal) {
					return;
				}
				var ids=fbobj.findOID(oidList,e.type);
				for (var i=0;i<ids.length;i++){				
					chart.series[(numberOfYears-1)* oidList.length +ids[i]].data[(new Date ()).getMonth()].update((parseFloat(newVal) || 0) * oidList[ids[i]].multiplicator);				
				}
			}
					

			var uniqueOID=fbobj.getUniqueOID (oidList);
			for (var i=0;i<uniqueOID.length;i++){
				if (uniqueOID[i]) {
					console.log ('register on changes for ' + uniqueOID[i]);
					vis.states.bind(uniqueOID[i] + '.val', onChangeSeries);
					$div.data('bound', [uniqueOID[i] + '.val']);
					$div.data('bindHandler', onChangeSeries);
				}			
			}

		},

		createYearlyWidget: function (widgetID, view, data, style) {
			var seriesData = [];
			var oidList = [];
			var targetArray = null;
			var divId = 'chart_placeholder';
			var chart = null;

			var fbobj=this;
			console.log(' vis-photovoltaikcharts: Create Yearly Widget');
		
			var $div = $('#' + widgetID);
			// if nothing found => wait
			if (!$div.length) {
				return setTimeout(function () {
					fbobj.createYearlyWidget(widgetID, view, data, style);
				}, 100);
			}
			console.log ("Initialize Chart Widget #" + widgetID );
			var systemLang = 'en';
			if (typeof sysLang !== 'undefined') {
				systemLang = sysLang || 'en';
			}

			var numberOfYears=data.numberOfYears || 4;
			var today = new Date();
			var year = today.getFullYear();
			var categories = [];
			var defaultData = [];
			for (var i=numberOfYears-1;i>=0;i--){
				categories.push (year-i);
				defaultData.push (0);
			};

			oidList =[];
			seriesData=[];
			var j=0;
			var i;
			for (i=1;i<=data.seriesCount;i++){
				if (data['serieshistoryoid'+i] && data ['instance'+ i ]){
					oidList.push ({id:j, historyOID:data['serieshistoryoid'+i],instance:data ['instance'+ i ],currentOID:data ['seriescurrentoid'+i],  multiplicator:parseFloat(data ['multiplicator'+ i ]) || 1,lastX:0 });
					seriesData.push ({
						name: data['serieslabel'+i] ,
						data: defaultData.slice(0),
						color: data['seriescolor'+i] || undefined,
						lineWidth: data['serieslinewidth'+i] || 1,
						fillOpacity: (data['seriesopacity'+i]? parseFloat(data['seriesopacity'+i])/100 : 0.3),
						type: data['seriesType'+i] || 'column',
						opacity: 0.9

					});
					
					j++;
				}
			}
			
									
			var plotLines=[];
			if (data.target) {
				plotLines.push ({color:"#33FF50",dashStyle:"Solid",label:data.targetName || 'Target',value:parseFloat(data.target),width:2});
			}

			_readData(seriesData,oidList,function () {
				if (vis.language === 'de') Highcharts.setOptions(fbobj.highchartsOptions);
				var unit=data.unit;
				chart = Highcharts.chart(divId + widgetID, {
					chart: {
						width: $div.width()-2,
						height: $div.height()-2,
						zoomType: 'x',
						type: 'column',
								options3d: {
									enabled: true,
									alpha: data.alpha || 8,
									beta: data.beta || 8,
									depth: data.depth || 50,
									viewDistance: data.viewDistance || 5,
									frame: {
										bottom: {
										size: 1,
										color: 'rgba(0,0,0,0.05)'
										}
									}
								}
							},
							title: {
								text: data.title
							},
							xAxis: {
									categories: categories
							},
							yAxis: {
								title: {
									text: unit
								},
							plotLines:plotLines


							},
							
						  series: {
							groupZPadding: 10,
							depth: 50,
							groupPadding: 0.05,
							grouping: false,
						  },
					legend: {
						enabled: data.showLegend,
					},
					exporting: {
						enabled: data.showMenu,
					},
						  
					tooltip: {
						formatter: function () {
							if (this.point.stackTotal){
								return '<b>' + this.x + ' ' + this.series.chart.zAxis[0].options.categories[this.series.userOptions.stack] +  '</b><br/>' +
									this.series.name + ': ' + this.y + '<br/>' +
									(data.stacklabel || 'Erzeugung:') + ' ' + this.point.stackTotal +
									(Array.isArray(targetArray)?'<br/>' +(data.targetName || 'Target') + ': ' + targetArray[this.point.x]:'')											
									;
							} else {
								return '<b>' + this.x + '</b><br/>' +
									this.series.name + ': ' + this.y;
							}
						}
					},							
					series: seriesData,
					
					credits: {
						enabled: false
					}
				});						

			 },0,2,(new Date(year-numberOfYears+1, 0, 1)).getTime());

  

			// subscribe on updates of value
			
			function onChangeSeries (e, newVal, oldVal) {
				if (!chart || newVal==oldVal) {
					return;
				}
				var ids=fbobj.findOID(oidList,e.type);
				var eventDate=normalizeDate (new Date (),data.normalizeDate);
				for (var i=0;i<ids.length;i++){				
					console.log ('add new series ' + (ids[i]+1) + ' value :' + eventDate + '(' + eventDate.getTime() + ') - ' + newVal);
					chart.series[ids[i]].data[numberOfYears-1].update((parseFloat(newVal) || 0) * oidList[ids[i]].multiplicator);				
				}
			}


			var uniqueOID=fbobj.getUniqueOID (oidList);
			for (var i=0;i<uniqueOID.length;i++){
				if (uniqueOID[i]) {
					console.log ('register on changes for ' + uniqueOID[i]);
					vis.states.bind(uniqueOID[i] + '.val', onChangeSeries);
					$div.data('bound', [uniqueOID[i] + '.val']);
					$div.data('bindHandler', onChangeSeries);
				}			
			}
			 			 
		},
		
		createTimeseriesWidget: function (widgetID, view, data, style) {
			var seriesData = [];
			var oidList = [];
			var targetArray = null;
			var divId = 'chart_placeholder';
			var chart = null;
			var fbobj=this;
			var loadRunning=false;
			var refreshRequired=false;
			var lastEvent=null;
			var loadWaiting=false;
			var navigationData=[];
			var zoomlevel ={"1d":0,"3d":1,"7d":2,"1m":3,"3m":4,"6m":5,"ytd":6,"1y":7,"all":8};
			
			console.log(' photovoltaikcharts: Create Timeseries Widget');
		
			var $div = $('#' + widgetID);
			// if nothing found => wait
			if (!$div.length) {
				return setTimeout(function () {
					fbobj.createTimeseriesWidget(widgetID, view, data, style);
				}, 100);
			}
			console.log ("Initialize Chart Widget #" + widgetID );
			var systemLang = 'en';
			if (typeof sysLang !== 'undefined') {
				systemLang = sysLang || 'en';
			}
			
			oidList =[];
			seriesData=[];
			var j=0;
			var i;
			for (i=1;i<=data.seriesCount;i++){
				if (data['serieshistoryoid'+i] && data ['instance'+ i ]){
					oidList.push ({id:j, historyOID:data['serieshistoryoid'+i],instance:data ['instance'+ i ],currentOID:data ['seriescurrentoid'+i],  multiplicator:parseFloat(data ['multiplicator'+ i ]) || 1,lastX:0 });
					seriesData.push ({
						name: data['serieslabel'+i] ,
						data: [],
						color: data['seriescolor'+i] || '#FF5A33',
						lineWidth: data['serieslinewidth'+i] || 1,
						fillOpacity: (data['seriesopacity'+i]? parseFloat(data['seriesopacity'+i])/100 : 0.3),
						type: data['seriesType'+i] || 'areaspline',
						yAxis:(data['seriesaxis'+i]? parseInt(data['seriesaxis'+i]): 0),
						step: (data['seriesstep'+i] && data['seriesstep'+i]!='no'?data['seriesstep'+i]: undefined),
						stacking: (data['seriesstacking'+i] && data['seriesstacking'+i]!='no' ? data['seriesstacking'+i] :undefined),
						dataGrouping: {
							enabled: (data['seriesType'+i]!='column' ? true: false),
							approximation:"high",
							units:(data['seriesType'+i]!='column' ? fbobj.highchartsSeriesUnits:undefined)
						},
						states: {	
							hover: {
								enabled: true,
								lineWidth: data['serieshoverlinewidth'+i] || 1,
							}
						},
						pointInterval:10000

					});
					
					j++;
				}
			}
						
			
			var plotLines=[];
			if (data.target) {
				plotLines.push ({color:"#33FF50",dashStyle:"Solid",label:data.targetName || 'Target',value:parseFloat(data.target),width:2});
			}

			
			function loadSeriesData (start,end,callback) {
				console.log ('resize chart to ' + new Date (start) + ' - ' + new Date (end));
				loadWaiting=false;
				if (start && end){
					loadRunning=true;
					var virtualStart=start;
					var virtualEnd=end;
					chart.showLoading();
					window.setTimeout(function (){ 
						loadSeriesRange(chart,oidList,0,data.normalizeDate,start,end,virtualStart,virtualEnd,function () {
							chart.redraw();
							chart.hideLoading();
							loadRunning=false;
							if (callback) callback();
						});
					},10);
				}
			};
			

			/**
			 * Load new data depending on the selected min and max
			 */
			
			if (fbobj.delayedRefreshHandler[widgetID]) window.clearInterval(fbobj.delayedRefreshHandler[widgetID]);						
			fbobj.delayedRefreshHandler[widgetID]=window.setInterval( function () {
				if (loadRunning==false && refreshRequired==true) {
   				   refreshRequired=false;
  				   console.log ('Process event ' + new Date (lastEvent.min) + ' - ' + new Date (lastEvent.max));				   
				   loadSeriesData (lastEvent.min,lastEvent.max);
				   
				} 	
			},500);


			function afterSetExtremes(event) {
				console.log ('afterSetExtremes event ' + new Date (event.min) + ' - ' + new Date (event.max)+ ' - ' + event.trigger);
				if (event.trigger!=undefined){
					if (!loadRunning) {
						loadSeriesData (event.min,event.max);
					} else {
						lastEvent=event;
						console.log ('Save event ' + new Date (event.min) + ' - ' + new Date (event.max));

						refreshRequired=true;
					}
				}
			}
			
			function setExtremes(event) {
				console.log ('setExtremes event ' + new Date (event.min) + ' - ' + new Date (event.max)+ ' - ' + event.trigger);
			}
			
			if (vis.language === 'de')Highcharts.setOptions(fbobj.highchartsOptions);
			var unit = data.unit;
			chart = Highcharts.stockChart(divId + widgetID, {
				chart: {
					width: $div.width()-2,
					height: $div.height()-2,
					zoomType: 'x',
					renderTo: divId + widgetID,
					panning: true,
					panKey: 'shift'					
				},
				title: {
					text: data.title
				},
				time:{
				   timezoneOffset:(data.normalizeDate=='no' ||data.normalizeDate=='hour' ? new Date().getTimezoneOffset() : 0 )
				},
				rangeSelector: {
				  buttons: [{
						type: 'day',
						count: 1,
						text: '1 Tag',
						title: '1 Tag anzeigen'
					},{
						type: 'day',
						count: 3,
						text: '3 Tage',
						title: '3 Tage anzeigen'
					},{
						type: 'day',
						count: 7,
						text: '7 Tage',
						title: '7 Tage anzeigen'
					},{
						type: 'month',
						count: 1,
						text: '1M',
						title: '1 Monat anzeigen'
					}, {
						type: 'month',
						count: 3,
						text: '3M',
						title: '3 Monate anzeigen'
					}, {
						type: 'month',
						count: 6,
						text: '6M',
						title: '6 Monate anzeigen'
					}, {
						type: 'ytd',
						text: 'Aktuelles Jahr',
						title: 'Aktuelles Jahr anzeigen'
					}, {
						type: 'year',
						count: 1,
						text: '1 Jahr',
						title: '1 Jahr anzeigen'
					}, {
						type: 'all',
						text: 'Alles',
						title: 'Alles anzeigen'
					}],
					allButtonsEnabled: true,
					dropdown:'always',
					height: 10,
					selected: zoomlevel[data.zoomDefault],
					inputDateFormat:'%e. %b %Y'
				},
				navigator: {
					adaptToUpdatedData:false,
					height: 20,
					margin: 10,
					series: [
						{
							data: null,
							dataGrouping: {
								enabled: true,
								approximation:"high",
								units:fbobj.highchartsSeriesUnits								
							},
							pointInterval:10000
						}							
					],
					xAxis:{
						ordinal: false
					},
				},
				scrollbar: {
					enabled: false
				},
				xAxis: {
					events: {
						afterSetExtremes: afterSetExtremes,
						setExtremes: setExtremes
					},
					dateTimeLabelFormats:  fbobj.highchartsDateTimeLabelFormats,
					overscroll: 10000,
					ordinal: false
				},
				
				yAxis: [{
					labels: {
						formatter: function () {
							return this.value + (unit ? ' ' + unit : '');
						},
						align: 'left'

					},
					title: {
						text: 'Produktion'
					},
					height: (data.chart1Height? data.chart1Height+'%':'48%'),
					lineWidth: 2,
					resize: {
						enabled: true
					},

					plotLines:plotLines,
					min: (data.yAxis1min?parseFloat(data.yAxis1min):undefined),
					max: (data.yAxis1max?parseFloat(data.yAxis1max):undefined),
					tickAmount: (data.yAxis1tickamount?data.yAxis1tickamount:undefined),
					minorTicks: true
		
				},{
					labels: {
						formatter: function () {
							return this.value + ' ' + unit;
						},
						align: 'left'
					},
					title: {
						text: 'Verbrauch'
					},
					top: (data.chart1Height? parseFloat (data.chart1Height) + ((data.chartspacing? parseFloat(data.chartspacing) :4))+ '%': (48 + (data.chartspacing? parseFloat(data.chartspacing) :5))+'%'),
					height: (data.chart2Height? data.chart2Height+'%':'48%'),
					offset: 0,
					lineWidth: 2,
					min: (data.yAxis2min?parseFloat(data.yAxis2min):undefined),
					max: (data.yAxis2max?parseFloat(data.yAxis2max):undefined),
					tickAmount: (data.yAxis2tickamount?data.yAxis2tickamount:undefined),
					minorTicks: true
				}
				],

				plotOptions: {
				},
				legend: {
					enabled: data.showLegend,
					align: 'left',
					verticalAlign: 'top',
					x: 0,
					y: 20,
					floating: true           
				},
				exporting: {
					enabled: data.showMenu,
				},
				
				credits: {
				   enabled: false
				},
				tooltip: {
					pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b><br/>',
					valueDecimals: 2,
					split: true,
					followTouchMove:false,
					dateTimeLabelFormats: fbobj.highchartsDateTimeLabelFormats
				},

				series: seriesData
			});


			window.setTimeout(function (){
				loadSelectorData (navigationData,oidList[0].historyOID,oidList[0].instance,oidList[0].currentOID,oidList[0].multiplicator,data.normalizeDate,(data.navigatorRange? parseInt (data.navigatorRange): 48),function (){					
					chart.navigator.series[0].setData (navigationData);				
					chart.navigator.series[0].xAxis.min=navigationData[0][0];
					var startDate=new Date ();
					startDate.setUTCMilliseconds(0);
					startDate.setUTCSeconds(0);	
					if (data.zoomDefault=="1d"){
					   startDate.setDate (startDate.getDate()-1);
					} else if (data.zoomDefault=="7d"){
					   startDate.setDate (startDate.getDate()-7);
					} else if (data.zoomDefault=="3d"){
					   startDate.setDate (startDate.getDate()-3);
					} else if (data.zoomDefault=="1m"){
						startDate.setUTCMinutes(0);
						startDate.setUTCHours(0);		
						startDate.setUTCMonth (startDate.getMonth()-1);
					} else if (data.zoomDefault=="3m"){
						startDate.setUTCMinutes(0);
						startDate.setUTCHours(0);		
						startDate.setUTCMonth (startDate.getMonth()-3);
					} else if (data.zoomDefault=="6m"){
						startDate.setUTCMinutes(0);
						startDate.setUTCHours(0);		
						startDate.setUTCMonth (startDate.getMonth()-6);
					} else if (data.zoomDefault=="ytd"){
						startDate=new Date (startDate.getFullYear(),0,1);
					} else if (data.zoomDefault=="1y"){
						startDate.setUTCMinutes(0);
						startDate.setUTCHours(0);		
						startDate.setUTCMonth (startDate.getMonth()-12);
					}else if (data.zoomDefault=="all"){
						startDate.setUTCMinutes(0);
						startDate.setUTCHours(0);		
						startDate.setUTCMonth (startDate.getMonth()-120);						
					}
					loadSeriesData (startDate.getTime(),new Date ().getTime());				

					//add mouse wheel support
					var zoomRatio = 0;
					var lastX;
					var lastY;

					$('#'+ divId + widgetID).mousewheel(function(objEvent, intDelta) {
						if (intDelta > 0) {
							zoomRatio = -1 * fbobj.scrollspeed;
							setZoom();
						}
						else if (intDelta < 0) {
							zoomRatio = fbobj.scrollspeed;
							setZoom();
						}
					});

					var setZoom = function() {

						var xMin = chart.xAxis[0].getExtremes().dataMin;
						var xMax = chart.xAxis[0].getExtremes().dataMax;
						var absMin = minDate;
						var absMax = new Date ().getTime();
					   
						chart.xAxis[0].setExtremes(Math.max (absMin ,xMin - zoomRatio * (xMax-xMin)), Math.min (absMax, xMax + zoomRatio * (xMax-xMin)), true, true, { trigger: 'zoom' });
					}

				});
			},10);

			

			// subscribe on updates of value
			
			function onChangeSeries (e, newVal, oldVal) {
				if (!chart || newVal==oldVal) {
					return;
				}
				var ids=fbobj.findOID(oidList,e.type);
				var eventDate=normalizeDate (new Date (),data.normalizeDate);
				for (var i=0;i<ids.length;i++){				
					console.log ('add new series ' + (ids[i]+1) + ' value :' + eventDate + '(' + eventDate.getTime() + ') - ' + newVal);
					if (ids[i]==0) {

						if (chart.navigator.series[0].points && chart.navigator.series[0].points.length>0 && chart.navigator.series[0].points [chart.navigator.series[0].points.length-1]) console.log ('Last old x:' + chart.navigator.series[0].points[chart.navigator.series[0].points.length-1].x);

						if (chart.navigator.series[0].points && chart.navigator.series[0].points.length>0 && chart.navigator.series[0].points [chart.navigator.series[0].points.length-1] && chart.navigator.series[0].points[chart.navigator.series[0].points.length-1].x==eventDate.getTime()){
							chart.navigator.series[0].points[chart.navigator.series[0].points.length-1].update((parseFloat(newVal) || 0) * oidList[ids[i]].multiplicator);
						} else {
							chart.navigator.series[0].addPoint ([eventDate.getTime(),(parseFloat(newVal) || 0) * oidList[ids[i]].multiplicator]); 
						}

						if (chart.series[ids[i]].points && chart.series[ids[i]].points[chart.series[ids[i]].points.length-1] && chart.series[ids[i]].points[chart.series[ids[i]].points.length-1].x==eventDate.getTime()){
							console.log ('Update series ' + (ids[i]+1));			
							chart.series[ids[i]].points[chart.series[ids[i]].points.length-1].update((parseFloat(newVal) || 0) * oidList[ids[i]].multiplicator);
						} else {
							console.log ('Add new value to series 1');
							if (chart && chart.xAxis && typeof chart.xAxis[0] != 'undefined') {
								var oldExtremes=chart.xAxis[0].getExtremes();
								console.log ('Old extremes: ' + JSON.stringify (oldExtremes));
								var oldLastX=chart.navigator.xAxis.max ;
								console.log ('Last X: ' + new Date (oldLastX));
								console.log ('CompareX: ' + JSON.stringify (oldExtremes));
								console.log ('oldExtremes max: ' + new Date (oldExtremes.max));
								if (oldExtremes.max > oldLastX-(10*60*1000)){
									//chart.xAxis[0].setExtremes(oldExtremes.min+eventDate.getTime()-oldExtremes.max,eventDate.getTime());
									chart.series[ids[i]].addPoint ([eventDate.getTime(),(parseFloat(newVal) || 0) * oidList[ids[i]].multiplicator]); 
									var newMaxX=chart.navigator.xAxis.max;
									if (oldLastX!=newMaxX) chart.xAxis[0].setExtremes(oldExtremes.min+newMaxX-oldExtremes.max,newMaxX);

								}
							}
						}
					} else {
						if (chart.series[ids[i]].points && chart.series[ids[i]].points[chart.series[ids[i]].points.length-1] && chart.series[ids[i]].points[chart.series[ids[i]].points.length-1].x==eventDate.getTime()){
							chart.series[ids[i]].points[chart.series[ids[i]].points.length-1].update((parseFloat(newVal) || 0) * oidList[ids[i]].multiplicator);
						} else {   				
							if (chart && chart.xAxis && typeof chart.xAxis[1] != 'undefined') {
								var oldExtremes=chart.xAxis[1].getExtremes();
								var oldLastX=(chart.series && chart.series[ids[i]].points && chart.series[ids[i]].points.length>0 && chart.series[ids[i]].points[chart.series[ids[i]].points.length-1] && chart.series[ids[i]].points[chart.series[ids[i]].points.length-1].x? chart.series[ids[i]].points[chart.series[ids[i]].points.length-1].x:0);
								if (oldExtremes.max > oldLastX-(10*60*1000)){
									chart.series[ids[i]].addPoint ([eventDate.getTime(),(parseFloat(newVal) || 0) * oidList[ids[i]].multiplicator]); 
								}
							}					
						}
						
					}
				}
			}
			

			var uniqueOID=fbobj.getUniqueOID (oidList);
			for (var i=0;i<uniqueOID.length;i++){
				if (uniqueOID[i]) {
					console.log ('register on changes for ' + uniqueOID[i]);
					vis.states.bind(uniqueOID[i] + '.val', onChangeSeries);
					$div.data('bound', [uniqueOID[i] + '.val']);
					$div.data('bindHandler', onChangeSeries);
				}			
			}			
		},
		
		
		createTimeseries2Widget: function (widgetID, view, data, style) {
			var seriesData = [];
			var oidList = [];
			var targetArray = null;
			var divId = 'chart_placeholder';
			var chart = null;
			var fbobj=this;
			var loadRunning=false;
			var loadWaiting=false;
			var refreshRequired=false;
			var lastEvent=null;			
			var navigationData=[];
			var zoomlevel ={"1d":0,"3d":1,"7d":2,"1m":3,"3m":4,"6m":5};
			
			console.log(' photovoltaikcharts: Create Timeseries2 Widget');
		
			var $div = $('#' + widgetID);
			// if nothing found => wait
			if (!$div.length) {
				return setTimeout(function () {
					fbobj.createTimeseries2Widget(widgetID, view, data, style);
				}, 100);
			}
			console.log ("Initialize Chart Widget #" + widgetID );
			var systemLang = 'en';
			if (typeof sysLang !== 'undefined') {
				systemLang = sysLang || 'en';
			}
			
			var navigator={id:0, historyOID:data.navhistoryoid,instance:data.navinstance,multiplicator:parseFloat(data.navmultiplicator) || 1 };
			
			oidList =[];
			seriesData=[];
			var j=0;
			var i;
			for (i=1;i<=data.seriesCount;i++){
				if (data['serieshistoryoid'+i] && data ['instance'+ i ]){
					oidList.push ({id:j, historyOID:data['serieshistoryoid'+ i],instance:data ['instance'+ i ],multiplicator:parseFloat(data ['multiplicator'+ i ]) || 1,lastX:0 });
					
					seriesData.push ({
						name: data['serieslabel'+ i] ,
						data: [],
						color: data['seriescolor'+ i] || '#FF5A33',
						lineWidth: data['serieslinewidth'+ i] || 1,
						fillOpacity: (data['seriesopacity'+ i]? parseFloat(data['seriesopacity'+ i])/100 : 0.3),
						type: data['seriesType'+ i] || 'areaspline',
						yAxis:(data['seriesaxis'+ i]? parseInt(data['seriesaxis'+i]): 0),
						step: (data['seriesstep'+ i] && data['seriesstep'+i]!='no'?data['seriesstep'+ i]: undefined),
						stacking: (data['seriesstacking'+ i] && data['seriesstacking'+ i]!='no'  ? data['seriesstacking'+ i] :undefined),
						dataGrouping: {
							enabled: (data['seriesType'+i]!='column' ? true: false),
							approximation:"high",
							units:(data['seriesType'+i]!='column' ? fbobj.highchartsSeriesUnits:undefined)
						},
						states: {	
							hover: {
								enabled: true,
								lineWidth: data['serieshoverlinewidth'+ i] || 1,
							}
						},
						pointInterval:10000

					});
					
					j++;
				}
			}
									
			
			var plotLines=[];
			if (data.target) {
				plotLines.push ({color:"#33FF50",dashStyle:"Solid",label:data.targetName || 'Target',value:parseFloat(data.target),width:2});
			}

			
			function loadSeriesData (start,end,callback) {
				console.log ('resize chart to ' + new Date (start) + ' - ' + new Date (end));
				loadWaiting=false;
				if (start && end){
					loadRunning=true;
					var virtualStart=start;
					var virtualEnd=end;
					console.log ('virtual chart size ' + new Date (virtualStart) + ' - ' + new Date (virtualEnd));

					chart.showLoading();
					window.setTimeout(function (){ 
						loadSeriesRange(chart,oidList,0,data.normalizeDate,start,end,virtualStart,virtualEnd,function () {
							chart.redraw();
							chart.hideLoading();
							loadRunning=false;
							if (callback) callback();
						});
					},10);
				}
			};
			
			
			/**
			 * Load new data depending on the selected min and max
			 */
			if (fbobj.delayedRefreshHandler[widgetID]) window.clearInterval(fbobj.delayedRefreshHandler[widgetID]);						
			fbobj.delayedRefreshHandler[widgetID]=window.setInterval( function () {
				if (loadRunning==false && refreshRequired==true) {
   				   refreshRequired=false;
  				   console.log ('Process event ' + new Date (lastEvent.min) + ' - ' + new Date (lastEvent.max));				   
				   loadSeriesData (lastEvent.min,lastEvent.max);
				   
				} 	
			},500);

			function afterSetExtremes(event) {
				console.log ('afterSetExtremes event ' + new Date (event.min) + ' - ' + new Date (event.max)+ ' - ' + event.trigger);
				if (event.trigger!=undefined){
					if (!loadRunning) {
						loadSeriesData (event.min,event.max);
					} else {
						lastEvent=event;
						console.log ('Save event ' + new Date (event.min) + ' - ' + new Date (event.max));

						refreshRequired=true;
					}
				}
			}
			
			function setExtremes(event) {
				console.log ('setExtremes event ' + new Date (event.min) + ' - ' + new Date (event.max)+ ' - ' + event.trigger);
			}
			
			
			if (vis.language === 'de') Highcharts.setOptions(fbobj.highchartsOptions);
			var yAxis = [{
					labels: {
						formatter: function () {
							return this.value + (data.unit1 ? ' ' + data.unit1 : '')
						},
						align: 'left',
						x: 1
					},
					title: {
						text: data.xAxisLabel1
					},
					height: (data.chart1Height? data.chart1Height+'%':'20%'),
					lineWidth: 1,
					resize: {
						enabled: true
					},
					categories:(data.yAxis1Categories? JSON.parse (data.yAxis1Categories): undefined),
					offset: 0,
					min: (data.yAxis1min?parseFloat(data.yAxis1min):undefined),
					max: (data.yAxis1max?parseFloat(data.yAxis1max):undefined),
					tickAmount: (data.yAxis1tickamount?data.yAxis1tickamount:undefined),
					minorTicks: true,
					startOnTick:false					
				}];
			if (data.chart2enabled!=false){
				yAxis.push({
					labels: {
						formatter: function () {
							return this.value + (data.unit2 ? ' ' + data.unit2 : '');
						},
						align: 'left',
						x: 1

					},
					title: {
						text: data.xAxisLabel2
					},
					top: (data.chart1Height? (parseFloat(data.chart1Height) + (data.chartspacing? parseFloat(data.chartspacing) :5)) +'%':( 20 + (data.chartspacing? parseFloat(data.chartspacing) :5))+'%'),
					height: (data.chart2Height? data.chart2Height+'%':'40%'),
					lineWidth: 2,
					resize: {
						enabled: true
					},
					categories:(data.yAxis2Categories? JSON.parse (data.yAxis2Categories): undefined),
					offset: 0,
					plotLines:plotLines,
					min: (data.yAxis2min?parseFloat(data.yAxis2min):undefined),
					max: (data.yAxis2max?parseFloat(data.yAxis2max):undefined),
					tickAmount: (data.yAxis2tickamount?data.yAxis2tickamount:undefined),
					minorTicks: true
		
				});
			};
			if (data.chart3enabled!=false){
				yAxis.push({
					labels: {
						formatter: function () {
							return this.value + (data.unit3 ? ' ' + data.unit3 : '')
						},
						align: 'left',
						x: 1
					},
					title: {
						text: data.xAxisLabel3
					},
					categories:(data.yAxis3Categories? JSON.parse (data.yAxis3Categories): undefined),
					top: ((data.chart1Height? parseFloat(data.chart1Height) + (data.chartspacing? parseFloat(data.chartspacing) :5):20 + (data.chartspacing? parseFloat(data.chartspacing) :5)) + (data.chart2Height? parseFloat(data.chart2Height) + (data.chartspacing? parseFloat(data.chartspacing) :5):40 + (data.chartspacing? parseFloat(data.chartspacing) :5)))+'%' ,
					height: (data.chart3Height? data.chart3Height+'%':'30%'),
					offset: 0,
					lineWidth: 2,
					min: (data.yAxis3min?parseFloat(data.yAxis3min):undefined),
					max: (data.yAxis3max?parseFloat(data.yAxis3max):undefined),
					tickAmount: (data.yAxis3tickamount?data.yAxis3tickamount:undefined),
					minorTicks: true
				});	
			};
			
			chart = Highcharts.stockChart(divId + widgetID, {
				chart: {
					width: $div.width()-2,
					height: $div.height()-2,
					zoomType: 'x',
					renderTo: divId + widgetID,
					panning: true,
					panKey: 'shift'
				},
				title: {
					text: data.title
				},
				time:{
				   useUTC: false
				},
				rangeSelector: {
				  buttons: [{
						type: 'day',
						count: 1,
						text: '1 Tag',
						title: '1 Tag anzeigen'
					},{
						type: 'day',
						count: 3,
						text: '3 Tage',
						title: '3 Tage anzeigen'
					},{
						type: 'day',
						count: 7,
						text: '7 Tage',
						title: '7 Tage anzeigen'
					},{
						type: 'month',
						count: 1,
						text: '1M',
						title: '1 Monat anzeigen'
					}, {
						type: 'month',
						count: 3,
						text: '3M',
						title: '3 Monate anzeigen'
					}, {
						type: 'month',
						count: 6,
						text: '6M',
						title: '6 Monate anzeigen'
					}],
					allButtonsEnabled: true,
					dropdown:'always',
					height: 10,
					selected: zoomlevel[data.zoomDefault],
					inputDateFormat:'%e. %b %Y'
				},
				navigator: {
					adaptToUpdatedData:false,
					height: 20,
					margin: 10,
					series: [
						{
							data: null,
							dataGrouping: {
								enabled: true,
								approximation:"high",
								units:fbobj.highchartsSeriesUnits								
							},
							pointInterval:10000
						}							
					],
					xAxis:{
						ordinal: false
					},
				},
				scrollbar: {
					enabled: false
				},
				xAxis: {
					events: {
						afterSetExtremes: afterSetExtremes,
						setExtremes: setExtremes
					},
					ordinal: false,
					dateTimeLabelFormats: fbobj.highchartsDateTimeLabelFormats
				},
				
				yAxis: yAxis,

				plotOptions: {
				},
				legend: {
					enabled: data.showLegend,
					align: 'left',
					verticalAlign: 'top',
					x: 0,
					y: 20,
					floating: true           
				},
				exporting: {
					enabled: data.showMenu,
				},
				
				credits: {
				   enabled: false
				},
				tooltip: {
					pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b><br/>',
					valueDecimals: 2,
					split: true,
					followTouchMove:false,					
					dateTimeLabelFormats: fbobj.highchartsDateTimeLabelFormats				
				},

				series: seriesData
			});


			function updateSelector(id,instance,multiplicator,start,callback) {

				var option = {};
				var eventDate;
				var eventValue;
				option.start=start;
				option.instance  = instance;
				option.aggregate='minmax';
				//option.count=2000;
				option.limit=300;
				option.timeout=12000;
				vis.getHistory(id, option, function (err, res) {
					if (err && Object.keys(err).length > 0) console.error('Error Object: ' + JSON.stringify(err));
					if (!err && res) {
						console.log('got History data. Count:' + res.length);		
						for (var i = 0; i < res.length; i++) {
							eventDate=new Date (res[i].ts);
							eventValue=res[i].val * multiplicator;
							//console.log(id +' '+ new Date (res[i].ts)+ ' n ' + eventDate + ':' + res[i].val);
							if (res[i].val!=null){
								if (chart.navigator.series[0].data && chart.navigator.series[0].data.length>0 && chart.navigator.series[0].data [chart.navigator.series[0].data.length-1] && chart.navigator.series[0].data[chart.navigator.series[0].data.length-1].x==eventDate.getTime()){
									chart.navigator.series[0].data[chart.navigator.series[0].data.length-1].update(eventValue);
								} else {
									chart.navigator.series[0].addPoint ([eventDate.getTime(),eventValue]); 
								}
							}
						} 	
						// free memory
						res = null;
					}
					if (callback) callback();
				});
			};

		    function updateSeriesData (){
				console.log ('Start update chart');
				if (!chart){
					if (fbobj.updateIntervalHandler[widgetID]) {
						window.clearInterval(fbobj.updateIntervalHandler[widgetID]);
						fbobj.updateIntervalHandler[widgetID]=null;
					}
					return;
				}
				
				var oldExtremes=chart.xAxis[0].getExtremes();				
				var oldLastX=chart.navigator.xAxis.max;
				
				console.log ('Start UpdateSelector ' + new Date (oldLastX) + ' - ' + (new Date (oldExtremes.dataMax)));
				updateSelector(navigator.historyOID,navigator.instance,navigator.multiplicator,oldLastX+1,function (){
					if (chart.navigator.series[0].data.length>0 && chart.navigator.series[0].data[chart.navigator.series[0].data.length-1].x > oldLastX && oldExtremes.max > oldLastX-(10*60*1000)){
						var newMaxX=chart.navigator.xAxis.max;
						chart.xAxis[0].setExtremes(oldExtremes.min+newMaxX-oldExtremes.max,newMaxX, true, true, { trigger: 'zoom' });
					}
						
				});				
			};

		    function reloadSeriesData (){
				console.log ('Start reload chart');
				if (!chart){
					if (fbobj.reloadIntervalHandler[widgetID]) {
						window.clearInterval(fbobj.reloadIntervalHandler[widgetID]);
						fbobj.reloadIntervalHandler[widgetID]=null;
					}
					return;
				}
				
				var oldExtremes=chart.xAxis[0].getExtremes();				
				var oldLastX=chart.navigator.xAxis.max;
				navigationData=[];
				loadSelectorData (navigationData,navigator.historyOID,navigator.instance,null,navigator.multiplicator,'no',(data.navigatorRange? parseInt (data.navigatorRange): 3), function (){				
					chart.navigator.series[0].setData (navigationData);				
					var newMaxX=chart.navigator.xAxis.max;
					chart.xAxis[0].setExtremes(oldExtremes.min+newMaxX-oldExtremes.max,newMaxX, true, true, { trigger: 'zoom' });

				});
			};


			window.setTimeout(function (){
				loadSelectorData (navigationData,navigator.historyOID,navigator.instance,null,navigator.multiplicator,'no',(data.navigatorRange? parseInt (data.navigatorRange): 3), function (){				
				
					chart.navigator.series[0].setData (navigationData);				
					chart.navigator.series[0].xAxis.min=navigationData[0][0];
					var startDate=new Date ();
					startDate.setUTCMilliseconds(0);
					startDate.setUTCSeconds(0);	
					if (data.zoomDefault=="1d"){
					   startDate.setDate (startDate.getDate()-1);
					} else if (data.zoomDefault=="3d"){
					   startDate.setDate (startDate.getDate()-3);
					} else if (data.zoomDefault=="7d"){
					   startDate.setDate (startDate.getDate()-7);					   
					} else if (data.zoomDefault=="1m"){
						startDate.setUTCMinutes(0);
						startDate.setUTCHours(0);		
						startDate.setUTCMonth (startDate.getMonth()-1);
					} else if (data.zoomDefault=="3m"){
						startDate.setUTCMinutes(0);
						startDate.setUTCHours(0);		
						startDate.setUTCMonth (startDate.getMonth()-3);
					} else if (data.zoomDefault=="6m"){
						startDate.setUTCMinutes(0);
						startDate.setUTCHours(0);		
						startDate.setUTCMonth (startDate.getMonth()-6);					
					}
					loadSeriesData (startDate.getTime(),new Date ().getTime(),function (){
						if (fbobj.updateIntervalHandler[widgetID]) window.clearInterval(fbobj.updateIntervalHandler[widgetID]);
						if (fbobj.reloadIntervalHandler[widgetID]) window.clearInterval(fbobj.reloadIntervalHandler[widgetID]);
						
						//add mouse wheel support
						var zoomRatio = 0;
						var lastX;
						var lastY;


						$('#'+ divId + widgetID).mousewheel(function(objEvent, intDelta) {
							if (intDelta > 0) {
								zoomRatio = -1 * fbobj.scrollspeed;
								setZoom();
							}
							else if (intDelta < 0) {
								zoomRatio = fbobj.scrollspeed;
								setZoom();
							}
						});

						var setZoom = function() {

							var xMin = chart.xAxis[0].getExtremes().dataMin;
							var xMax = chart.xAxis[0].getExtremes().dataMax;
							var absMin = minDate;
							var absMax = new Date ().getTime();
						   
							chart.xAxis[0].setExtremes(Math.max (absMin ,xMin - zoomRatio * (xMax-xMin)), Math.min (absMax, xMax + zoomRatio * (xMax-xMin)), true, true, { trigger: 'zoom' });
						}

						
						fbobj.updateIntervalHandler[widgetID]=window.setInterval(function () {
						   updateSeriesData ();
						}, 30000);
						
						if (data.autoreload>0){
							fbobj.updateIntervalHandler[widgetID]=window.setInterval(function () {
								reloadSeriesData ();
							}, data.autoreload * 60000);
						}
					});				
				});
			},10);	
		},


		createTimeseries3Widget: function (widgetID, view, data, style) {
			var seriesData = [];
			var oidList = [];
			var targetArray = null;
			var divId = 'chart_placeholder';
			var chart = null;
			var fbobj=this;
			var loadRunning=false;
			var loadWaiting=false;
			var refreshRequired=false;
			var lastEvent=null;			
			var zoomlevel ={"1d":0,"3d":1,"7d":2,"1m":3,"3m":4,"6m":5};
			
			console.log(' photovoltaikcharts: Create Timeseries3 Widget');
		
			var $div = $('#' + widgetID);
			// if nothing found => wait
			if (!$div.length) {
				return setTimeout(function () {
					fbobj.createTimeseries3Widget(widgetID, view, data, style);
				}, 100);
			}
			console.log ("Initialize Chart Widget #" + widgetID );
			var systemLang = 'en';
			if (typeof sysLang !== 'undefined') {
				systemLang = sysLang || 'en';
			}
			
			var unit=data.unit;


			
			oidList =[];
			seriesData=[];
			var j=0;
			var i;
			var label;
			
			for (i=1;i<=data.seriesCount;i++){
				if (data['serieshistoryoid'+i] && data ['instance'+ i ]){
					label=data['serieslabel'+i];				
					oidList.push ({id:j, historyOID:data['serieshistoryoid'+i],instance:data ['instance'+ i ],multiplicator:parseFloat(data ['multiplicator'+ i ]) || 1,lastX:0 });
					
					seriesData.push ({
						name: label,
						data: [],
						color: data['seriescolor'+i] || '#FF5A33',
						lineWidth: data['serieslinewidth'+i] || 1,
						fillOpacity: (data['seriesopacity'+i]? parseFloat(data['seriesopacity'+i])/100 : 0.3),
						type: data['seriesType'+i] || 'areaspline',
						step: (data['seriesstep'+i] && data['seriesstep'+i]!='no'? data['seriesstep'+i] : undefined),
						stacking: (data['seriesstacking'+i] && data['seriesstacking'+i]!='no'  ? data['seriesstacking'+i] : undefined),
						dataGrouping: {
							enabled: (data['seriesType'+i]!='column' ? true: false),
							approximation:"high",
							units:(data['seriesType'+i]!='column' ? fbobj.highchartsSeriesUnits:undefined)
						},
						states: {	
							hover: {
								enabled: true,
								lineWidth: data['serieshoverlinewidth'+i] || 1,
							}
						},
						pointInterval:10000

					});
					
					j++;
				}
			}
				
			
			var plotLines=[];
			if (data.target) {
				plotLines.push ({color:"#33FF50",dashStyle:"Solid",label:data.targetName || 'Target',value:parseFloat(data.target),width:2});
			}

			
			function loadSeriesData (start,end,callback) {
				console.log ('resize chart to ' + new Date (start) + ' - ' + new Date (end));
				// chart.series[0].setData(data);
				loadWaiting=false;
				if (start && end){
					loadRunning=true;
					var virtualStart=start;
					var virtualEnd=end;

					chart.showLoading();
					window.setTimeout(function (){ 
						loadSeriesRange(chart,oidList,0,data.normalizeDate,start,end,virtualStart,virtualEnd,function () {
							//chart.xAxis.min =start;
							//chart.xAxis.max=end;
							chart.redraw();
							chart.hideLoading();
							loadRunning=false;
							if (callback) callback();
						});
					},10);
				}
			};

			function addSeriesData (start,end,callback) {
				console.log ('load and add new Data for ' + new Date (start) + ' - ' + new Date (end));
				if (start && end){
					window.setTimeout(function (){ 
						loadAndAddSeriesRange(chart,oidList,0,data.normalizeDate,start,end,start,function (newMax) {
							if (callback) callback(newMax);
						});
					},10);
				}
			};

						
			/**
			 * Load new data depending on the selected min and max
			 */
			if (fbobj.delayedRefreshHandler[widgetID]) window.clearInterval(fbobj.delayedRefreshHandler[widgetID]);						
			fbobj.delayedRefreshHandler[widgetID]=window.setInterval( function () {
				if (loadRunning==false && refreshRequired==true) {
   				   refreshRequired=false;
  				   console.log ('Process event ' + new Date (lastEvent.min) + ' - ' + new Date (lastEvent.max));				   
				   loadSeriesData (lastEvent.min,lastEvent.max);
				   
				} 	
			},500);

			function afterSetExtremes(event) {
				console.log ('afterSetExtremes event ' + new Date (event.min) + ' - ' + new Date (event.max)+ ' - ' + event.trigger);
				if (event.trigger!=undefined){
					if (!loadRunning) {
						loadSeriesData (event.min,event.max);
					} else {
						lastEvent=event;
						console.log ('Save event ' + new Date (event.min) + ' - ' + new Date (event.max));

						refreshRequired=true;
					}
				}
			}
			
			function setExtremes(event) {
				console.log ('setExtremes event ' + new Date (event.min) + ' - ' + new Date (event.max)+ ' - ' + event.trigger);
			}
			
								
			
			if (vis.language === 'de')Highcharts.setOptions(fbobj.highchartsOptions);
			var help= vis.states[data.serieshistoryoid1];
			chart = new Highcharts.stockChart(divId + widgetID, {
				chart: {
					width: $div.width()-2,
					height: $div.height()-2,
					zoomType: 'x',
					panning: true,
					panKey: 'shift',
					renderTo: divId + widgetID,
					backgroundColor: 'rgba(255,255,255,0)'
				},
				title: {
					text: data.title
				},
				time:{
				   useUTC: false
				},
				rangeSelector: {
				  enabled: false,
				  buttons: [{
						type: 'day',
						count: 1,
						text: '1 Tag',
						title: '1 Tag anzeigen'
					},{
						type: 'day',
						count: 3,
						text: '3 Tage',
						title: '3 Tage anzeigen'
					},{
						type: 'day',
						count: 7,
						text: '7 Tage',
						title: '7 Tage anzeigen'
					},{
						type: 'month',
						count: 1,
						text: '1M',
						title: '1 Monat anzeigen'
					}, {
						type: 'month',
						count: 3,
						text: '3M',
						title: '3 Monate anzeigen'
					}, {
						type: 'month',
						count: 6,
						text: '6M',
						title: '6 Monate anzeigen'
					}],
					allButtonsEnabled: true,
					dropdown:'always',
					height: 10,
					inputDateFormat:'%e. %b %Y'
				},
				navigator: {
					enabled:false,
					series: [
						{
							data: null,
							dataGrouping: {
								enabled: true,
								approximation:"high",
								units:fbobj.highchartsSeriesUnits								
							},
							pointInterval:10000
						}							
					],
					xAxis:{
						ordinal: false
					},
				},
				scrollbar: {
					enabled: false
				},
				xAxis: {
					events: {
						afterSetExtremes: afterSetExtremes,
						setExtremes: setExtremes,
					},
					ordinal: false,
					dateTimeLabelFormats: fbobj.highchartsDateTimeLabelFormats
					//overscroll: 10000					
				},
				
				yAxis: [{
					labels: {
						formatter: function () {
							return this.value + (unit ? ' ' + unit : '');
						},
						align: 'left',
						x: 1

					},
					lineWidth: 2,
					offset: 0,
					categories:(data.yAxis1Categories? JSON.parse (data.yAxis1Categories): undefined),
					min: (data.yAxis1min?parseFloat(data.yAxis1min):undefined),
					max: (data.yAxis1max?parseFloat(data.yAxis1max):undefined),
					tickAmount: (data.yAxis1tickamount?data.yAxis1tickamount:undefined),
					minorTicks: true,
					startOnTick:false
		
				}
				],

				plotOptions: {
				},
				legend: {
					enabled: data.showLegend,
					align: 'left',
					verticalAlign: 'top',
					x: 0,
					y: 2,
					floating: true           
				},
				exporting: {
					enabled: data.showMenu,
				},
				
				credits: {
				   enabled: false
				},
				tooltip: {
					pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b><br/>',
					valueDecimals: 2,
					split: true,
					followTouchMove:false,					
					dateTimeLabelFormats: fbobj.highchartsDateTimeLabelFormats					
				},

				series: seriesData
			});



		    function updateSeriesData (){
				console.log ('Start update chart');
				if (!chart){
					if (fbobj.updateIntervalHandler[widgetID]) {
						window.clearInterval(fbobj.updateIntervalHandler[widgetID]);
						fbobj.updateIntervalHandler[widgetID]=null;
					}
					return;
				}
				
				var oldExtremes=chart.xAxis[0].getExtremes();				
				if (loadRunning==false && (new Date()).getTime()-(10*60*1000)< oldExtremes.max){
					
					addSeriesData (oldExtremes.dataMax,(new Date()).getTime(),function (newMax){
								 								
						chart.xAxis[0].setExtremes(oldExtremes.dataMin + newMax - oldExtremes.dataMax ,newMax);
						console.log ('Updated chart data to ' + new Date (oldExtremes.dataMin + newMax - oldExtremes.dataMax) + ' - ' + new Date (newMax));
					});
				}
				
			};


			window.setTimeout(function (){				
				var startDate=new Date ();
				startDate.setUTCMilliseconds(0);
				startDate.setUTCSeconds(0);	
				if (data.zoomoid && vis.states[data.zoomoid + '.val']) {
					console.log ('use range info from zoomid:' + vis.states[data.zoomoid + '.val'] + ' type ' + typeof vis.states[data.zoomoid + '.val']);
					startDate=new Date ((new Date ()).getTime() - (vis.states[data.zoomoid + '.val']*1000));
				} else {
					if (data.zoomDefault=="1d"){
					   startDate.setDate (startDate.getDate()-1);
					} else if (data.zoomDefault=="3d"){
					   startDate.setDate (startDate.getDate()-3);
					} else if (data.zoomDefault=="7d"){
					   startDate.setDate (startDate.getDate()-7);					   
					} else if (data.zoomDefault=="1m"){
						startDate.setUTCMinutes(0);
						startDate.setUTCHours(0);		
						startDate.setUTCMonth (startDate.getMonth()-1);
					} else if (data.zoomDefault=="3m"){
						startDate.setUTCMinutes(0);
						startDate.setUTCHours(0);		
						startDate.setUTCMonth (startDate.getMonth()-3);
					} else if (data.zoomDefault=="6m"){
						startDate.setUTCMinutes(0);
						startDate.setUTCHours(0);		
						startDate.setUTCMonth (startDate.getMonth()-6);					
					}
				}
				loadSeriesData (startDate.getTime(),new Date ().getTime(),function (){
					chart.xAxis[0].allowZoomOutside = true;
				
					//add mouse wheel support
					var zoomRatio = 0;
					var lastX;
					var lastY;


					$('#'+ divId + widgetID).mousewheel(function(objEvent, intDelta) {
						if (intDelta > 0) {
							zoomRatio = -1 * fbobj.scrollspeed;
							setZoom();
						}
						else if (intDelta < 0) {
							zoomRatio = fbobj.scrollspeed;
							setZoom();
						}
					});

					var setZoom = function() {

						var xMin = chart.xAxis[0].getExtremes().dataMin;
						var xMax = chart.xAxis[0].getExtremes().dataMax;
						var absMin = minDate;
						var absMax = new Date ().getTime();
					   
						chart.xAxis[0].setExtremes(Math.max (absMin ,xMin - zoomRatio * (xMax-xMin)), Math.min (absMax, xMax + zoomRatio * (xMax-xMin)), true, true, { trigger: 'zoom' });
					}

										
					if (fbobj.updateIntervalHandler[widgetID]) window.clearInterval(fbobj.updateIntervalHandler[widgetID]);
					fbobj.updateIntervalHandler[widgetID]=window.setInterval(function () {
					   updateSeriesData ();
					}, 30000);
				});
				
				
			},10);	
			
			
			function onChangeZoom(e, newVal, oldVal) {
				console.log ('Change zoom');			
				if (!chart || newVal==oldVal) {
					return;
				}
				if (data.zoomoid && vis.states[data.zoomoid + '.val']) {
					var currentExtremes=chart.xAxis[0].getExtremes();					
					var startDate=new Date ((new Date (currentExtremes.dataMax)).getTime() - (newVal*1000));
					chart.xAxis[0].setExtremes(startDate.getTime(), currentExtremes.dataMax, true, true, { trigger: 'zoom' });	
				}
			};
			
			if (data.zoomoid) {
				console.log ('register on changes for ' + data.zoomoid);
				vis.states.bind(data.zoomoid + '.val', onChangeZoom);
				$div.data('bound', [data.zoomoid + '.val']);
				$div.data('bindHandler', onChangeZoom);
			}	
			
		}

	};
	

	vis.binds.photovoltaikcharts.showVersion();		