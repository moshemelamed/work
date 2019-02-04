var request = require('request');
var prevSpotsMap = new Map();
var db = require('./database_if');


// Compare two entries and check if status has changed.
function isModified(oldEntry, newEntry){
    var IsModified = false;
    if(JSON.stringify(oldEntry.availability) != JSON.stringify(newEntry.availability)){
        IsModified = true;
    }
    if(oldEntry.sitestatus != newEntry.sitestatus){
        IsModified = true;
    }
    return IsModified;
}



function convert2mongoformat(entry){
    var scheduled_at = (entry.scheduled_at)?entry.scheduled_at : "None";
    var displayed_comment = (entry.displayed_comment)?entry.displayed_comment : "None";
    var pricing_zone = (entry.pricing_zone)?entry.pricing_zone : "None";
    var kind = (entry.kind)?entry.kind : "None";
    var client_category = (entry.client_category)?entry.client_category : "None";
    var item = {
        oid: entry.oid.toString(),
        created_at: entry.created_at.toString(),
        id: entry.id.toString(),
        siteid: entry.siteid.toString(),
        sitestatus: entry.sitestatus.toString(),
        name:  entry.name.toString(),
        address:  entry.address,
        city:  entry.city.toString(),
        lat: entry.lat.toString(),
        lng:  entry.lng.toString(),
        scheduled_at:  scheduled_at.toString(),
        charging_status:  entry.charging_status.toString(),
        subscription_status:  entry.subscription_status.toString(),
        sitekind:  entry.sitekind.toString(),
        displayed_comment:  displayed_comment.toString(),
        pricing_zone:  pricing_zone.toString(),
        kind: kind.toString(),
        communicative: entry.communicative.toString(),
        bookable:  entry.bookable.toString(),
        client_category:  client_category.toString(),
        availability:  JSON.stringify(entry.availability)
    }
    return item;
}



function dynamo2normal(item){
     var entry = {
        oid: item.oid.S,
        created_at: parseInt(item.created_at.S),
        id: item.id.S,
        siteid:  item.siteid.S,
        sitestatus:  item.sitestatus.S,
        name:  item.name.S,
        address:  item.address.S,
        city:  item.city.S,
        lat: parseInt(item.lat),
        lng: parseInt(item.lng),
        scheduled_at:  item.scheduled_at.S,
        charging_status:  item.charging_status.S,
        subscription_status:  item.subscription_status.S,
        sitekind:  item.sitekind.S,
        displayed_comment:  item.displayed_comment.S,
        pricing_zone:  item.pricing_zone.S,
        kind:  item.kind.S,
        communicative:  item.communicative.S,
        bookable:  item.bookable.S,
        client_category:  item.client_category.S,
        availability:  JSON.parse(item.availability.S),
        
     }
     return entry;
}

function getPrevEntry(id){
    return new Promise(function(resolve,reject){
        var entry = prevSpotsMap.get(id);
        if(!entry)
        {
            // Get the last entry from the DB
            var getlastentry = db.GetLatestEntry(id);
            getlastentry.then(function(result){
                //entry = result;
                if(result.Count > 0){
                    resolve(dynamo2normal(result.Items[0]));
                }
                else{
                    resolve(0);
                }
        
            }, function(err){
                console.log('err ' + JSON.stringify(err));
                reject(err);
            });
        }else{
            // console.log(JSON.stringify(entry));
            resolve(entry);
        }
    });
}

// compare the status of the entries with the previous and extract only those that have changed
// function UpdateModifiedEntries(body){
//     body.forEach(function(origentry){
//         origentry.chargingpoints.forEach(function(item){
//             var entry = JSON.parse(JSON.stringify(origentry));
//             entry.id = item.uid;
//             entry.kind = item.kind;
//             entry.communicative = item.communicative;
//             entry.bookable = item.bookable;
//             entry.client_category = item.client_category
//             entry.availability = item.availability;
//             var prevEntry = getPrevEntry(entry.id);
//             prevEntry.then(function(result){
//                 if(result){
//                     if(true == isModified(result,entry)){
//                         //Save Entry in database
//                         console.log('Save Entry! ' + entry.id + entry.status + ' was ' + result.id + result.status);
//                         db.AddItemToChargingStationTable(convert2dynamoformat(entry));
//                     }
//                 }
//                 else{
//                     console.log('Save NEW Entry! ' + entry.id + ' ' + entry.availability);
//                     db.AddItemToChargingStationTable(convert2dynamoformat(entry));

