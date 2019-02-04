// Load the SDK for JavaScript
var AWS = require('aws-sdk');
// Set the region 
AWS.config.update({ region: 'eu-west-2' });
//var ep = new AWS.Endpoint('http://localhost:8000');
// Create the DynamoDB service object
//dynamodb = new AWS.DynamoDB({apiVersion: '2012-10-08', endpoint: ep});
//dynamodb = new AWS.DynamoDB({apiVersion: '2012-10-08'});
//Load mongoose for working with mongodb
const mongoose = require('mongoose');
//Loading the Schema for mongoose
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;
var db = mongoose.connection;
var ChargingdbSchema = new Schema;
//Naming the Schema
//Connection to mongodb


// var READ_CAPACITY = 5;
// var WRITE_CAPACITY = 5;

// var read_sem = require('semaphore')(READ_CAPACITY - 1);
// var write_sem = require('semaphore')(WRITE_CAPACITY - 1);
// var red_int = 0;
// var AsyncLock = require('async-lock');
// var lock = new AsyncLock();

// dynamodb.listTables(params, function(err, data) {
//   if (err) console.log(err, err.stack); // an error occurred
//   else     console.log(data);           // successful response

// });

function connectToMongo() {
    connected = mongoose.connect('mongodb://ec2-3-8-115-8.eu-west-2.compute.amazonaws.com:27017/ChargingdbSchema', { useNewUrlParser: true });
}

exports.CreateChargingStationsTable = function () {
    var params = [{ name: 'momo' },
    {
        oid: 'moshe',
        created_at: 'String',
        id: 'String',
        siteid: 'String',
        address: 'String',
        city: 'String',
        lat: 'String',
        lng: 'String',
        type: 'String',
        name: 'String',
        cost: 'String',
        kw: 'String',
        rating: 'String',
        text: 'String',
        status: 'String'
    },
    { name: 'new' }
    ];
    return initDB(params);
}

function initDB(params) {
    return new Promise(function (resolve, reject) {
        connectToMongo();
        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function () {
            console.log('Connection has been made');
            var ChargingdbSchemaDB = new mongoose.Schema({
                oid: String,
                created_at: String,
                id: String,
                siteid: String,
                address: String,
                city: String,
                lat: String,
                lng: String,
                type: String,
                name: String,
                cost: String,
                kw: String,
                rating: String,
                text: String,
                status: String,
                TableName: String
            });
            ChargingdbDB = mongoose.model('testMongoose', ChargingdbSchemaDB);
            //description on schema
            console.log(ChargingdbDB.schema.obj);


            ChargingdbDB.collection.insertMany(params, function (err, docs) {
                if (err) {
                    return console.error(err);
                } else {
                    console.log("Multiple documents inserted to Collection");
                }
            });
            resolve(1);
        });

    });
}


exports.PrintTable = function (TableName) {
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        console.log(ChargingdbDB);
    });
}

// function queryItem(params){
//     return new Promise(function(resolve, reject){
//         read_sem.take(function(){
//             red_int = red_int + 1;
//             console.log('query ' + params.ExpressionAttributeValues[':id'].S + ' ' +red_int);

//             dynamodb.query(params, function(err, data) {
//                 if (err){
//                     //throw err;
//                     console.log('Query Error ' + JSON.stringify(err));
//                     reject(err);
//                     red_int = red_int - 1;
//                     read_sem.leave();
//                 }
//                 else {     
//                     // console.log(data);           // successful response
//                     //return data;
//                     resolve(data);
//                     if(!data){
//                         console.log('Empty result!');
//                     }
//                     else{
//                     red_int = red_int - 1;
//                     read_sem.leave();
//                     }
//                 }
//             });
//         });
//     });
// }


exports.GetLatestEntry = function (id) {
    var params = {
        'ExpressionAttributeValues': '{id: { S: %s }}', id,
        'TableName': "ChargingStations",
        'KeyConditionExpression': '%s', id,//
        'Limit': '1',
        'ScanIndexForward': false
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
exports.GetMapSafe = function (mapid, id, params = null) {
    return new Promise(function (resolve, reject) {
        var entry = mapid.get(id);
        result = { 'entry': entry, 'params': params };
        resolve(result);
    });
}


exports.SetMapSafe = function (mapid, id, entry) {
    return new Promise(function (resolve, reject) {
        mapid.set(id, entry);
        resolve(entry);
    });
}

exports.AddItemToChargingStationTable = function (item) {

    return new Promise(function (resolve, reject) {
        var params = JSON.parse(JSON.stringify(item));
        //need to use panda and jason load
        //dynamodb.putItem(params, function (err, data) {
        ChargingdbDB.collection.insertOne(params, function (err, docs) {
            if (err) {
                return console.error(err);
            } else {
                console.log("one documents inserted to Collection");
            }
        });
        resolve(1);
    });
}





