// Configuration
const margin = { top: 60, right: 30, bottom: 80, left: 70 };
const width  = 900 - margin.left - margin.right;
const height = 500 - margin.top  - margin.bottom;

const metrics = {
    TMAX: "Avg Max Temperature (°F)",
    TMIN: "Avg Min Temperature (°F)",
    TAVG: "Avg Temperature (°F)",
    PRCP: "Avg Precipitation (in)",
    SNOW: "Avg Snowfall (in)"
};

// SVG Setup
const svg = d3.select("#chart")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip
const tooltip = d3.select("body")
    .append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("border", "1px solid #ccc")
    .style("padding", "8px 12px")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("font-size", "13px")
    .style("opacity", 0);

// Axes & Labels (created once, updated on metric change)
const xAxisG = svg.append("g").attr("transform", `translate(0,${height})`);
const yAxisG = svg.append("g");

const yLabel = svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -55)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .attr("fill", "#555");

svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 55)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .attr("fill", "#555")
    .text("State");

// Load Data & Draw
d3.csv("weather_trimmed.csv").then(data => {

    // Convert numeric columns
    data.forEach(d => {
        ["TMIN", "TMAX", "TAVG", "AWND", "WSF5", "SNOW", "SNWD", "PRCP"].forEach(col => {
            d[col] = d[col] === "" ? null : +d[col];
        });
    });

    // Populate dropdown
    const select = d3.select("#metricSelect");
    Object.entries(metrics).forEach(([key, label]) => {
        select.append("option").attr("value", key).text(label);
    });

    // Initial draw
    update("TMAX");

    // Redraw on dropdown change
    select.on("change", function () {
        update(this.value);
    });

        // Update function
    function update(metric) {

        // Aggregate: average metric per state (skip nulls)
        const byState = d3.rollups(
            data.filter(d => d[metric] !== null),
            v => d3.mean(v, d => d[metric]),
            d => d.state
        ).map(([state, value]) => ({ state, value }))
         .sort((a, b) => d3.ascending(a.state, b.state));

        // Scales
        const x = d3.scaleBand()
            .domain(byState.map(d => d.state))
            .range([0, width])
            .padding(0.25);

        const y = d3.scaleLinear()
            .domain([0, d3.max(byState, d => d.value) * 1.1])
            .range([height, 0]);

        // Axes
        xAxisG.transition().duration(500)
            .call(d3.axisBottom(x));

        yAxisG.transition().duration(500)
            .call(d3.axisLeft(y).ticks(6));

        yLabel.text(metrics[metric]);

        // Bars
        const bars = svg.selectAll(".bar")
            .data(byState, d => d.state);

        bars.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("y", height)
            .attr("height", 0)
            .attr("fill", "#4a90d9")
            .attr("rx", 3)
            .merge(bars)
            .on("mouseover", function (event, d) {
                d3.select(this).attr("fill", "#2c5f8a");
                tooltip
                    .style("opacity", 1)
                    .html(`<strong>${d.state}</strong><br>${metrics[metric]}: ${d.value.toFixed(2)}`);
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", (event.pageX + 12) + "px")
                    .style("top",  (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                d3.select(this).attr("fill", "#4a90d9");
                tooltip.style("opacity", 0);
            })
            .transition().duration(500)
            .attr("x", d => x(d.state))
            .attr("width", x.bandwidth())
            .attr("y", d => y(d.value))
            .attr("height", d => height - y(d.value));

        bars.exit().remove();
    }
});