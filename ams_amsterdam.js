var request = require('request');
var HashMap = require('hashmap');
var prevSpotsMap = new HashMap();
var db = require('./database_if');

// Retrieve the most updated status from the database
// function GetLastModified(){

// }

// Compare two entries and check if status has changed.
function isModified(oldEntry, newEntry){
    var IsModified = false;
    if(oldEntry.status != newEntry.status){
        IsModified = true;
    }
    return IsModified;
}
function convert2mongoformat(entry){
    var restrictionsremark = (entry.RestrictionsRemark)?entry.RestrictionsRemark : "None";
    var connectortype = (entry.ConnectorType)?entry.ConnectorType : "None";
    var vehicletype = (entry.vehicletype)?entry.vehicletype : "None";
    var chargingcapability = (entry.chargingcapability)?entry.chargingcapability : "None";
    var identificationtype = (entry.identificationtype)?entry.identificationtype : "None";
    var item = {
        oid: entry.oid.toString(),
        created_at: entry.created_at.toString(),
        id: entry.id.toString(),
        siteid: entry.siteid.toString(),
        name: entry.name.toString(),
        address: entry.address.toString(),
        city: entry.city.toString(),
        lat:entry.lat.toString(),
        lng: entry.lng.toString(),
        restrictionsremark: restrictionsremark.toString(),
        connectortype: connectortype.toString(),
        vehicletype: vehicletype.toString(),
        chargingcapability: chargingcapability.toString(),
        identificationtype: identificationtype.toString(),
        status: entry.status.toString()
        
        // "chargingpoints": {S: entry.chargingpoints.map((r) => JSON.stringify(r)).toString()}    
    }
    return item;
}

// function dynamo2normal(item){
//     var entry = {
//        oid: item.oid.S,
//        created_at: parseInt(item.created_at.S),
//        id: item.id.S,
//        siteid:  item.siteid.S,
//        name:  item.name.S,
//        address:  item.address.S,
//        city:  item.city.S,
//        lat: parseInt(item.lat),
//        lng: parseInt(item.lng),
//        restrictionsremark:  item.restrictionsremark.S,
//        connectortype:  item.connectortype.S,
//        vehicletype:  item.vehicletype.S,
//        chargingcapability:  item.chargingcapability.S,
//        identificationtype:  item.identificationtype.S,
//        status:  item.status.S,
       
//     }
//     return entry;
// }



// function convertFromdynamoformat(item){
//      var entry = {
//         oid: item.oid.S,
//         created_at: parseInt(item.created_at.S),
//         id: item.id.S,
//         siteid: item.siteid.S,
//         sitestatus: item.sitestatus.S,
//         name: item.name.S,
//         address: item.address.S,
//         city: item.city.S,
//         lat: parseFload(item.lat.N),
//         lng: parseFload(item.lng.N),
//         status: item.status.S
//      }
//      return entry;
// }

// function getPrevEntry(id){
//     return new Promise(function(resolve,reject){
//         var entry = prevSpotsMap.get(id);
//         if(!entry)
//         {
//             // Get the last entry from the DB
//             var getlastentry = db.GetLatestEntry(id);
//             getlastentry.then(function(result){
//                 //entry = result;
//                 if(result.Count > 0){
//                     resolve(dynamo2normal(result.Items[0]));
//                 }
//                 else{
//                     resolve(0);
//                 }
        
//             }, function(err){
//                 console.log('err ' + JSON.stringify(err));
//                 reject(err);
//             });
//         }else{
//             // console.log(JSON.stringify(entry));
//             resolve(entry);
//         }
//     });
// }

