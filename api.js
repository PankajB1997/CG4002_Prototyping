function api (app) {
    var mongojs = require("mongojs");

    const DATABASE_USERNAME = process.env.CG4002_DATABASE_USERNAME
    const DATABASE_PASSWORD = process.env.CG4002_DATABASE_PASSWORD

    var db = mongojs(DATABASE_USERNAME + ":" + DATABASE_PASSWORD + "@ds121674.mlab.com:21674/heroku_qsp32s4v", ["dancer_data", "testrun_data", "sensor_data"]);

    days = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];
    months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];

    app.get("/api/testrun", function (request, response) {
        var pageSize = request.query.pageSize ? parseInt(request.query.pageSize) : 1000;

        var find = {};

        if (request.query.vendorName) {
            find.vendorName = new RegExp(request.query.vendorName, "i");
        }

        var result = db.testrun_data.find(find).sort({ "billDate": -1 }).limit(pageSize, function (err, docs) {
            // for (var i = 0; i < docs.length; i++) {
            //     docs[i]["billDate"] = docs[i]["billDate"].toISOString();
            // }
            // docs.sort(function(a, b) {
            //     a = new Date(a.billDate);
            //     b = new Date(b.billDate);
            //     return a>b ? -1 : a<b ? 1 : 0;
            //     // return b - a;
            // });
            // console.log(docs);
            // for (var i = 0; i < docs.length; i++) {
            //     docs[i]["billDate"] = new Date(docs[i]["billDate"]);
            // }
            for (var i = 0; i < docs.length; i++) {
                if (docs[i]["billDate"]) {
                    day = (docs[i]["billDate"].getDate() < 10) ? "0" + docs[i]["billDate"].getDate() : docs[i]["billDate"].getDate();
                    month = ((docs[i]["billDate"].getMonth() + 1) < 10) ? "0" + (docs[i]["billDate"].getMonth() + 1) : (docs[i]["billDate"].getMonth() + 1);
                    docs[i]["billDate"] = day + "/" + month + "/" + docs[i]["billDate"].getFullYear();
                }
            }
            response.json(docs);
        });
    });

    app.get("/api/testrun/:id", function (request, response) {
        var id = request.params.id;

        db.testrun_data.findOne({ _id: mongojs.ObjectId(id) }, function (err, doc) {
            if (err)
                console.log("Error: " + err);
            // fulldate = new Date(doc["date"]);
            // day = days[fulldate.getDay()];
            // date = fulldate.getDate();
            // month = months[fulldate.getMonth()];
            // year = fulldate.getFullYear();
            // hours = fulldate.getHours();
            // minutes = fulldate.getMinutes();
            // seconds = fulldate.getSeconds();
            // ampm = (hours >= 12) ? "PM" : "AM";
            // hours = (hours > 12) ? hours - 12 : (hours == 0 ? 12 : hours);
            // hours = (hours < 10) ? "0" + hours : hours;
            // minutes = (minutes < 10) ? "0" + minutes : minutes;
            // seconds = (seconds < 10) ? "0" + seconds : seconds;
            // doc["date"] = day + ", " + date + "-" + month + "-" + year + ", " + hours + ":" + minutes + ":" + seconds + " " + ampm;
            if (doc["billDate"]) {
                day = (doc["billDate"].getDate() < 10) ? "0" + doc["billDate"].getDate() : doc["billDate"].getDate();
                month = ((doc["billDate"].getMonth() + 1) < 10) ? "0" + (doc["billDate"].getMonth() + 1) : (doc["billDate"].getMonth() + 1);
                doc["billDate"] = day + "/" + month + "/" + doc["billDate"].getFullYear();
            }
            response.json(doc);
        });
    });

    app.post("/api/testrun", function (request, response) {
        date = new Date(Date.now());
        request.body["date"] = date.toISOString();
        if (request.body["billDate"]) {
            var billDMY = request.body["billDate"].split("/");
            request.body["billDate"] = new Date(billDMY[2], billDMY[1]-1, billDMY[0]);
        }
        db.testrun_data.insert(request.body, function (err, doc) {
            if (err)
                console.log("Error: " + err);
            response.json(doc);
        });
    });

    app.put("/api/testrun/:id", function (request, response) {
        var id = request.params.id;
        if (request.body["billDate"]) {
            var billDMY = request.body["billDate"].split("/");
            request.body["billDate"] = new Date(billDMY[2], billDMY[1]-1, billDMY[0]);
        }
        db.testrun_data.findAndModify({
            query: {
                _id: mongojs.ObjectId(id)
            },
            update: {
                $set: {
                    vendorName: request.body.vendorName,
                    billTo: request.body.billTo,
                    billNo: request.body.billNo,
                    billDate: request.body.billDate,
                    items: request.body.items,
                    totalBillAmount: request.body.totalBillAmount,
                    totalClaimAmount: request.body.totalClaimAmount,
                    modeOfPayment: request.body.modeOfPayment,
                    instrumentNo: request.body.instrumentNo,
                    paymentStatus: request.body.paymentStatus
                }
            },
            new: true
        }, function (err, doc) {
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
            response.json(doc);
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
