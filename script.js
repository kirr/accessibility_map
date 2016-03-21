ymaps.ready(function () {

  // Yandex Office
  var sourceCoords = [55.733, 37.587],

  myMap = new ymaps.Map('map', {
    center: targetCoords,
    zoom: 11,
    controls:['searchControl']
  }, {
    searchControlResults: 1,
    searchControlNoCentering: true,
    buttonMaxWidth: 150
  }),

  searchControl = myMap.controls.get('searchControl'),

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
  }),

  autoRouteItem = routeTypeSelector.get(0)
  masstransitRouteItem = routeTypeSelector.get(1)
  myMap.controls.add(routeTypeSelector)

  sourcePoint = new ymaps.Placemark(sourceCoords, {}, { preset: 'islands#redCircleDotIcon' }),
  myMap.geoObjects.add(sourcePoint);

  autoRouteItem.events.add('click', function (e) { updateAccessibilityMap('auto', e.get('target')); });
  masstransitRouteItem.events.add('click', function (e) { updateAccessibilityMap('masstransit', e.get('target')); });

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
    // Создаём маршрут нужного типа из начальной в конечную точку.
    currentRoute = new ymaps.multiRouter.MultiRoute({
        referencePoints: [sourcePoint, targetPoint],
        params: { routingMode: routingMode }
    }, {
        boundsAutoApply: true
    });

    // Добавляем маршрут на карту.
    myMap.geoObjects.add(currentRoute);
  }

  function clearRoute () {
    myMap.geoObjects.remove(currentRoute);
    currentRoute = currentRoutingMode = null;
  }
});
