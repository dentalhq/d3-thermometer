"use strict";


function Thermometer(config) {
	this._config = config || Thermometer.defaults;
}


Thermometer.defaults = {
	width: 80,
	height: 160,
	mercuryColor: "rgb(230, 0, 0)",
	bulbShineColor: "rgb(230, 200, 200)",
	borderColor: "rgb(136, 136, 136)",
	borderWidth: 1,
	backgroundColor: "rgb(255, 255, 255)",
	bulbRadius: 18,
	tubeWidth: 18.5
};

Thermometer.classPrefix = 'thermometer';


Thermometer._createCssClass = function() {
	var className = Thermometer.classPrefix,
		n = arguments.length,
		i = 0;
	while (i < n) {
		className += ("-" + arguments[i++]);
	}
	return className;
};


Thermometer.prototype.render = function(container, currentTemp, minTemp, maxTemp) {

	var bottomY = this._config.height - 5,
		topY = 5;

	this._dim = {
		bottomY: bottomY,
		topCy: topY + this._config.tubeWidth / 2,
		topY: topY + this._config.tubeWidth / 2,
		bulbCx: this._config.width / 2,
		bulbCy: bottomY - this._config.bulbRadius
	};

	this._value = {
		current: currentTemp,
		min: minTemp,
		max: maxTemp
	};

	d3.select(container)
		.select("svg")
		.remove();

	this._svg = d3.select(container)
		.append("svg")
		.attr("width", this._config.width)
		.attr("height", this._config.height);

	this._defineBulbGradient();
	this._renderTube();
	this._initAxis();
	this._renderExtremes();
	this._renderMercury();
	this._renderAxis();

};


Thermometer.prototype.destroy = function() {
	var svg = this._svg.node();
	svg.parentNode.removeChild(svg);
};


Thermometer.prototype.setMaxValue = function(value) {
	this._value.max = value;
	this._update();

};


Thermometer.prototype.setMinValue = function(value) {
	this._value.min = value;
	this._update();
};


Thermometer.prototype.setCurrentValue = function(value) {
	this._value.current = value;

	if (value < this._value.min) {
		this.setMinValue(value);
	} else if (value > this._value.max) {
		this.setMaxValue(value);
	} else {
		this._adjustMercuryHeight();
	}
};


Thermometer.prototype._update = function() {
	this._initAxis();
	this._svg.select(Thermometer._createCssClass("temperature", "axis")).remove();
	this._renderAxis();
	this._updateMinimumMark();
	this._updateMaximumMark();
	this._adjustMercuryHeight();
};


Thermometer.prototype._adjustMercuryHeight = function() {
	var tubeFill_bottom = this._dim.bulbCy,
		tubeFill_top = this._axisData.scale(this._value.current);

	// Rect element for the red mercury column
	this._svg
		.select("." + Thermometer._createCssClass("mercury", "column"))
		.attr("y", tubeFill_top)
		.attr("height", tubeFill_bottom - tubeFill_top);
};


Thermometer.prototype._updateMinimumMark = function() {
	this._svg
		.select("." + Thermometer._createCssClass("min", "line"))
		.attr("y1", this._axisData.scale(this._value.min))
		.attr("y2", this._axisData.scale(this._value.min));

	// Max temperature value
	this._svg
		.select("." + Thermometer._createCssClass("min", "label"))
		.attr("y", this._axisData.scale(this._value.min) + 4);
};


Thermometer.prototype._updateMaximumMark = function() {
	this._svg
		.select("." + Thermometer._createCssClass("max", "line"))
		.attr("y1", this._axisData.scale(this._value.max))
		.attr("y2", this._axisData.scale(this._value.max));

	// Max temperature value
	this._svg
		.select("." + Thermometer._createCssClass("max", "label"))
		.attr("y", this._axisData.scale(this._value.max) - 4);
};


Thermometer.prototype._initAxis = function() {
	var step = 5;

	// Determine a suitable range of the temperature scale
	var domain = [
		step * Math.floor(this._value.min / step),
		step * Math.ceil(this._value.max / step)
	];

	if (Thermometer._exceedsMinThreshold(this._value.min, domain[0], step)) {
		domain[0] -= step;
	}

	if (Thermometer._exceedsMaxThreshold(this._value.max, domain[1], step)) {
		domain[1] += step;
	}

	// Values to use along the scale ticks up the thermometer
	var ticksAt = d3.range((domain[1] - domain[0]) / step + 1).map(function (v) {
		return domain[0] + v * step;
	});

	var scale = d3.scale.linear()
		.range([
			this._dim.bulbCy - this._config.bulbRadius / 2 - 8.5,
			this._dim.topCy
		])
		.domain(domain);

	this._axisData = {
		step: step,
		domain: domain,
		tickValues: ticksAt,
		scale: scale
	};
};


Thermometer.prototype._renderAxis = function() {
	var className = Thermometer._createCssClass("temperature", "axis");

	var axis = d3.svg.axis()
		.scale(this._axisData.scale)
		.innerTickSize(7)
		.outerTickSize(0)
		.tickValues(this._axisData.tickValues)
		.orient("left");

	// remove any old axis
	this._svg
		.select("." + className)
		.remove();

	// Add the axis to the image
	var svgAxis = this._svg.append("g")
		.attr("class", className)
		.attr("transform", "translate(" + (this._config.width / 2 - this._config.tubeWidth / 2) + ",0)")
		.call(axis);

	// Format text labels
	svgAxis.selectAll(".tick text")
		.style("fill", "#777777")
		.style("font-size", "10px");

	// Set main axis line to no stroke or fill
	svgAxis.select("path")
		.style("stroke", "none")
		.style("fill", "none");

	// Set the style of the ticks
	svgAxis.selectAll(".tick line")
		.style("stroke", this._config.borderColor)
		.style("shape-rendering", "crispEdges")
		.style("stroke-width", this._config.borderWidth + "px");
};


