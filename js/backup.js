//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    
    //map frame dimensions
    var width = 900,
        height = 600;

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
    
    //Example 1.4 line 10
    function callback(error, csvData, boundary, blockgroup){
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
        
        //translate TRPA Boundary and Block Groups to TopoJSON
        var trpaBoundary = topojson.feature(boundary, boundary.objects.TRPA_Boundary_WGS84),
        tahoeBlockgroup = topojson.feature(blockgroup, blockgroup.objects.Tahoe_Block_Group_WGS84).features;
        
        //add TRPA Boundary to map
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