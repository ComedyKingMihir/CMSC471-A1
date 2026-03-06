// Configuration
const margin = { top: 60, right: 30, bottom: 80, left: 70 };
const width  = 900 - margin.left - margin.right;
const height = 500 - margin.top  - margin.bottom;

const margin2 = { top: 40, right: 30, bottom: 60, left: 70 };
const height2 = 300 - margin2.top - margin2.bottom;

const metrics = {
    TMAX: "Avg Max Temperature (°F)",
    TMIN: "Avg Min Temperature (°F)",
    TAVG: "Avg Temperature (°F)",
    PRCP: "Avg Precipitation (in)",
    SNOW: "Avg Snowfall (in)"
};

// Track currently selected state
let selectedState = null;

// Bar chart SVG
const svg = d3.select("#chart")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Line chart SVG
const svg2 = d3.select("#chart2")
    .attr("width",  width  + margin2.left + margin2.right)
    .attr("height", height2 + margin2.top  + margin2.bottom)
    .append("g")
    .attr("transform", `translate(${margin2.left},${margin2.top})`);

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

// Bar chart axes & labels
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

// Click hint label
svg.append("text")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("fill", "#888")
    .attr("font-style", "italic")
    .text("Click a bar to explore weather over time");

// Line chart axes & labels
const xAxisG2 = svg2.append("g").attr("transform", `translate(0,${height2})`);
const yAxisG2 = svg2.append("g");

const lineTitle = svg2.append("text")
    .attr("x", width / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .attr("fill", "#333");

svg2.append("text")
    .attr("x", width / 2)
    .attr("y", height2 + 45)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .attr("fill", "#555")
    .text("Month");

const yLabel2 = svg2.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height2 / 2)
    .attr("y", -55)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .attr("fill", "#555");

// Load Data & Draw
d3.csv("weather_trimmed.csv").then(data => {

    // Parse dates and convert numeric columns
    const parseDate = d3.timeParse("%Y%m%d");
    data.forEach(d => {
        d.date = parseDate(d.date);
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
        if (selectedState) {
            drawLineChart(selectedState, this.value);
        }
    });

    // Bar chart update function
    function update(metric) {

        const byState = d3.rollups(
            data.filter(d => d[metric] !== null),
            v => d3.mean(v, d => d[metric]),
            d => d.state
        ).map(([state, value]) => ({ state, value }))
         .sort((a, b) => d3.ascending(a.state, b.state));

        const x = d3.scaleBand()
            .domain(byState.map(d => d.state))
            .range([0, width])
            .padding(0.25);

        const y = d3.scaleLinear()
            .domain([0, d3.max(byState, d => d.value) * 1.1])
            .range([height, 0]);

        xAxisG.transition().duration(500)
            .call(d3.axisBottom(x));

        yAxisG.transition().duration(500)
            .call(d3.axisLeft(y).ticks(6));

        yLabel.text(metrics[metric]);

        svg.selectAll(".bar").remove();

        svg.selectAll(".bar")
            .data(byState)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.state))
            .attr("width", x.bandwidth())
            .attr("y", d => y(d.value))
            .attr("height", d => height - y(d.value))
            .attr("fill", d => d.state === selectedState ? "#e07b39" : "#4a90d9")
            .attr("rx", 3)
            .style("cursor", "pointer")
            .on("mouseover", function (event, d) {
                if (d.state !== selectedState) d3.select(this).attr("fill", "#2c5f8a");
                tooltip
                    .style("opacity", 1)
                    .html(`<strong>${d.state}</strong><br>${metrics[metric]}: ${d.value.toFixed(2)}<br><em>Click to see over time</em>`);
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", (event.pageX + 12) + "px")
                    .style("top",  (event.pageY - 28) + "px");
            })
            .on("mouseout", function (event, d) {
                d3.select(this).attr("fill", d.state === selectedState ? "#e07b39" : "#4a90d9");
                tooltip.style("opacity", 0);
            })
            .on("click", function (event, d) {
                selectedState = d.state;
                svg.selectAll(".bar").attr("fill", "#4a90d9");
                d3.select(this).attr("fill", "#e07b39");
                drawLineChart(d.state, metric);
                d3.select("#chart2-section").style("display", "block");
            });
    }

    // Line chart draw function — raw data with tiny dots
    function drawLineChart(state, metric) {

        const stateData = data
            .filter(d => d.state === state && d[metric] !== null)
            .sort((a, b) => a.date - b.date);

        const x = d3.scaleTime()
            .domain(d3.extent(stateData, d => d.date))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(stateData, d => d[metric]) * 1.1])
            .range([height2, 0]);

        xAxisG2.transition().duration(500)
            .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b")));

        yAxisG2.transition().duration(500)
            .call(d3.axisLeft(y).ticks(5));

        yLabel2.text(metrics[metric]);
        lineTitle.text(`${metrics[metric]} Over Time — ${state}`);

        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d[metric]));

        svg2.selectAll(".line-path").remove();
        svg2.selectAll(".dot").remove();

        // Draw line
        svg2.append("path")
            .datum(stateData)
            .attr("class", "line-path")
            .attr("fill", "none")
            .attr("stroke", "#e07b39")
            .attr("stroke-width", 1.5)
            .attr("d", line);

        // Tiny visible dots
        svg2.selectAll(".dot")
            .data(stateData)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d[metric]))
            .attr("r", 1.5)
            .attr("fill", "#e07b39")
            .on("mouseover", function (event, d) {
                tooltip
                    .style("opacity", 1)
                    .html(`<strong>${d.station}</strong><br>${d3.timeFormat("%b %d")(d.date)}: ${d[metric].toFixed(2)}`);
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", (event.pageX + 12) + "px")
                    .style("top",  (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("opacity", 0);
            });
    }
});