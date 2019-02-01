(function (app) {
    "use strict";

    app.controller("AddController", AddController);

    AddController.$inject = ["$location", "toaster", "RepositoryService"];

    function AddController($location, toaster, repository) {
        var vm = this;

        vm.dancers = [];
        repository.getMasterData().then(function (result) {
            for (var row in result.data) {
                var dancer = result.data[row]["name"] + " (" + result.data[row]["type"] + ")";
                if (vm.dancers.includes(dancer) == false) {
                    vm.dancers.push(dancer);
                }
            }
            vm.dancers.sort();
            for (var val in vm.dancers) {
                vm.dancers[val] = { label: vm.dancers[val] };
            }
            vm.dancers.unshift({ label: "Select Dancer", "disabled": true });
            vm.model.dancer = vm.dancers[0].label;
        });

        vm.model = {};

        vm.save = save;
        vm.cancel = cancel;

        function save() {
            repository.createTestrun(vm.model).then(function (result) {
                $location.path("/");
            });
        };

        function cancel() {
            $location.path("/");
        };
    };
})(angular.module("coachingDashboard"));
