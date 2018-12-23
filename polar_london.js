var request = require('request');
var prevSpotsMap = new Map();
var db = require('./database_if');

// Retrieve the most updated status from the database
function GetLastModified(){

}

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
    
    var name = (entry.name)?entry.name : "None";
    var cost = (entry.cost)?entry.cost : "None";
    var kw = (entry.kw)?entry.kw : "None";
    var rating = (entry.rating)?entry.rating : "None";
    var text = (entry.text)?entry.text : "None";
    var address = (entry.address)?entry.address : "None";
    var city = (entry.city)?entry.city[0] : "None";
    var type = (entry.type)?entry.type : "None";
    var lat = (entry.lat)?entry.lat.toString() : "None";
    var lng = (entry.lng)?entry.lng.toString() : "None";
    var status = (entry.status)?entry.status : "None";
    
    var item = {
        "oid": {S: entry.oid},
        "created_at": {N: entry.created_at.toString()},
        "id": {S: entry.id},
        "siteid": {S: entry.siteid},
        "address": {S: address},
        "city": {S: city},
        "lat": {N: lat},
        "lng": {N: lng},
        "type": {S: type},
        "name": {S: name},
        "cost": {N: cost.toString()},
        "kw": {N: kw.toString()},
        "rating": {S: rating},
        "text": {S: text},
        "status": {S: status}
    }
    return item;
}


function dynamo2normal(item){
    var entry = {
       oid: item.oid.S,
       created_at: parseInt(item.created_at.S),
       id: item.id.S,
       siteid:  item.siteid.S,
       address:  item.address.S,
       city:  item.city.S,
       lat: parseInt(item.lat),
       lng: parseInt(item.lng),
       type:  item.type.S,
       name:  item.name.S,
       cost:  item.cost.S,
       kw:  item.kw.S,
       rating:  item.rating.S,
       text:  item.text.S,
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

// function getPrevEntry(id){
//     return new Promise(function(resolve,reject){
//         var entry = prevSpotsMap.get(id);
//         if(!entry)
//         {
//             // Get the last entry from the DB
//             var getlastentry = db.GetLatestEntry(id);
//             getlastentry.then(function(result){
//                 //entry = result;
//                 resolve(result);
        
//             }, function(err){
//                 console.log('err ' + JSON.stringify(err));
//                 reject(err);
//             });
//         }
//         // console.log(JSON.stringify(entry));
//         resolve(entry);
//     });
// }

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


// // compare the status of the entries with the previous and extract only those that have changed
// function UpdateModifiedEntries(body){
//     body.forEach(function(entry){
//         entry.chargingpoints.forEach(function(item){
//             entry.id = (entry.siteid + item.Name).replace(/\s+/g, '_');
//             entry.status = item.Status;
//             entry.type = item.Type;
//             entry.name = item.Name;
//             entry.cost = item.Cost;
//             entry.kw = item.KW;
//             entry.rating = item.Rating;            
//             var prevEntry = getPrevEntry(entry.id);
//             prevEntry.then(function(result){
//                 if(result){
//                     if(true == isModified(result,entry)){
//                         //Save Entry in database
//                         console.log('Polar: Save Entry! ' + entry.id + entry.status + ' was ' + result.id + result.status);
//                         db.AddItemToChargingStationTable(convert2dynamoformat(entry));
//                     }
//                 }                
//                 else{
//                     console.log('Save NEW Entry! ' + entry.id + ' ' + entry.status);
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
            tmpentry.id = (entry.siteid + item.Name).replace(/\s+/g, '_');
            tmpentry.status = item.Status;
            tmpentry.type = item.Type;
            tmpentry.name = item.Name;
            tmpentry.cost = item.Cost;
            tmpentry.kw = item.KW;
            tmpentry.rating = item.Rating; 
            await db.GetMapSafe(prevSpotsMap, tmpentry.id, tmpentry).then(function(result){
                if(result.entry){
                    if(true == isModified(result.params,result.entry)){
                        //Save Entry in database
                        console.log('Polar: Save Entry! ' + result.params.id + ' ' +  result.params.status + 
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
    // console.log('Polar: Tried to Save ' + num1 + ' Saved ' + num2);
    var num3 = 0;
    for(obj of EntriesToSave){
        var savedEntry = JSON.parse(JSON.stringify(obj));
        await db.AddItemToChargingStationTable(convert2dynamoformat(savedEntry)).then(function(res){
            // console.log(num3 + ' Saved DB' + res);
            num3++;  
        });
    }
    console.log('Polar: Tried to Save To DB ' + num1 + ' Saved ' + num3 + ' To Local: '+ num2);
}









// Normalize the data into unified set of entries, to check whether the status has changed since the last query
function Normalize(body){
    var created_at = Math.floor(Date.now() / 1000);
    try{
        var repl = body.map(function(obj) {
            return {
                oid: 'polar',
                created_at: created_at,
                siteid: obj.Serial,
                address: obj.Address,
                city: obj.Address.split(",").splice(-1),
                lat: obj.Latitude,
                lng: obj.Longitude,
                text: obj.Text,
                chargingpoints: obj.Sockets
            }
        });
    }
    catch(error){
        throw (error);
    }
    UpdateModifiedEntries(repl);
}

exports.GetRealTimeData = function(){  
//function GetRealTimeData(){
    // Read charging stations status - E.On
    request.get({
        url: 'https://polar-network.com/ajax/posts',
        headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',            
            'x-requested-with': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8'
        },
        json: true,
        gzip: true
    },function(error, response, body){
        if(!error){
            try{
                var ProcessRequest = Normalize(body.posts, function(err){
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

