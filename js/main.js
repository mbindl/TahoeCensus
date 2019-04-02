(function(){
    
    //pseudo-global variables
    var attrArray = ["Population", "Households", "Units"];// variables for data join
    var expressed = attrArray[0]; //initial attribute
    
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
        .center([0, 39.09])
        .rotate([120.03, 0, 0])
        .parallels([43, 62])
        .scale(25000)
        .translate([width / 2, height / 2]);
    
    // draw geometry
    var path = d3.geoPath()
        .projection(projection);
    
    //use queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/census_data.csv") //load attributes from csv
        .defer(d3.json, "data/TRPA_Boundary.topojson")//load background data
        .defer(d3.json, "data/Tahoe_Block_Group.topojson")//load choropleth spatial data
        .await(callback);
    
    // call back for data 
    function callback(error, csvData, boundary, blockgroup){
        console.log(csvData);
        //place graticule on the map
        setGraticule(map, path);

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
        
         //add coordinated visualization to the map
        setChart(csvData, colorScale);
        
        // add dropdown
        createDropdown(csvData);
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
    var colorScale = d3.scale.quantile()
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
    
// function to create graticules in background
function setGraticule(map, path){
        // graticule generator
        var graticule = d3.geoGraticule()
            .step([1, 1]); //place graticule lines every 5 degrees of longitude and latitude
        
        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule
        
        //create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines
};

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
            });
};
    
//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

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
    
    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scale.linear()
        .range([463, 0])
        .domain([0, 2287]);

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
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });

    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Total " + expressed + " in each Block Group");

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale)
        .orient("left");

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
};
    
//function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown");

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
})();// end of window load