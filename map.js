//LAT_OFFSET = 0.005
//LONG_OFFSET = 0.0075

LAT_OFFSET = 0.04
LONG_OFFSET = 0.06

CITY_TL = [55.916260, 37.320640]
CITY_BR = [55.566246, 37.914602]

// TODO(kirr) max, min
LAT_COUNT = Math.floor((CITY_TL[0] - CITY_BR[0]) / LAT_OFFSET);
LONG_COUNT = Math.floor((CITY_BR[1] - CITY_TL[1]) / LONG_OFFSET);
QUADS_COUNT = LAT_COUNT * LONG_COUNT;

// TODO(kirr): Vanile constants
GREEN = '2bb52b80'
ORANGE = 'ffa50080'
RED = 'ff240080'
DARK_RED = '8b000080'
BLACK = '00000080'

function QuadCoordsById(id) {
  var i = Math.floor(id / LONG_COUNT);
  var j = id % LONG_COUNT;
  var lat = CITY_BR[0] + i*LAT_OFFSET + 0.5 * LAT_OFFSET;
  var long = CITY_TL[1] + j*LONG_OFFSET + 0.5 * LONG_OFFSET;
  return [lat, long];
}

function QuadIdByCoords(coords) {
  var latInd = Math.floor((coords[0] - CITY_BR[0])/LAT_OFFSET);
  var longInd = Math.floor((coords[1] - CITY_TL[1])/LONG_OFFSET);
  return longInd + LONG_COUNT * latInd;
}

function ColorForDuration(time) {
  if (!time)
    return BLACK;

  var d = time / 60;
  if (d < 15)
    return GREEN;
  else if (d < 30)
    return ORANGE;
  else if (d < 45)
    return RED;
  return DARK_RED;
}

ymaps.ready(function () {
  // Yandex Office
  var sourceCoords = [55.733, 37.587];
  var routingMode = 'auto'
  var sourcePoint = null;
  var quads = new Array(LAT_COUNT*LONG_COUNT).fill(null);

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

  function onMapClick(e) {
    sourceCoords = e.get('coords');
    if (!sourcePoint) {
      sourcePoint = new ymaps.Placemark(
          sourceCoords, {}, {preset : 'islands#greenCircleDotIcon'});
      myMap.geoObjects.add(sourcePoint);
    } else {
      sourcePoint.geometry.setCoordinates(sourceCoords);
    }
    searchControl.hideResult();
    updateAccessibilityMap();
  }

  function onSearchShow(e) {
    updateAccessibilityMap();
  }

  function updateAccessibilityMap() {
    clearMap();

    var sourceId = QuadIdByCoords(sourceCoords);
    requestRoutes(sourceId);
  }

  function requestRoutes(sourceId) {
    var routeFilePath = 'routes/' + sourceId + '_route.bin';
    var req = new XMLHttpRequest();
    req.open("GET", routeFilePath, true);
    req.setRequestHeader('Cache-Control', 'no-cache');
    req.responseType = "arraybuffer";
    console.log('request for ' + routeFilePath);

    req.onload = function (oEvent) {
      if (req.status != 200) {
        console.log(req.status + ': ' + req.statusText);
      } else {
        var arrayBuffer = req.response; // Note: not req.responseText
        if (arrayBuffer) {
          var byteArray = new Uint32Array(arrayBuffer);
          for (var i = 0; i < byteArray.length; i = i + 2) {
            onRequestComplete(byteArray[i], byteArray[i+1]);
          }
        }
      }
    };

    req.send(null);
  }

  function onRequestComplete(targetId, time) {
    console.log('request complete ', targetId, time)
    var targetCoords = QuadCoordsById(targetId);
    var quad = quads[targetId];
    if (quad) {
      quad.options.set('fillColor', ColorForDuration(time));
    } else {
      quad = new ymaps.Rectangle(
          [[targetCoords[0] - 0.5*LAT_OFFSET, targetCoords[1] - 0.5*LONG_OFFSET],
           [targetCoords[0] + 0.5*LAT_OFFSET, targetCoords[1] + 0.5*LONG_OFFSET]],
          {},
          {
            fillColor: ColorForDuration(time),
            strokeWidth: 0,
            openBalloonOnClick: false
          });
      quad.events.add('click', onMapClick);
      myMap.geoObjects.add(quad);
      quads[targetId] = quad;
    }
  }

  function clearMap() {
    //myMap.geoObjects.removeAll();
  }

  updateAccessibilityMap();
});
