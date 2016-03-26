ymaps.ready(function () {
  // TODO(kirr): Vanile constants
  GREEN = '2bb52b80'
  ORANGE = 'ffa50080'
  RED = 'ff240080'
  DARK_RED = '8b000080'

  //LAT_OFFSET = 0.005
  //LONG_OFFSET = 0.0075

  LAT_OFFSET = 0.01
  LONG_OFFSET = 0.015

  CITY_TL = [55.942765, 37.285086]
  CITY_BR = [55.572470, 37.904602]

  // Yandex Office
  var sourceCoords = [55.733, 37.587];
  var routingMode = 'auto'

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

  autoRouteItem.events.add('click', onChangeRoutingMode.bind(null, 'auto'));
  masstransitRouteItem.events.add('click',
      onChangeRoutingMode.bind(null, 'masstransit'));

  myMap.events.add('click', onMapClick);
  searchControl.events.add('resultshow', onSearchShow);

  function onChangeRoutingMode(newRoutingMode) {
    if (newRoutingMode != routingMode) {
      routingMode = newRoutingMode;
      updateAccessibilityMap();
    }
    routeTypeSelector.collapse();
  }

  function colorForDuration(durationSec) {
    var d = durationSec / 60;
    if (d < 15)
      return GREEN;
    else if (d < 30)
      return ORANGE;
    else if (d < 45)
      return RED;
    return DARK_RED;
  }

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
    clearMap();

    // TODO(kirr) max, min
    // TODO(kirr) sequential loading
    for (var lat = CITY_BR[0]; lat < CITY_TL[0]; lat = lat + 2*LAT_OFFSET) {
      for (var long = CITY_TL[1]; long < CITY_BR[1]; long = long + 2*LONG_OFFSET) {
        var targetCoords = [lat, long];
        ymaps.route(
          [sourceCoords, targetCoords],
          {
            routingMode: routingMode,
            avoidTrafficJams: true,
            multiRoute:true
          }).done(
              addZone.bind(null, targetCoords),
              function(err) {
                throw err;
              }, this);
      }
    }
  }

  function addZone(targetCoords, route) {
    var activeRoute = route.getActiveRoute();
    var zoneRect = new ymaps.Rectangle(
        [[targetCoords[0] - LAT_OFFSET, targetCoords[1] - LONG_OFFSET],
         [targetCoords[0] + LAT_OFFSET, targetCoords[1] + LONG_OFFSET]],
        {},
        {
          fillColor:
            colorForDuration(activeRoute.properties.get('duration').value),
          strokeWidth:0,
          openBalloonOnClick:false
        });
    zoneRect.events.add('click', onMapClick);
    myMap.geoObjects.add(zoneRect);
  }

  function clearMap() {
    myMap.geoObjects.removeAll();
    sourcePoint = new ymaps.Placemark(sourceCoords, {},
        { preset: 'islands#greenCircleDotIcon' });
    myMap.geoObjects.add(sourcePoint);

  }

  updateAccessibilityMap();
});
