ymaps.ready(function () {
  // TODO(kirr): Vanile constants
  GREEN = '2bb52b80'
  ORANGE = 'ffa50080'
  RED = 'ff240080'
  DARK_RED = '8b000080'
  BLACK = '00000080'

  //LAT_OFFSET = 0.0035
  //LONG_OFFSET = 0.005

  LAT_OFFSET = 0.005
  LONG_OFFSET = 0.0075

  //LAT_OFFSET = 0.02
  //LONG_OFFSET = 0.03

  CITY_TL = [55.916260, 37.320640]
  CITY_BR = [55.566246, 37.914602]

  // Yandex Office
  var sourceCoords = [55.733, 37.587];
  var routingMode = 'auto'
  var currentProgress = 0
  var currentProgressLimit = 0

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

  function colorForRoute(route) {
    if (!route)
      return BLACK;

    var d = route.properties.get('duration').value / 60;
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
    searchControl.hideResult();
    updateAccessibilityMap();
  }

  function onSearchShow(e) {
    updateAccessibilityMap();
  }

  function updateAccessibilityMap() {
    clearMap();

    currentProgress = 0;
    requestRoutes(0);
  }

  function requestRoutes(progress) {
    // TODO(kirr) max, min
    var lat_count = (CITY_TL[0] - CITY_BR[0]) / (2*LAT_OFFSET);
    var long_count = (CITY_BR[1] - CITY_TL[1]) / (2*LONG_OFFSET);
    currentProgressLimit = Math.min(progress + 10, lat_count * long_count);
    for (var k=progress; k<currentProgressLimit; ++k) {
      var i = Math.floor(k / long_count);
      var j = k % long_count;
      var lat = CITY_BR[0] + i*(2*LAT_OFFSET);
      var long = CITY_TL[1] + j*(2*LONG_OFFSET);
      makeRequest([lat, long], 0);
    }
  }

  function makeRequest(targetCoords, errCount) {
    ymaps.route(
      [sourceCoords, targetCoords],
      {
        routingMode: routingMode,
        avoidTrafficJams: true,
        multiRoute:true
      }).done(
          onRequestComplete.bind(null, targetCoords),
          onRequestErr.bind(null, targetCoords, errCount),
          this);
  }

  function onRequestComplete(targetCoords, route) {
    var zoneRect = new ymaps.Rectangle(
        [[targetCoords[0] - LAT_OFFSET, targetCoords[1] - LONG_OFFSET],
         [targetCoords[0] + LAT_OFFSET, targetCoords[1] + LONG_OFFSET]],
        {},
        {
          fillColor: colorForRoute(route.getActiveRoute()),
          strokeWidth: 0,
          openBalloonOnClick: false
        });
    zoneRect.events.add('click', onMapClick);
    myMap.geoObjects.add(zoneRect);

    currentProgress = currentProgress + 1;
    if (currentProgress == currentProgressLimit)
      requestRoutes(currentProgress);
  }

  function onRequestErr(targetCoords, errCount, err) {
    if (errCount > 3) {
      currentProgress = currentProgress + 1;
      if (currentProgress == currentProgressLimit)
        requestRoutes(currentProgress);
      return;
    }
    makeRequest(targetCoords, errCount + 1);
  }

  function clearMap() {
    myMap.geoObjects.removeAll();
    sourcePoint = new ymaps.Placemark(sourceCoords, {},
        { preset: 'islands#greenCircleDotIcon' });
    myMap.geoObjects.add(sourcePoint);

  }

  updateAccessibilityMap();
});