Thermometer.prototype._renderExtremes = function() {
	// Max and min temperature lines
	[this._value.min, this._value.max].forEach(function (t) {

		var isMax = t === this._value.max,
			label = (isMax ? "max" : "min"),
			textCol = (isMax ? "rgb(230, 0, 0)" : "rgb(0, 0, 230)"),
			textOffset = (isMax ? -4 : 4);

		this._svg
			.append("line")
			.attr("class", Thermometer._createCssClass(label, "line"))
			.attr("x1", this._config.width / 2 - this._config.tubeWidth / 2)
			.attr("x2", this._config.width / 2 + this._config.tubeWidth / 2 + 22)
			.attr("y1", this._axisData.scale(t))
			.attr("y2", this._axisData.scale(t))
			.style("stroke", this._config.borderColor)
			.style("stroke-width", this._config.borderWidth + "px")
			.style("shape-rendering", "crispEdges");

		this._svg
			.append("text")
			.attr("class", Thermometer._createCssClass(label, "label"))
			.attr("x", this._config.width / 2 + this._config.tubeWidth / 2 + 2)
			.attr("y", this._axisData.scale(t) + textOffset)
			.attr("dy", isMax ? null : "0.72em")
			.text(label)
			.style("fill", textCol)
			.style("font-size", "10px");

	}, this);
};


Thermometer.prototype._renderMercury = function() {
	var tubeFill_bottom = this._dim.bulbCy,
		tubeFill_top = this._axisData.scale(this._value.current);

	// Rect element for the red mercury column
	this._svg
		.append("rect")
		.attr("class", Thermometer._createCssClass("mercury", "column"))
		.attr("x", this._config.width / 2 - (this._config.tubeWidth - 8) / 2)
		.attr("y", tubeFill_top)
		.attr("width", this._config.tubeWidth - 8)
		.attr("height", tubeFill_bottom - tubeFill_top)
		.style("shape-rendering", "crispEdges")
		.style("fill", this._config.mercuryColor);


	// Main thermometer bulb fill
	this._svg
		.append("circle")
		.attr("r", this._config.bulbRadius - 5)
		.attr("cx", this._dim.bulbCx)
		.attr("cy", this._dim.bulbCy)
		.style("fill", "url(#" + Thermometer.classPrefix + "-bulb-gradient)")
		.style("stroke", this._config.mercuryColor)
		.style("stroke-width", "2px");
};


Thermometer.prototype._defineBulbGradient = function() {
	var defs = this._svg.append("defs");

	// Define the radial gradient for the bulb fill colour
	var bulbGradient = defs.append("radialGradient")
		.attr("id", Thermometer.classPrefix + "-bulb-gradient")
		.attr("cx", "50%")
		.attr("cy", "50%")
		.attr("r", "50%")
		.attr("fx", "50%")
		.attr("fy", "50%");

	bulbGradient.append("stop")
		.attr("offset", "0%")
		.style("stop-color", this._config.bulbShineColor);

	bulbGradient.append("stop")
		.attr("offset", "90%")
		.style("stop-color", this._config.mercuryColor);
};


Thermometer.prototype._renderTube = function() {
	// Circle element for rounded tube top
	this._svg
		.append("circle")
		.attr("r", this._config.tubeWidth / 2)
		.attr("cx", this._config.width / 2)
		.attr("cy", this._dim.topCy)
		.style("fill", this._config.backgroundColor)
		.style("stroke", this._config.borderColor)
		.style("stroke-width", this._config.borderWidth + "px");


	// Rect element for tube
	this._svg
		.append("rect")
		.attr("x", this._config.width / 2 - this._config.tubeWidth / 2)
		.attr("y", this._dim.topCy)
		.attr("height", this._dim.bulbCy - this._dim.topCy)
		.attr("width", this._config.tubeWidth)
		.style("shape-rendering", "crispEdges")
		.style("fill", this._config.backgroundColor)
		.style("stroke", this._config.borderColor)
		.style("stroke-width", this._config.borderWidth + "px");


	// White fill for rounded tube top circle element
	// to hide the border at the top of the tube rect element
	this._svg
		.append("circle")
		.attr("r", this._config.tubeWidth / 2 - this._config.borderWidth / 2)
		.attr("cx", this._config.width / 2)
		.attr("cy", this._dim.topCy)
		.style("fill", this._config.backgroundColor)
		.style("stroke", "none");


	// Main bulb of thermometer (empty), white fill
	this._svg
		.append("circle")
		.attr("r", this._config.bulbRadius)
		.attr("cx", this._dim.bulbCx)
		.attr("cy", this._dim.bulbCy)
		.style("fill", this._config.backgroundColor)
		.style("stroke", this._config.borderColor)
		.style("stroke-width", this._config.borderColor + "px");


	// Another rect element for empty tube (white fill)
	// to cover over the top border of the main bulb circle.
	this._svg
		.append("rect")
		.attr("x", this._config.width / 2 - (this._config.tubeWidth - this._config.borderWidth) / 2)
		.attr("y", this._dim.topCy)
		.attr("height", this._dim.bulbCy - this._dim.topCy)
		.attr("width", this._config.tubeWidth - this._config.borderWidth)
		.style("shape-rendering", "crispEdges")
		.style("fill", this._config.backgroundColor)
		.style("stroke", "none");
};


Thermometer._exceedsMinThreshold = function(value, min, step) {
	return value - min < 0.66 * step;
};

Thermometer._exceedsMaxThreshold = function(value, max, step) {
	return max - value < 0.66 * step;
};