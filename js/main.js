//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //use queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/census_data.csv") //load attributes from csv
        .defer(d3.json, "data/TRPA_Boundary.topojson")//load background data
        .defer(d3.json, "data/Tahoe_Block_Group.topojson")//load choropleth spatial data
        .await(callback);
    
    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .center([0, 39.09])
        .rotate([120.03, 0, 0])
        .parallels([43, 62])
        .scale(2500)
        .translate([width / 2, height / 2]);
    
    // draw geometry
    var path = d3.geoPath()
        .projection(projection);
    
    //Example 1.4 line 10
    function callback(error, csvData, boundary, blockgroup){
        //translate europe TopoJSON
        var trpaBoundary = topojson.feature(boundary, boundary.objects.TRPA_Boundary_WGS84),
        tahoeBlockgroup = topojson.feature(blockgroup, blockgroup.objects.Tahoe_Block_Group_WGS84).features;
        //add Europe countries to map
        var bndry = map.append("path")
            .datum(trpaBoundary)
            .attr("class", "bndry")
            .attr("d", path);

        //add France regions to map
        var blocks = map.selectAll(".blocks")
            .data(tahoeBlockgroup)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "blocks " + d.properties.GEOID;
            })
            .attr("d", path);
    };
};