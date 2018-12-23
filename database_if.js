// Load the SDK for JavaScript
var AWS = require('aws-sdk');
// Set the region 
AWS.config.update({region: 'eu-west-2'});
//var ep = new AWS.Endpoint('http://localhost:8000');
// Create the DynamoDB service object
//dynamodb = new AWS.DynamoDB({apiVersion: '2012-10-08', endpoint: ep});
dynamodb = new AWS.DynamoDB({apiVersion: '2012-10-08'});
var READ_CAPACITY = 5;
var WRITE_CAPACITY = 5;

var read_sem = require('semaphore')(READ_CAPACITY -1 );
var write_sem = require('semaphore')(WRITE_CAPACITY-1);
var red_int = 0;
// var AsyncLock = require('async-lock');
// var lock = new AsyncLock();

// dynamodb.listTables(params, function(err, data) {
//   if (err) console.log(err, err.stack); // an error occurred
//   else     console.log(data);           // successful response

// });

function initDB(params){
    return new Promise(function(resolve, reject){
        dynamodb.createTable(params, function(err, data) {
            if (err){
                console.log(JSON.stringify(err), err.stack); // an error occurred
                if(err.name == 'ResourceInUseException'){
                    console.log('Table ' + params.TableName + ' already allocated');
                    resolve(1);
                }
                else{
                    reject(err);
                }
            }
            else {     
                console.log(data);           // successful response
                resolve(0);
            }
        });
    });
}

exports.CreateChargingStationsTable = function(){   
// function CreateChargingStationsTable (){
    var ret = false;
    var params = {
    AttributeDefinitions: [ 
        {
            AttributeName: "created_at", 
            AttributeType: "N"
        },
        {
            AttributeName: "id", 
            AttributeType: "S"
        }
    ], 
    KeySchema: [
        {
            AttributeName: "id", 
            KeyType: "HASH"
        }, 
        {
            AttributeName: "created_at", 
            KeyType: "RANGE"
        }
    ], 
    ProvisionedThroughput: {
        ReadCapacityUnits: READ_CAPACITY, 
        WriteCapacityUnits: WRITE_CAPACITY
    }, 
    TableName: "ChargingStations"
   };
//    console.log('Right before !!!'); // an error occurred
   return initDB(params);
}


exports.PrintTable = function(TableName){
// function PrintTable(TableName){
    var params = {
        TableName: TableName
       };
       dynamodb.describeTable(params, function(err, data) {
         if (err) 
            console.log(err, err.stack); // an error occurred
         else     
            console.log(data);           // successful response
       });
}

// exports.AddItemToChargingStationTable = function(item){ 
// // function AddItemToChargingStationTable(item){
//     write_sem.take(function(){
//         var params = {
//             Item: item,
//             ReturnValues: 'ALL_OLD',
//             TableName: "ChargingStations",
//             ReturnConsumedCapacity: 'INDEXES'
//         }
//         dynamodb.putItem(params, function(err, data) {
//             if (err) {
//                 console.log(JSON.stringify(err), err.stack); // an error occurred
//                 write_sem.leave();
//             }
//             else {
//                 console.log('Added to DB ' + item.id.S );           // successful response
//                 write_sem.leave();
//             }
//         });
//     });
// }


function queryItem(params){
    return new Promise(function(resolve, reject){
        read_sem.take(function(){
            red_int = red_int + 1;
            console.log('query ' + params.ExpressionAttributeValues[':id'].S + ' ' +red_int);
        
            dynamodb.query(params, function(err, data) {
                if (err){
                    //throw err;
                    console.log('Query Error ' + JSON.stringify(err));
                    reject(err);
                    red_int = red_int - 1;
                    read_sem.leave();
                }
                else {     
                    // console.log(data);           // successful response
                    //return data;
                    resolve(data);
                    if(!data){
                        console.log('Empty result!');
                    }
                    else{
                    red_int = red_int - 1;
                    read_sem.leave();
                    }
                }
            });
        });
    });
}


exports.GetLatestEntry = function(id){
    
    var params = {
        ExpressionAttributeValues: {
            ':id': {S: id}
        },
        TableName: "ChargingStations",
        KeyConditionExpression: "id = :id",
        Limit: 1,
        ScanIndexForward: false
    }
    return queryItem(params);
    
    // var query1 =  queryItem(params);
    // query1.then(function(result){
    //     return result;
    // }, function(err){
    //     console.log(JSON.stringify(err));
    //     throw err;
    // });
}



//////////////////////////////////
// MAP HANDLERS         //////////
//////////////////////////////////
exports.GetMapSafe = function(mapid, id, params = null){
    return new Promise(function(resolve,reject){
        var entry = mapid.get(id);
        result = {'entry': entry, 'params': params};
        resolve(result);
    });
}


exports.SetMapSafe = function(mapid, id,entry){
    return new Promise(function(resolve,reject){
        mapid.set(id,entry);
        resolve(entry);
    });
}

exports.AddItemToChargingStationTable = function(item){ 
    var params = {
        Item: JSON.parse(JSON.stringify(item)),
        ReturnValues: 'ALL_OLD',
        TableName: "ChargingStations",
        ReturnConsumedCapacity: 'INDEXES'
    }
    return new Promise(function(resolve,reject){
        dynamodb.putItem(params, function(err, data) {
            if (err) {
                console.log(JSON.stringify(err), err.stack); // an error occurred
                reject(err);
            }
            else {
                // console.log('Added to DB ' + JSON.stringify(data) );           // successful response
                resolve(data);
            }
        }); 
    });
}
    
    
    // // function AddItemToChargingStationTable(item){
    //     write_sem.take(function(){
    //         var params = {
    //             Item: item,
    //             ReturnValues: 'ALL_OLD',
    //             TableName: "ChargingStations",
    //             ReturnConsumedCapacity: 'INDEXES'
    //         }
    //         dynamodb.putItem(params, function(err, data) {
    //             if (err) {
    //                 console.log(JSON.stringify(err), err.stack); // an error occurred
    //                 write_sem.leave();
    //             }
    //             else {
    //                 console.log('Added to DB ' + item.id.S );           // successful response
    //                 write_sem.leave();
    //             }
    //         });
    //     });
    // }