//                 }
//             }, function(err){
//                 console.log(JSON.stringify(err));
//             });
//             prevSpotsMap.set(entry.id,entry);
//         });
//     });
// }


// compare the status of the entries with the previous and extract only those that have changed
async function UpdateModifiedEntries(body){
    var EntriesToSave = [];
    // body.forEach(function(entry){
    for(const obj of body){
        var entry  = JSON.parse(JSON.stringify(obj));
        for(const item of entry.chargingpoints){
            var tmpentry  = JSON.parse(JSON.stringify(entry));
            tmpentry.id = item.uid;
            tmpentry.kind = item.kind;
            tmpentry.communicative = item.communicative;
            tmpentry.bookable = item.bookable;
            tmpentry.client_category = item.client_category
            tmpentry.availability = item.availability;  
            await db.GetMapSafe(prevSpotsMap, tmpentry.id, tmpentry).then(function(result){
                if(result.entry){
                    if(true == isModified(result.params,result.entry)){
                        //Save Entry in database
                        console.log('SLN: Save Entry! ' + result.params.id + ' ' +  JSON.stringify(result.params.availability) + 
                        ' was ' + result.entry.id + ' ' + JSON.stringify(result.entry.availability));
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
    // console.log('SLN: Tried to Save ' + num1 + ' Saved ' + num2);
    var num3 = 0;
    for(obj of EntriesToSave){
        var savedEntry = JSON.parse(JSON.stringify(obj));
        await db.AddItemToChargingStationTable(convert2mongoformat(savedEntry)).then(function(res){
            // console.log(num3 + ' Saved DB' + res);
            num3++;  
        });
    }
    console.log('SLN: Tried to Save To DB ' + num1 + ' Saved ' + num3 + ' To Local: '+ num2);
}






// Normalize the data into unified set of entries, to check whether the status has changed since the last query
function Normalize(body){
    var created_at = Math.floor(Date.now() / 1000);
    try{
        var repl = body.map(function(obj) {
            return {
                oid: 'sln',
                created_at: created_at,
                siteid: obj.uid,
                name: obj.public_name,
                address: obj.address,
                city: obj.city,
                lat: obj.lat,
                lng: obj.lng,
                sitestatus: obj.status,
                scheduled_at: obj.scheduled_at,
                charging_status: obj.charging_status,
                subscription_status: obj.subscription_status,
                sitekind: obj.kind,
                displayed_comment: obj.displayed_comment,
                pricing_zone: obj.pricing_zone,
                chargingpoints: obj.charge_availability
            }
        });
    }
    catch(error){
        throw(error);
    }
    UpdateModifiedEntries(repl);
}

exports.GetRealTimeData = function(){    
    var token = null;
    // Get Auth key
    request.post({
        url: 'https://api.sourcelondon.net/oauth2/token/',
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic c291cmNlbG9uZG9uOnNvdXJjZWxvbmRvbg==',
            'Origin': 'https://membership.sourcelondon.net',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36',
            'Accept': '*/*',
            'Referer': 'https://membership.sourcelondon.net/stations/full/',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9,he-IL;q=0.8,he;q=0.7'
        },
        form: {"grant_type":"client_credentials"},
        json: true
    }, function(error, response, body){
        //console.log(body);
        if(!error){           
            token = body.access_token;
            request.get({
                url: 'https://api.sourcelondon.net/v3/station/',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36',
                    'Accept': 'application/json',
                    'Referer': 'https://membership.sourcelondon.net/stations/full/',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'en-US,en;q=0.9,he-IL;q=0.8,he;q=0.7',
                    'Authorization': 'Bearer ' + token
                },
                json: true,
                gzip: true
            },function(error, response, body){
                if(!error){
                    try{    
                        var ProcessRequest = Normalize(body.results, function(err){
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
    });
}