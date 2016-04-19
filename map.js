GREEN = '2bb52b80'
DARK_GREEN = '0c590c80'
ORANGE = 'ffa50090'
DARK_ORANGE = 'fca611f0'
RED = 'ff000080'
DARK_RED = 'ec1e03f0'
BLACK = '00000080'

ROUTE_ERR_START = 100000000

var sourceCoords = [55.733, 37.587];
var routingMode = 'auto'
var myMap = null
var sourcePoint = null;
var routeTypeSelector = null;
var districts = null
var DurationHintLayout = null

function LoadConfig(configData) {
  var config = configData.configs[configData.current];

  CITY_TL = [config.area[0], config.area[1]]
  CITY_BR = [config.area[2], config.area[3]]

  LAT_OFFSET = config.lat_offset
  LONG_OFFSET = config.long_offset
  LONG_COUNT = Math.floor((CITY_BR[1] - CITY_TL[1]) / LONG_OFFSET);

  FILE_DIR = 'routes/' + configData.current;
  DISTRICTS_JSON = 'routes/' + configData.current + '/ymaps.geojson'
}

function InitUIBindings() {
  myMap.events.add('click', OnMapClick);

  var autoRouteItem = routeTypeSelector.get(0)
  var masstransitRouteItem = routeTypeSelector.get(1)
  autoRouteItem.events.add('click', OnChangeRoutingMode.bind(null, 'auto'));
  masstransitRouteItem.events.add('click',
      OnChangeRoutingMode.bind(null, 'masstransit'));
}

function LoadJSON(url, success) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        success(xhr.responseText)
      } else {
        console.log('Error in json reuest:' + xhr.statusText);
      }
    }
  };
  xhr.open("GET", url, true);
  xhr.setRequestHeader('Cache-Control', 'no-cache');
  xhr.send();
}

function AddPolygon(name, vertexes) {
  var outer_coords = vertexes[0].map(
      function(coords) { return [coords[1], coords[0]]; });
  var inner_coords = []
  if (vertexes[1]) {
    inner_coords = vertexes[1].map(
        function(coords) { return [coords[0], coords[1]]; });
  }

  var mapPoly = new ymaps.Polygon(
    [outer_coords, inner_coords],
    {hintContent: name},
    {
      fillColor: '#6699ff',
      interactivityModel: 'default#transparent',
      strokeWidth: 2,
      opacity: 0.5
    });

  districts[name].geometry.push(mapPoly)
  myMap.geoObjects.add(mapPoly);
}

function LoadDistricts(districts_json_text) {
  json = JSON.parse(districts_json_text);
  districts = {}
  for (var i = 0; i < json.features.length; ++i) {
    var district = json.features[i];
    var districtName = district.properties.NAME;
    districts[districtName] = {geometry:[], index:district.properties.index};
    if (district.geometry.type == 'Polygon')
      AddPolygon(districtName, district.geometry.coordinates);
    else if (district.geometry.type == 'MultiPolygon') {
      for (var j = 0; j < district.geometry.coordinates.length; ++j)
        AddPolygon(districtName, district.geometry.coordinates[j]);
    }
  }
  InitUIBindings();
  UpdateAccessibilityMap();
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
    return DARK_GREEN;
  else if (d < 45)
    return ORANGE;
  else if (d < 60)
    return RED;
  return DARK_RED;
}

function UpdateAccessibilityMap() {
  var sourceId = QuadIdByCoords(sourceCoords);
  RequestRoutes(sourceId);
}

function RequestRoutes(sourceId) {
  var routeFilePath =
      FILE_DIR + '/' + routingMode + '/' + sourceId + '_time.json';
  var req = new XMLHttpRequest();
  req.open("GET", routeFilePath, true);
  req.setRequestHeader('Cache-Control', 'no-cache');

  req.onload = function (oEvent) {
    if (req.status != 200) {
      console.log(req.status + ': ' + req.statusText);
    } else {
      var durations = JSON.parse(req.responseText)
      for (var d in districts) {
        var district = districts[d];
        var points_count = district.index.length;
        var info = district.index.reduce(
            function(pv, cv) {
              var d = durations[cv];
              if (d >= ROUTE_ERR_START)
                return pv;
              pv.max = Math.max(pv.max, d);
              pv.min = Math.min(pv.min, d);
              pv.avg = pv.avg + d/points_count;
              return pv;
            }, {min:ROUTE_ERR_START, max:0, avg:0});
        console.log(d, info);

        for (var i = 0; i < district.geometry.length; ++i) {
          var poly = district.geometry[i];
          poly.properties.set({
              name:d,
              duration_min:Math.floor(info.min/60),
              duration_max:Math.floor(info.max/60)});
          poly.options.set('fillColor', ColorForDuration(info.avg));
          poly.options.set('hintContentLayout', DurationHintLayout);
        }
      }
    }
  };

  req.send(null);
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

  DurationHintLayout = ymaps.templateLayoutFactory.createClass(
      '<p>{{properties.name}}.</p><p>Время поездки: {{properties.duration_min}} - {{properties.duration_max}} минут.</p>');
  LoadJSON('config.json', function(responseText){
      LoadConfig(JSON.parse(responseText));
      LoadJSON(DISTRICTS_JSON, LoadDistricts)
  })
});
