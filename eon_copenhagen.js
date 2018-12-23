var request = require('request');
var HashMap = require('hashmap');
var prevSpotsMap = new HashMap();
var db = require('./database_if');

// Compare two entries and check if status has changed.
function isModified(oldEntry, newEntry){
    var IsModified = false;
    if(oldEntry.status != newEntry.status){
        IsModified = true;
    }
    if(oldEntry.sitestatus != newEntry.sitestatus){
        IsModified = true;
    }
    return IsModified;
}
function convert2dynamoformat(entry){
    var item = {
        "oid": {S: entry.oid},
        "created_at": {N: entry.created_at.toString()},
        "id": {S: entry.id},
        "siteid": {S: entry.siteid},
        "sitestatus": {S: entry.sitestatus},
        "name": {S: entry.name},
        "address": {S: entry.address},
        "city": {S: entry.city},
        "lat": {N: entry.lat.toString()},
        "lng": {N: entry.lng.toString()},
        "status": {S: entry.status}
        // "chargingpoints": {S: entry.chargingpoints.map((r) => JSON.stringify(r)).toString()}    
    }
    return item;
}

function dynamo2normal(item){
    var entry = {
       oid: item.oid.S,
       created_at: parseInt(item.created_at.S),
       id: item.id.S,
       siteid:  item.siteid.S,
       sitestatus: item.sitestatus.S,
       name:  item.name.S,
       address:  item.address.S,
       city:  item.city.S,
       lat: parseInt(item.lat),
       lng: parseInt(item.lng),
       status:  item.status.S,
       
    }
    return entry;
}



function convertFromdynamoformat(item){
     var entry = {
        oid: item.oid.S,
        created_at: parseInt(item.created_at.S),
        id: item.id.S,
        siteid: item.siteid.S,
        sitestatus: item.sitestatus.S,
        name: item.name.S,
        address: item.address.S,
        city: item.city.S,
        lat: parseFload(item.lat.N),
        lng: parseFload(item.lng.N),
        status: item.status.S
     }
     return entry;
}



function GetEntry(id){
    return new Promise(function(resolve,reject){
        resolve = prevSpotsMap.get(id);
    });
}

function SetEntry(id,entry){
    return new Promise(function(resolve,reject){
        resolve = prevSpotsMap.set(id,entry)
    });
}

// compare the status of the entries with the previous and extract only those that have changed
async function UpdateModifiedEntries(body){
    var EntriesToSave = [];
    // body.forEach(function(entry){
    for(const obj of body){
        var entry  = JSON.parse(JSON.stringify(obj));
        for(const subobj of entry.chargingpoints){
            var tmpentry  = JSON.parse(JSON.stringify(entry));
            tmpentry.id = subobj.id;
            tmpentry.status = subobj.status;            
            // processitem(entry);
            await db.GetMapSafe(prevSpotsMap, tmpentry.id, tmpentry).then(function(result){
                if(result.entry){
                    if(true == isModified(result.params,result.entry)){
                        //Save Entry in database
                        console.log('Save Entry! ' + result.params.id + ' ' + result.params.status + 
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
    // console.log('EON: Tried to Save ' + num1 + ' Saved ' + num2);
    var num3 = 0;
    for(obj of EntriesToSave){
        var savedEntry = JSON.parse(JSON.stringify(obj));
        await db.AddItemToChargingStationTable(convert2dynamoformat(savedEntry)).then(function(res){
            // console.log(num3 + ' Saved DB' + res);
            num3++;  
        });
    }
    console.log('EON: Tried to Save To DB ' + num1 + ' Saved ' + num3 + ' To Local: '+ num2);
}

// Normalize the data into unified set of entries, to check whether the status has changed since the last query
function Normalize(body){
    var created_at = Math.floor(Date.now() / 1000);
    try{
        var repl = body.map(function(obj) {
            return {
                oid: 'eon',
                created_at: created_at,
                siteid: obj.siteId,
                name: obj.siteName,
                address: obj.streetAddress,
                city: obj.cityName,
                lat: obj.lat,
                lng: obj.lng,
                sitestatus: obj.status,
                chargingpoints: obj.connectors
            }
        });
    }
    catch(error){
        throw(error);
    }
    UpdateModifiedEntries(repl);
}

exports.GetRealTimeData = function(){  
    // Read charging stations status - E.On
    request.get({
        url: 'https://opladdinelbil.dk/data.json',
        headers: {
            'Accept': '*/*',            
            'x-requested-with': 'MLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
            'x-requested-with': 'MLHttpRequest'
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
