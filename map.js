// TODO(kirr): Vanile constants
GREEN = '2bb52b80'
ORANGE = 'ffa50080'
RED = 'ff240080'
DARK_RED = '8b000080'
BLACK = '00000080'

ROUTE_ERR_START = 100000000

var sourceCoords = [55.733, 37.587];
var routingMode = 'auto'
var myMap = null
var sourcePoint = null;
var routeTypeSelector = null;

function LoadConfig(configData) {
  var config = configData.configs[configData.current];

  LAT_OFFSET = config.lat_offset
  LONG_OFFSET = config.long_offset

  CITY_TL = [config.area[0], config.area[1]]
  CITY_BR = [config.area[2], config.area[3]]

  // TODO(kirr) max, min
  LAT_COUNT = Math.floor((CITY_TL[0] - CITY_BR[0]) / LAT_OFFSET);
  LONG_COUNT = Math.floor((CITY_BR[1] - CITY_TL[1]) / LONG_OFFSET);
  QUADS_COUNT = LAT_COUNT * LONG_COUNT;

  FILE_DIR = 'routes/' + configData.current;
}

function InitUIBindings() {
  myMap.events.add('click', OnMapClick);

  var autoRouteItem = routeTypeSelector.get(0)
  var masstransitRouteItem = routeTypeSelector.get(1)
  autoRouteItem.events.add('click', OnChangeRoutingMode.bind(null, 'auto'));
  masstransitRouteItem.events.add('click',
      OnChangeRoutingMode.bind(null, 'masstransit'));
}

function LoadJSON() {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        LoadConfig(JSON.parse(xhr.responseText));
        InitUIBindings();
        quads = new Array(LAT_COUNT*LONG_COUNT).fill(null);
        UpdateAccessibilityMap();
      } else {
        console.log('Error in json reuest:' + xhr.statusText);
      }
    }
  };
  xhr.open("GET", 'config.json', true);
  xhr.send();
}

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
  if (!time || time >= ROUTE_ERR_START)
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

function UpdateAccessibilityMap() {
  var sourceId = QuadIdByCoords(sourceCoords);
  RequestRoutes(sourceId);
}

function RequestRoutes(sourceId) {
  var routeFilePath =
      FILE_DIR + '/' + routingMode + '/' + sourceId + '_route.bin';
  var req = new XMLHttpRequest();
  req.open("GET", routeFilePath, true);
  req.setRequestHeader('Cache-Control', 'no-cache');
  req.responseType = "arraybuffer";

  req.onload = function (oEvent) {
    if (req.status != 200) {
      console.log(req.status + ': ' + req.statusText);
    } else {
      var arrayBuffer = req.response; // Note: not req.responseText
      if (arrayBuffer) {
        var byteArray = new Uint32Array(arrayBuffer);
        for (var i = 0; i < byteArray.length; ++i) {
          OnRequestComplete(i, byteArray[i]);
        }
      }
    }
  };

  req.send(null);
}

function OnRequestComplete(targetId, time) {
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
    quad.events.add('click', OnMapClick);
    myMap.geoObjects.add(quad);
    quads[targetId] = quad;
  }
}

function OnMapClick(e) {
  sourceCoords = e.get('coords');
  sourcePoint.geometry.setCoordinates(sourceCoords);
  UpdateAccessibilityMap();
}


function OnChangeRoutingMode(newRoutingMode) {
  if (newRoutingMode != routingMode) {
    routingMode = newRoutingMode;
    UpdateAccessibilityMap();
  }
  routeTypeSelector.collapse();
}

ymaps.ready(function () {
  myMap = new ymaps.Map('map', {
    center: sourceCoords,
    zoom: 11,
  }, {
    searchControlResults: 1,
    searchControlNoCentering: true,
    buttonMaxWidth: 150
  });

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
  myMap.controls.add(routeTypeSelector)

  sourcePoint = new ymaps.Placemark(
      sourceCoords, {}, {preset : 'islands#greenCircleDotIcon'});
  myMap.geoObjects.add(sourcePoint);

  LoadJSON()
});
