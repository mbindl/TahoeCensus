(function(){
    
    //pseudo-global variables
    var attrArray = ["Population Per Acre", "Households Per Acre", "Units Per Acre"];// variables for data join
    var expressed = attrArray[0]; //initial attribute
    
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    
    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 20]);
    
//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    
    //map frame dimensions
    var width = window.innerWidth * 0.5,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on Tahoe
    var projection = d3.geoAlbers()
        .center([0, 39.02])
        .rotate([120.03, 0, 0])
        .parallels([43, 62])
        .scale(40000)
        .translate([width / 2, height / 2]);
    
    // draw geometry
    var path = d3.geoPath()
        .projection(projection);
    
    
    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/census_data.csv")); //load attributes from csv
    promises.push(d3.json("data/TRPA_Boundary.topojson")); //load background spatial data
    promises.push(d3.json("data/Tahoe_Block_Group.topojson")); //load choropleth spatial data
    Promise.all(promises).then(callback);

    function callback(data){
        
        // using promises to call indexed layers
        csvData = data[0];
        boundary = data[1];
        blockgroup = data[2];

        //translate TRPA Boundary and Block Groups to TopoJSON
        var trpaBoundary = topojson.feature(boundary, boundary.objects.TRPA_Boundary_WGS84),
        tahoeBlockgroup = topojson.feature(blockgroup, blockgroup.objects.Tahoe_Block_Group_WGS84).features;

        //add TRPA Boundary to map
        var bndry = map.append("path")
            .datum(trpaBoundary)
            .attr("class", "bndry")
            .attr("d", path);

        //join csv data to GeoJSON enumeration units
        tahoeBlockgroup = joinData(tahoeBlockgroup, csvData);
        
        //create the color scale
        var colorScale = makeColorScale(csvData);
        
        //add enumeration units to the map
        setEnumerationUnits(tahoeBlockgroup, map, path, colorScale);
                        
        // add dropdown
        createDropdown(csvData);
        
        //add coordinated visualization to the map
        setChart(csvData, colorScale);

    };
}; //end of setMap()

//function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#ABFAFA",
        "#68C3C3",
        "#2C8484",
        "#004E4E",
        "#002F2F"
    ];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build two-value array of minimum and maximum expressed attribute values
    var minmax = [
        d3.min(data, function(d) { return parseFloat(d[expressed]); }),
        d3.max(data, function(d) { return parseFloat(d[expressed]); })
    ];
    //assign two-value array as scale domain
    colorScale.domain(minmax);
    // return colors
    return colorScale;
};

//function to test for data value and return color or default grey
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};
    
//// function to create graticules in background
//function setGraticule(map, path){
//        // graticule generator
//        var graticule = d3.geoGraticule()
//            .step([1, 1]); //place graticule lines every 5 degrees of longitude and latitude
//        
//        //create graticule background
//        var gratBackground = map.append("path")
//            .datum(graticule.outline()) //bind graticule background
//            .attr("class", "gratBackground") //assign class for styling
//            .attr("d", path) //project graticule
//        
//        //create graticule lines
//        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
//            .data(graticule.lines()) //bind graticule lines to each element to be created
//            .enter() //create an element for each datum
//            .append("path") //append each element to the svg as a path element
//            .attr("class", "gratLines") //assign class for styling
//            .attr("d", path); //project graticule lines
//};

// join csv data to block group
function joinData(tahoeBlockgroup, csvData){
        //loop through csv to assign each set of csv attribute values to geojson block group
        for (var i=0; i<csvData.length; i++){
            var csvBlocks = csvData[i]; //the current block group
            var csvKey = csvBlocks.GEOID; //the CSV primary key

            //loop through geojson block groups to find correct block
        for (var a=0; a<tahoeBlockgroup.length; a++){

            var geojsonProps = tahoeBlockgroup[a].properties; //the current block group geojson properties
            var geojsonKey = geojsonProps.GEOID; //the geojson primary key

            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){

                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvBlocks[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    console.log(val)
                    });
                };
            };
        };
    return tahoeBlockgroup;
};

// set units
function setEnumerationUnits(tahoeBlockgroup, map, path, colorScale){
        //add regions to map
        var blocks = map.selectAll(".blocks")
            .data(tahoeBlockgroup)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "blocks " + d.properties.GEOID;
            })
            .attr("d", path)
            .style("fill", function(d){
            return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function(d){
            highlight(d.properties);
            })
                
            .on("mouseout", function(d){
            dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);
        
        var desc = blocks.append("desc")
            .text('{"stroke": "rgba(0, 0, 0, 0.3)", "stroke-width": "0.8px"}');
};
    
//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    
    //set bars for each province
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.GEOID;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);
    //
    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');
    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale)
        
    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    
    // update bars based on data
    updateChart(bars, csvData.length, colorScale);
};
    
//function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
    };
    
//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var blocks = d3.selectAll(".blocks")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });
    
    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);
    
    // update bars based on data
    updateChart(bars, csvData.length, colorScale);
};

//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
    //add text to chart title
    var chartTitle = d3.select(".chartTitle")
        .text(expressed);
};

//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.GEOID)
        .style("stroke", "blue")
        .style("stroke-width", "2");
    //add popup on hover
    setLabel(props);
};
function dehighlight(props){
        var selected = d3.selectAll("." + props.GEOID)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });

        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
        d3.select(".infolabel")
            .remove();
};

//// add commas
//function numberWithCommas(x) {
//    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
//}   
//numberWithCommas(props[expressed]);
    
//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = expressed + ": " + props[expressed];

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.GEOID + "_label")
        .html(labelAttribute);       
};
    
//function to move info label with mouse
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 35,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1; 

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};
    
})();// end of window load