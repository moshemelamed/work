var eon = require('./eon_copenhagen');
var sln = require('./sl_london');
var ams = require('./ams_amsterdam');
var polar = require('./polar_london');
var db = require('./database_if');

var eon_scheduling = 1000*61 // Every 61 seconds
var sln_scheduling = 1000*51 // Every 51 seconds
var ams_scheduling = 1000*71 //Every 71 seconds
var polar_scheduling = 1000*43 //Every 43 seconds

function main(){
    var initialized = db.CreateChargingStationsTable();
    initialized.then(function(result){
        console.log('DB initialized, start Service ' + result);
        // var data = eon.GetRealTimeData();
        // setInterval(eon.GetRealTimeData, eon_scheduling);
        var sln_data = sln.GetRealTimeData();
        setInterval(sln.GetRealTimeData, sln_scheduling);
        var ams_data = ams.GetRealTimeData();
        setInterval(ams.GetRealTimeData, ams_scheduling);
        var polar_data = polar.GetRealTimeData();
        setInterval(polar.GetRealTimeData, polar_scheduling);
    }, function(err){
        console.log('err ' + err);
    });
    console.log('done');
}

main();
