var build = function(obj, id) {
    var thead = d3.select(id).select("thead").selectAll("th")
        .data(obj.columns)
        .enter().append("th").text(function(d){return d});

    var tr = d3.select(id).select("tbody").selectAll("tr")
        .data(obj.data).enter().append("tr")

    var td = tr.selectAll("td")
        .data(function(d) {return d})
        .enter().append("td")
        .text(function(d) {return d})
};

var build_table = function(f, id) {
    d3.json('/res/countdown-math/' + f, function(error, data) {
        if(error) throw error;
        build(data, id);
    });
}

build_table('perc_overall.json', '#by_case');
build_table('perc_by_number.json', '#by_number');