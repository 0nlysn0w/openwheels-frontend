'use strict';

angular.module('owm.resource.search', [
  'owm.resource.search.list',
  'owm.resource.search.map'
])

  .controller('ResourceSearchController', function (
      $location,
      $scope,
      $state,
      $stateParams,
      $modal,
      $filter,
      appConfig,
      Geocoder,
      alertService,
      resourceService,
      resourceQueryService,
      user
  ) {

    $scope.searching = false;

    var DEFAULT_LOCATION = {
      // Utrecht, The Netherlands
      latitude : 52.091667,
      longitude: 5.117778000000044
    };

    var query = resourceQueryService.data;

    $scope.booking = {};
    $scope.resources = [];
    $scope.place = '';

    $scope.completePlacesOptions = {
      country: $filter('translateOrDefault')('SEARCH_COUNTRY', 'nl'),
      watchEnter: true
    };

    $scope.filters = {
      props: {
        radius: undefined
      },
      filters: {},
      options: {
        'airconditioning'    : false,
        'fietsendrager'      : false,
        'winterbanden'       : false,
        'kinderzitje'        : false,
        'navigatie'          : false,
        'trekhaak'           : false,
        'automaat'           : false,
        'mp3-aansluiting'    : false,
        'rolstoelvriendelijk': false
      }
    };

    init();

    function init () {
      if (query.timeFrame) {
        $scope.booking.beginRequested = query.timeFrame.startDate;
        $scope.booking.endRequested   = query.timeFrame.endDate;
      }

      if (query.radius) {
        $scope.filters.props.radius = query.radius;
      }

      if (query.options) {
        query.options.forEach(function (key) {
          $scope.filters.options[key] = true;
        });
      }

      if (query.filters) {
        $scope.filters.filters = query.filters;
      }

      $scope.place = query.text;

      doSearch();
    }

    function doSearch () {
      // time frame
      resourceQueryService.setTimeFrame({
        startDate: $scope.booking.beginRequested,
        endDate  : $scope.booking.endRequested
      });

      // radius
      resourceQueryService.setRadius($scope.filters.props.radius);

      // options
      var optionsArray = Object.keys($scope.filters.options).filter(function(e) { return $scope.filters.options[e]; });
      resourceQueryService.setOptions(optionsArray);

      // filters
      var filtersObject = $scope.filters.filters;
      resourceQueryService.setFilters(filtersObject);

      updateUrl();

      // construct api call
      var params = {};
      if (query.location)  { params.location  = query.location;  }
      if (query.timeFrame) { params.timeFrame = query.timeFrame; }
      if (query.radius)    { params.radius    = query.radius; }
      if (query.options)   { params.options   = query.options; }
      if (query.filters)   { params.filters   = query.filters; }

      if (!params.location) {
        if (user.isAuthenticated) {
          params.person = user.identity.id;
        } else {
          params.location = DEFAULT_LOCATION;
        }
      }

      alertService.load();
      $scope.searching = true;
      return resourceService.search(params).then(function (resources) {
        $scope.resources = resources;
        return resources;
      })
      .catch(function (err) {
        alertService.addError(err);
      })
      .finally(function () {
        $scope.searching = false;
        alertService.loaded();
      });
    }

    //select timeframe modal
    $scope.selectTimeframe = function () {
      $modal.open({
        templateUrl: 'booking/timeframe/booking-timeframe-modal.tpl.html',
        controller: 'BookingTimeframeController',
        resolve: {
          booking: function () {
            return angular.copy($scope.booking);
          }
        }
      }).result.then(function (booking) {
          $scope.booking = booking;
          return doSearch();
        });
    };

    $scope.removeTimeframe = function () {
      $scope.booking.beginRequested = null;
      $scope.booking.endRequested = null;
      return doSearch();
    };

    //select filters modal
    $scope.setFilters = function () {
      $modal.open({
        templateUrl: 'resource/filter/resource-filter-modal.tpl.html',
        controller: 'ResourceFilterController',
        resolve: {
          props: function ( ){
            return $scope.filters.props;
          },
          filters: function () {
            return $scope.filters.filters;
          },
          options: function () {
            return $scope.filters.options;
          }
        }
      }).result.then(function (selected) {
          $scope.filters.props   = selected.props;
          $scope.filters.filters = selected.filters;
          $scope.filters.options = selected.options;
          return doSearch();
        });
    };

    $scope.sidebarFiltersChanged = function () {
      doSearch();
    };

    $scope.$watch('placeDetails', function (newVal, oldVal) {
      if (!newVal || (newVal === oldVal)) {
        return;
      }
      resourceQueryService.setLocation({
        latitude : newVal.geometry.location.lat(),
        longitude: newVal.geometry.location.lng()
      });
      resourceQueryService.setText(newVal.formatted_address);
      return doSearch();
    });

    $scope.removeTimeframe = function () {
      $scope.booking.beginRequested = null;
      $scope.booking.endRequested = null;
      return doSearch();
    };

    function updateUrl () {
      $location.search(resourceQueryService.createStateParams());
    }

    $scope.toggleMap = function toggleMap(){
      if(! $state.includes('^.map')){
        $state.go('^.map').then(updateUrl);
      }else{
        $state.go('^.list').then(updateUrl);
      }
    };

    $scope.selectResource = function (resource) {
      var params = resourceQueryService.createStateParams();
      params.resourceId = resource.id;
      $state.go('owm.resource.show', params);
    };

  });
