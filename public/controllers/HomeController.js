(function (app) {
    "use strict";

    app.controller("HomeController", HomeController);

    HomeController.$inject = ["$location", "toaster", "RepositoryService"];

    // function preprocessor(objArray) {
    //     var resArray = [];
    //     var properties = ["x_val", "selectDancer", "selectLog"];
    //     var propertyLabels = ["X_VAL", "DANCER", "LOG"];
    //     // var itemProperties = ["itemDescription", "quantity", "billingUnit", "rate", "billing", "gst", "billAmount", "rateDifference", "claimAmount"];
    //     // var itemPropertyLabels = ["PRODUCT", "QTY", "BILLING UNIT", "RATE", "BILLING", "GST", "BILL AMOUNT", "RATE DIFF", "CLAIM AMT"];
    //
    //     for(var row in objArray) {
    //         for(var product in objArray[row].items) {
    //             var testrun = {};
    //             for(var i=0; i<properties.length; i++) {
    //                 testrun[propertyLabels[i]] = (typeof objArray[row][properties[i]] == "undefined" || objArray[row][properties[i]] == null ? "" : objArray[row][properties[i]]);
    //             }
    //             // for(var j=0; j<itemProperties.length; j++) {
    //             //     testrun[itemPropertyLabels[j]] = (typeof objArray[row].items[product][itemProperties[j]] == "undefined" || objArray[row].items[product][itemProperties[j]] == null ? "" : objArray[row].items[product][itemProperties[j]]);
    //             // }
    //             resArray.push(testrun);
    //         }
    //     }
    //
    //     return resArray;
    // }

    // function ConvertToCSV(objArray) {
    //     objArray = preprocessor(objArray);
    //     var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    //     var str = '';
    //     var row = "";
    //     for (var index in objArray[0]) {
    //         row += index + ',';
    //     }
    //     row = row.slice(0, -1);
    //     str += row + '\r\n';
    //     for (var i = 0; i < array.length; i++) {
    //         var line = '';
    //         for (var index in array[i]) {
    //             if (line != '')
    //                 line += ',';
    //             line += array[i][index];
    //         }
    //         str += line + '\r\n';
    //     }
    //     return str;
    // }

    // Combine testruns of different dancers into one list
    function combiner(data) {
        var testruns = [];
        for (var dancer in data) {
            testruns = testruns.concat(data[dancer].data);
        }
        return testruns;
    }

    /***
     *** Calculate and return the following as a dictionary:
     *** 1. Number of test runs
     *** 2. Overall prediction accuracy
     *** 3. Average prediction time per dance move
     *** 4. (Upto) Top 3 confusing moves with detailed count
     *** 5. Average Voltage
     *** 6. Average Current
     *** 7. Average Power
     *** 8. Average Energy
     *** 9. JSON for Accuracy Chart
    **/
    function runAnalytics(testruns) {
        console.log(testruns);
        var analytics = {};
        analytics.num_testruns = testruns.length;

        return analytics;
    }

    function HomeController($location, toaster, repository) {
        var vm = this;
        vm.testruns = [];
        vm.metrics = {};
        vm.filter = {};

        repository.getTestruns(vm.filter).then(function (result) {
            vm.testruns = result.data;
        });

        vm.selectLogs = [
            { id: null, label: "Filter data", disabled: true },
            { id: 'train', label: "Show only training set dancers" },
            { id: 'test', label: "Show only testing set dancers" },
            { id: 'selected', label: "Show only selected dancers..." },
            { id: 'all', label: "Show all dancers" }
        ];

        repository.getTestruns({}).then(function (result) {
            vm.metrics = runAnalytics(combiner(result.data));
            console.log(vm.metrics);
        });

        vm.selectDancers = [];
        repository.getMasterData().then(function (result) {
            for (var row in result.data) {
                var dancer = result.data[row]["name"] + " (" + result.data[row]["type"] + ")";
                if (vm.selectDancers.includes(dancer) == false) {
                    vm.selectDancers.push(dancer);
                }
            }
            vm.selectDancers.sort();
            for (var val in vm.selectDancers) {
                vm.selectDancers[val] = { label: vm.selectDancers[val] };
            }
            vm.selectDancers.unshift({ label: "Select Dancer(s)", "disabled": true });
            vm.filter.selectDancer = vm.selectDancers[0].label;
            vm.filter.selectLog = vm.selectLogs[0].label;
        });

        vm.filter = function () {
            var filterString = {};
            filterString.pageSize = vm.filter.x_val;
            for (logType in vm.selectLogs) {
                if (vm.filter.selectLog == vm.selectLogs[logType].label) {
                    filterString.logType = vm.selectLogs[logType].id;
                    break;
                }
            }
            if (filterString.logType == "selected") {
                // Fix?
                filterString.dancers = vm.filter.selectDancer;
            }
            else {
                filterString.dancers = null;
            }
            repository.getTestruns(filterString).then(function (result) {
                vm.testruns = result.data;
            });
        };

        vm.clearFilter = function() {
            vm.filter.x_val = null;
            vm.filter.selectDancer = "Select Dancer(s)";
            vm.filter.selectLog = "Filter logs";
            repository.getTestruns({}).then(function (result) {
                vm.testruns = result.data;
            });
        }
    }

})(angular.module("coachingDashboard"));
