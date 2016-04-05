//LAT_OFFSET = 0.0035
//LONG_OFFSET = 0.005

//LAT_OFFSET = 0.005
//LONG_OFFSET = 0.0075

LAT_OFFSET = 0.02
LONG_OFFSET = 0.03

CITY_TL = [55.916260, 37.320640]
CITY_BR = [55.566246, 37.914602]

// TODO(kirr) max, min
LAT_COUNT = Math.floor((CITY_TL[0] - CITY_BR[0]) / (2*LAT_OFFSET));
LONG_COUNT = Math.floor((CITY_BR[1] - CITY_TL[1]) / (2*LONG_OFFSET));
QUADS_COUNT = LAT_COUNT * LONG_COUNT;

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
  var obj = this;
  obj.sourceCoords = QuadCoordsById(id);
  obj.currentProgress = 0;
  obj.routes = [];
  return new Promise(function(resolve, reject) {
    obj.resolveCallback = resolve;
    obj.rejectCallback = reject;
    obj.requestRoutes();
  });
}

Indexer.prototype.requestRoutes = function() {
  this.currentProgressLimit =
      Math.min(this.currentProgress + 10, QUADS_COUNT);
  console.log(this.currentProgressLimit);
  var k = this.currentProgress;
  while (k < this.currentProgressLimit) {
    this.makeRequest(k, 0);
    k = k + 1;
  }
}

Indexer.prototype.makeRequest = function(targetId, errCount) {
  ymaps.route(
    [this.sourceCoords, QuadCoordsById(targetId)],
    {
      routingMode: this.routingMode,
      avoidTrafficJams: true,
      multiRoute:true
    }).done(
        this.onRequestComplete.bind(this, targetId),
        this.onRequestErr.bind(this, targetId, errCount),
        this);
}

Indexer.prototype.onRequestResolved = function(targetId, route) {
  this.currentProgress = this.currentProgress + 1;
  if (this.currentProgress == this.currentProgressLimit) {
    if (this.currentProgressLimit == QUADS_COUNT) {
      this.resolveCallback();
    } else {
      this.requestRoutes();
    }
  }
}

Indexer.prototype.onRequestComplete = function(targetId, route) {
  var distance = 24*60*60;

  var activeRoute = route.getActiveRoute();
  if (activeRoute)
    distance = activeRoute.properties.get('duration').value;
  this.routes.push({id:targetId, distance:distance});
  this.onRequestResolved();
}

Indexer.prototype.onRequestErr = function(targetId, errCount, err) {
  if (errCount > 3) {
    this.onRequestResolved();
    return;
  }
  this.makeRequest(targetId, errCount + 1);
}

ymaps.ready(function () {
  console.log('Welcome!');
});
