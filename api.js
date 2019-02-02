function api (app) {
    const mongojs = require("mongojs");
    const papa = require('papaparse');
    const multer = require('multer');
    const stream = require('stream');
    const uploadService = multer({ storage : multer.memoryStorage(), limits: { fileSize: 1000 * 1000 * 20 } }).single('csvfile');

    const DATABASE_USERNAME = process.env.CG4002_DATABASE_USERNAME
    const DATABASE_PASSWORD = process.env.CG4002_DATABASE_PASSWORD

    var db = mongojs(DATABASE_USERNAME + ":" + DATABASE_PASSWORD + "@ds121674.mlab.com:21674/heroku_qsp32s4v", ["dancer_data", "testrun_data", "sensor_data"]);

    // Fetch testrun data by dancer name
    app.get("/api/testrun", function (request, response) {
        var pageSize = request.query.pageSize ? parseInt(request.query.pageSize) : 1000;
        var find = {};
        if (request.query.dancer) {
            find.dancer = new RegExp(request.query.dancer, "i");
        }
        var result = db.testrun_data.find(find).limit(pageSize, function (err, docs) {
            response.json(docs);
        });
    });

    // Fetch testrun data by testrun id
    app.get("/api/testrun/:id", function (request, response) {
        var id = request.params.id;
        db.testrun_data.findOne({ _id: mongojs.ObjectId(id) }, function (err, doc) {
            if (err)
                console.log("Error: " + err);
            response.json(doc);
        });
    });

    app.post("/api/testrun", uploadService, function (request, response, next) {
        // Convert Node file buffer object into a stream object so as to make it readable by PapaParser API
        var bufferStream = new stream.PassThrough();
        bufferStream.end(request.file.buffer);
        // Parse CSV Buffer Stream into a JSON object
        papa.parse(bufferStream, {
            complete: function(results) {
                // Append this testrun data to existing record for this dancer
                db.testrun_data.findOne({
                    dancer: request.body.dancer
                }, function (err, doc) {
                    if (err)
                        console.log("Error: " + err);
                    // // Instead of combining data from different testruns, store them as individual arrays of data
                    // if (doc.data.length > 0) {
                    //    results.data = results.data.slice(1, results.data.length);
                    // }
                    // doc.data = doc.data.concat(results.data);
                    doc.data.push(results.data);
                    db.testrun_data.findAndModify({
                        query: {
                            _id: doc._id
                        },
                        update: {
                            $set: {
                                dancer: doc.dancer,
                                data: doc.data
                            }
                        },
                        new: true
                    }, function (err_t, doc_t) {
                        if (err_t)
                            console.log("Error: " + err_t);
                        // console.log(doc_t.data.length);
                        response.json(doc_t);
                    });
                });
            }
        });
    });

    app.put("/api/testrun/:id", function (request, response) {
        var id = request.params.id;
        db.testrun_data.findAndModify({
            query: {
                _id: mongojs.ObjectId(id)
            },
            update: {
                $set: {
                    dancer: request.body.dancer,
                    data: request.body.data
                }
            },
            new: true
        }, function (err, doc) {
            if (err)
                console.log("Error: " + err);
            response.json(doc);
        });
    });

    app.delete("/api/testrun/:id", function (request, response) {
        var id = request.params.id;
        db.testrun_data.remove({ _id: mongojs.ObjectId(id) }, function (err, doc) {
            if (err)
                console.log("Error: " + err);
            response.json(doc);
        });
    });

    app.get("/api/master", function (request, response) {
        db.dancer_data.find({}).sort({ name : 1, type: 1 }).toArray(function (err, docs) {
            if (err)
                console.log("Error: " + err);
            response.json(docs);
        });
    });

    app.get("/api/master/:id", function (request, response) {
        var id = request.params.id;
        db.dancer_data.findOne({ _id: mongojs.ObjectId(id) }, function (err, doc) {
            if (err)
                console.log("Error: " + err);
            response.json(doc);
        });
    });

    app.post("/api/master", function (request, response) {
        db.dancer_data.insert(request.body, function (err, doc) {
            if (err)
                console.log("Error: " + err);
            var testrun = {};
            testrun.dancer = request.body.name + " (" + request.body.type + ")";
            testrun.data = [];
            db.testrun_data.insert(testrun, function (err_t, doc_t) {
                response.json(doc_t);
            });
        });
    });

    app.delete("/api/master/:id", function (request, response) {
        var id = request.params.id;

        db.dancer_data.remove({ _id: mongojs.ObjectId(id) }, function (err, doc) {
            if (err)
                console.log("Error: " + err);
            response.json(doc);
        });
    });

    app.put("/api/master/:id", function (request, response) {
        var id = request.params.id;

        db.dancer_data.findAndModify({
            query: {
                _id: mongojs.ObjectId(id)
            },
            update: {
                $set: {
                    type: request.body.type,
                    name: request.body.name
                }
            },
            new: true
        }, function (err, doc) {
            response.json(doc);
        });
    });

};

module.exports = api;
