//LAT_OFFSET = 0.0035
//LONG_OFFSET = 0.005

LAT_OFFSET = 0.005
LONG_OFFSET = 0.0075

// TODO(kirr) max, min
CITY_TL = [55.916260, 37.320640]
CITY_BR = [55.566246, 37.914602]

LAT_COUNT = (CITY_TL[0] - CITY_BR[0]) / (2*LAT_OFFSET);
LONG_COUNT = (CITY_BR[1] - CITY_TL[1]) / (2*LONG_OFFSET);

function QuadCoordsById(id) {
  var i = Math.floor(id / LONG_COUNT);
  var j = id % LONG_COUNT;
  var lat = CITY_BR[0] + i*(2*LAT_OFFSET);
  var long = CITY_TL[1] + j*(2*LONG_OFFSET);
  return [lat, long];
}

var Indexer = function() {
  this.sourceCoords = [];
  this.routingMode = 'auto';
  this.currentProgress = 0;
  this.currentProgressLimit = 0;
  this.resolveCallback = null;
  this.rejectCallback = null;
}

Indexer.prototype.BuildIndex = function(id) {
  return new Promise(function(resolve, reject) {
    this.sourceCoords = QuadCoordsById(id);
    this.currentProgress = 0;
    this.resolveCallback = resolve;
    this.rejectCallback = reject;
    this.routes = [];

    this.requestRoutes();
  });
}

Indexer.prototype.requestRoutes = function() {
  this.currentProgressLimit =
      Math.min(this.currentProgress + 10, LAT_COUNT * LONG_COUNT);
  while (this.currentProgress < this.currentProgressLimit) {
    makeRequest(this.currentProgress, 0);
    this.currentProgress = this.currentProgress + 1;
  }

  if (this.currentProgress == LAT_COUNT*LONG_COUNT)
    this.resolveCallback();
}

Indexer.prototype.makeRequest = function(targetId, errCount) {
  ymaps.route(
    [sourceCoords, QuadCoordsById(targetId)],
    {
      routingMode: routingMode,
      avoidTrafficJams: true,
      multiRoute:true
    }).done(
        onRequestComplete.bind(this, targetId),
        onRequestErr.bind(this, targetId, errCount),
        this);
}

Indexer.prototype.onRequestComplete = function(targetId, route) {
  var distance = 24*60*60;

  var activeRoute = route.getActiveRoute();
  if (activeRoute)
    distance = activeRoute.properties.get('duration').value;
  this.routes.push({id:targetId, distance:distance});

  currentProgress = currentProgress + 1;
  if (currentProgress == currentProgressLimit)
    requestRoutes(currentProgress);
}

Indexer.prototype.onRequestErr = function(targetId, errCount, err) {
  if (errCount > 3) {
    currentProgress = currentProgress + 1;
    if (currentProgress == currentProgressLimit)
      requestRoutes();
    return;
  }
  makeRequest(targetId, errCount + 1);
}

ymaps.ready(function () {
  console.log('Welcome!');
});
