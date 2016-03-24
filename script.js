ymaps.ready(function () {

  // Yandex Office
  var sourceCoords = [55.733, 37.587];

  myMap = new ymaps.Map('map', {
    center: sourceCoords,
    zoom: 11,
    controls:['searchControl']
  }, {
    searchControlResults: 1,
    searchControlNoCentering: true,
    buttonMaxWidth: 150
  });

  searchControl = myMap.controls.get('searchControl');

  routeTypeSelector = new ymaps.control.ListBox({
    data: {
      content: 'Acessible by:'
    },
    items: [
      new ymaps.control.ListBoxItem('Auto'),
      new ymaps.control.ListBoxItem('Public transport')
    ],
    options: {
      itemSelectOnClick: false
    }
  });

  autoRouteItem = routeTypeSelector.get(0)
  masstransitRouteItem = routeTypeSelector.get(1)
  myMap.controls.add(routeTypeSelector)

  sourcePoint = new ymaps.Placemark(sourceCoords, {}, { preset: 'islands#redCircleDotIcon' });
  myMap.geoObjects.add(sourcePoint);

  //autoRouteItem.events.add('click', function (e) { updateAccessibilityMap('auto', e.get('target')); });
  //masstransitRouteItem.events.add('click', function (e) { updateAccessibilityMap('masstransit', e.get('target')); });

  myMap.events.add('click', onMapClick);
  searchControl.events.add('resultshow', onSearchShow);

  function onMapClick(e) {
    sourceCoords = e.get('coords');
    sourcePoint.geometry.setCoordinates(sourceCoords);
    searchControl.hideResult();
    updateAccessibilityMap();
  }

  function onSearchShow(e) {
    clearSourcePoint(true);
    sourcePoint = searchControl.getResultsArray()[e.get('index')];
    updateAccessibilityMap();
  }

  function updateAccessibilityMap() {
    var targetCoords = [55.8505, 37.419479];
    ymaps.route(
      [sourceCoords, targetCoords],
      {routingMode: 'auto'}).done(function(route) {
        var duration = route.getTime() / 60;
        console.log(duration);
        var zoneRect = new ymaps.Rectangle(
            [[targetCoords[0] - 0.01, targetCoords[1] - 0.01],
             [targetCoords[0] + 0.01, targetCoords[1] + 0.01]],
            {},
            {fillColor:'0066ff99'});
            myMap.geoObjects.add(zoneRect);
      }, function(err) {
        throw err;
      }, this);
  }

  updateAccessibilityMap();
});
