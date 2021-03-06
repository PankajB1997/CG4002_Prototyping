(function (app) {
    "use strict";

    app.service("RepositoryService", RepositoryService);

    RepositoryService.$inject = ["$log", "$http", "Upload"];

    function RepositoryService($log, $http, Upload) {
        var svc = this;

        var apiUrl = "/api";

        svc.getTestruns = getTestruns;
        svc.getTestrun = getTestrun;
        svc.createTestrun = createTestrun;
        svc.updateTestrun = updateTestrun;
        svc.deleteTestrun = deleteTestrun;
        svc.getMasterData = getMasterData;
        svc.getSpecificMasterData = getSpecificMasterData;
        svc.addNewMasterData = addNewMasterData;
        svc.deleteMasterData = deleteMasterData;
        svc.updateMasterData = updateMasterData;
        svc.getRealTimeData = getRealTimeData;
        svc.deleteExistingRealTimeData = deleteExistingRealTimeData;

        function getTestruns(fields) {
            var queryString = [];
            if (fields.pageSize) {
                queryString.push("pageSize=" + fields.pageSize);
            }
            if (fields.selectLog == "Only testing set dancers") {
                queryString.push("log=(Unseen/test dancer)");
            }
            else if (fields.selectLog == "Only training set dancers") {
                queryString.push("log=(Training set dancer)");
            }
            else if (fields.selectDancer && fields.selectDancer.length > 0) {
                queryString.push("dancers=" + fields.selectDancer);
            }
            var url = [apiUrl, "testrun"].join("/");
            var fullUrl = queryString.length == 0 ? url : [url, "?", queryString.join("&")].join("");
            return $http.get(fullUrl);
        };

        function getTestrun(id) {
            return $http.get([apiUrl, "testrun", id].join("/"));
        };

        function createTestrun(model) {
            return Upload.upload({
                url: [apiUrl, "testrun"].join("/"), // webAPI exposed to upload the file
                data:{ csvfile: model.file, dancer: model.dancer } // pass file as data, should be user ng-model
            });
        };

        function updateTestrun(id, model) {
            return $http.put([apiUrl, "testrun", id].join("/"), model);
        };

        function deleteTestrun(id) {
            return $http.delete([apiUrl, "testrun", id].join("/"));
        };

        function getMasterData() {
            return $http.get([apiUrl, "master"].join("/"));
        };

        function getSpecificMasterData(id) {
            return $http.get([apiUrl, "master", id].join("/"));
        };

        function addNewMasterData(model) {
            return $http.post([apiUrl, "master"].join("/"), model);
        };

        function deleteMasterData(id) {
            return $http.delete([apiUrl, "master", id].join("/"));
        };

        function updateMasterData(id, model) {
            return $http.put([apiUrl, "master", id].join("/"), model);
        };

        function getRealTimeData() {
            return $http.get([apiUrl, "realtime"].join("/"));
        };

        function deleteExistingRealTimeData() {
            return $http.delete([apiUrl, "realtime"].join("/"));
        }

    };
})(angular.module("coachingDashboard"));