// compare the status of the entries with the previous and extract only those that have changed
async function UpdateModifiedEntries(body){
    var EntriesToSave = [];
    // body.forEach(function(entry){
    for(const obj of body){
        var entry  = JSON.parse(JSON.stringify(obj));
        entry.city = (entry.Location.City)?((entry.Location.City._)?entry.Location.City._:entry.Location.City):(entry.Location.District)?entry.Location.District:"None"
        entry.address = entry.Location.HouseNumber + ',' + entry.Location.Street;
        if(Array.isArray(entry.chargingpoints)){
            // entry.chargingpoints.forEach(function(item){
            for(const item of entry.chargingpoints){
                var tmpentry  = JSON.parse(JSON.stringify(entry));
                tmpentry.id = item.CPExternalID;
                tmpentry.status = item.Status;
                tmpentry.connectortype = item.ConnectorType;
                tmpentry.vehicletype = item.VehicleType;
                tmpentry.chargingcapability = item.ChargingCapability;
                tmpentry.identificationtype = item.IdentificationType;
                await db.GetMapSafe(prevSpotsMap, tmpentry.id, tmpentry).then(function(result){
                    // console.log(result.params.id + ' Checked');
                    if(result.entry){
                        if(true == isModified(result.params,result.entry)){
                            //Save Entry in database
                            console.log('AMS: Save Entry! ' + result.params.id + result.params.status + 
                            ' was ' + result.entry.id + ' ' + result.entry.status);
                            EntriesToSave.push(result.params);
                        }
                    }else{
                        EntriesToSave.push(result.params);
                    }
                });
            };
        }
        else{
            entry.id = entry.chargingpoints.CPExternalID;
            entry.status = entry.chargingpoints.Status;
            entry.connectortype = entry.chargingpoints.ConnectorType;
            entry.vehicletype = entry.chargingpoints.VehicleType;
            entry.chargingcapability = entry.chargingpoints.ChargingCapability;
            entry.identificationtype = entry.chargingpoints.IdentificationType;
            await db.GetMapSafe(prevSpotsMap, entry.id, entry).then(function(result){
                // console.log(result.params.id + ' Checked');
                if(result.entry){
                    if(true == isModified(result.params,result.entry)){
                        //Save Entry in database
                        console.log('AMS: Save Entry! ' + result.params.id + ' ' + result.params.status + 
                        ' was ' + result.entry.id + ' ' + result.entry.status);
                        EntriesToSave.push(result.params);
                    }
                }else{
                    EntriesToSave.push(result.params);
                }
            });
        }
    }
    var num1 = 0;
    var num2 = 0;
    for(obj of EntriesToSave){
        num1++;
        var savedEntry = JSON.parse(JSON.stringify(obj));
        await db.SetMapSafe(prevSpotsMap, savedEntry.id, savedEntry).then(function(result){            
                // console.log(num2 + ' Save ' + result.id);
                num2++;    
        });
    }
    // console.log('AMS: Tried to Save ' + num1 + ' Saved ' + num2);
    var num3 = 0;
    for(obj of EntriesToSave){
        var savedEntry = JSON.parse(JSON.stringify(obj));
        await db.AddItemToChargingStationTable(convert2mongoformat(savedEntry)).then(function(res){
            // console.log(num3 + ' Saved DB' + res);
            num3++;  
        });
    }
    console.log('AMS: Tried to Save To DB ' + num1 + ' Saved ' + num3 + ' To Local: '+ num2);
}


// Normalize the data into unified set of entries, to check whether the status has changed since the last query
function Normalize(body){
    var created_at = Math.floor(Date.now() / 1000);
    try{
        var repl = body.map(function(obj) {
            return {
                oid: obj.Provider,
                created_at: created_at,
                siteid: obj.CSExternalID,
                name: obj.CSExternalID,
                lat: obj.Location.Latitude,
                lng: obj.Location.Longitude,
                RestrictionsRemark: obj.RestrictionsRemark,
                Location: obj.Location,
                chargingpoints: obj.ChargingPoints.ChargingPoint
            }
        });
    }
    catch(error){
        throw(error);
    }
    UpdateModifiedEntries(repl);
}

exports.GetRealTimeData = function(){  
//function GetRealTimeData(){
    // Read charging stations status - E.On
    request.get({
        url: 'https://amsterdam-maps.bma-collective.com/embed/elektrisch/laden/chargingstations.bb.json.php',
        headers: {
            'Accept': '*/*',            
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
        },
        json: true,
        gzip: true
    },function(error, response, body){
        if(!error){
            try{
                var ProcessRequest = Normalize(body, function(err){
                console.log('Failed To Process Request Error: ' + err);
                });
            }
            catch(error){
                console.log("Error in Processing Request " + error)
            }
        }
        else{
            console.log(error);
        }
    }); 
}

// var data = GetRealTimeData();
// console.log(data);
// setInterval(GetRealTimeData, 15000)