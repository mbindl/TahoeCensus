(function(){
    
    //pseudo-global variables
    var attrArray = ["Population", "Households", "Units"];// variables for data join
    var expressed = attrArray[0]; //initial attribute
    
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
        
//        //create the color scale
//        var colorScale = makeColorScale(csvData);
        
        //add enumeration units to the map
        setEnumerationUnits(tahoeBlockgroup, map, path);
    };
}; //end of setMap()

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
                    });
                };
            };
        };

    return tahoeBlockgroup;
};

function setEnumerationUnits(tahoeBlockgroup, map, path){
        //add regions to map
        var blocks = map.selectAll(".blocks")
            .data(tahoeBlockgroup)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "blocks " + d.properties.GEOID;
            })
            .attr("d", path);
    }; 
////function to create color scale generator
//function makeColorScale(data){
//    var colorClasses = [
//        "#D4B9DA",
//        "#C994C7",
//        "#DF65B0",
//        "#DD1C77",
//        "#980043"
//    ];
//
//    //create color scale generator
//    var colorScale = d3.scaleQuantile()
//        .range(colorClasses);
//
//    //build array of all values of the expressed attribute
//    var domainArray = [];
//    for (var i=0; i<data.length; i++){
//        var val = parseFloat(data[i][expressed]);
//        domainArray.push(val);
//    };
//
//    //assign array of expressed values as scale domain
//    colorScale.domain(domainArray);
//
//    return colorScale;
//    }; 

})();// end of window load