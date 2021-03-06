(function (app) {
    "use strict";

    app.controller("MasterAddController", MasterAddController);

    MasterAddController.$inject = ["$location", "toaster", "RepositoryService"];

    function MasterAddController($location, toaster, repository) {
        var vm = this;

        vm.master = {};

        repository.getMasterData().then(function (result) {
            vm.master = result.data;
        });

        vm.model = {};

        vm.edit = edit;
        vm.remove = remove;
        vm.save = save;
        vm.clear = clear;
        vm.cancel = cancel;

        function edit(id) {
            $location.path("/master/edit/" + id);
        }

        function remove(id) {
            repository.deleteMasterData(id).then(function (result) {
                $location.path("/master/add");
                repository.getMasterData().then(function (result) {
                    vm.master = result.data;
                });
            });
        }

        function save() {
            repository.addNewMasterData(vm.model).then(function (result) {
                // console.log(result);
                $location.path("/master/add");
                vm.model = {};
                repository.getMasterData().then(function (result_m) {
                    vm.master = result_m.data;
                });
            });
        };

        function clear() {
            vm.model = {};
        };

        function cancel() {
            $location.path("/");
        };
    };
})(angular.module("coachingDashboard"));
