import StringIO
import json
import logging
import os
import struct
import sys
import urllib2
import xml.etree.ElementTree as ET

REQ_ERR_HTTP = 100000000
REQ_ERR_RESPONSE = REQ_ERR_HTTP + 1

def IsError(duration):
    return duration == REQ_ERR_HTTP or duration == REQ_ERR_RESPONSE


def QuadCoordsById(quad_id):
    i = quad_id // long_count
    j = quad_id % long_count
    lat = city_br[0] + i*lat_offset + 0.5*lat_offset
    long = city_tl[1] + j*long_offset + 0.5*long_offset
    return [lat, long]

def MoveForDirection(coords, direction):
    if direction == 0:
        return coords

    lat_step = lat_offset / 8
    long_step = long_offset / 8
    if direction > 2:
        lat_step = -lat_step
    if direction % 2 == 0:
        long_step = -long_step
    return [coords[0] + lat_step, coords[1] + long_step]

def MakeDurationReuest(quad_id, repeat_count=0, direction=0):
    # TODO(kirr): get coords from parameter
    targetCoords = QuadCoordsById(quad_id)
    targetCoords = MoveForDirection(targetCoords, direction)
    req_str = '{url}?rll={long1},{lat1}~{long2},{lat2}&mode=jams'.format(
            url = 'http://route-net.int01e.tst.maps.yandex.ru/1.x/',
            long1=sourceCoords[1],
            lat1 = sourceCoords[0],
            long2 = targetCoords[1],
            lat2 = targetCoords[0])
    req = urllib2.Request(req_str)
    try:
        response = urllib2.urlopen(req)
        responseText = response.read()
        xml_res = StringIO.StringIO(responseText)
        for event, elem in ET.iterparse(xml_res, events=("start", "end")):
            if "jamsTime" in elem.tag:
                logging.debug('%d: ok %s', quad_id, elem.text)
                return int(float(elem.text))
        # TODO(kirr): Check for directions
        if repeat_count < 5:
            return MakeDurationReuest(quad_id, repeat_count + 1, direction + 1)
        logging.warning('No duration info finded for %d', quad_id)
        return REQ_ERR_RESPONSE
    except urllib2.HTTPError as e:
        if repeat_count < 3:
            logging.warning('HTTP error while getting %d. %s: %d',
                    quad_id, req_str, e.code)
            return MakeReuest(quad_id, repeat_count + 1, direction)
        return REQ_ERR_HTTP

if len(sys.argv) < 2:
    print 'Using indexer.py start_index'
    sys.exit(1)

logging.basicConfig(level=logging.INFO)

configPath = './config.json'
with open(configPath) as jsonFile:
    configData = json.load(jsonFile)
    config = configData['configs'][configData['current']]

lat_offset = config['lat_offset']
long_offset = config['long_offset']

city_tl = [config['area'][0], config['area'][1]]
city_br = [config['area'][2], config['area'][3]]

#TODO(kirr) : max, min
lat_count = (city_tl[0] - city_br[0]) // lat_offset
long_count = (city_br[1] - city_tl[1]) // long_offset
quads_count = int(lat_count * long_count)

sourceId = int(sys.argv[1])
sourceCoords = QuadCoordsById(sourceId)
routes = []
ok = True
for i in range(0, quads_count):
    if i == sourceId:
        routes.append(1) # 1 second
        continue

    duration = MakeDurationReuest(i)
    ok = ok & (not IsError(duration))
    routes.append(duration)

outDir = os.path.join('routes', configData['current'])
if not ok:
    outDir = os.path.join(outDir, 'err')

if not os.path.exists(outDir):
    os.makedirs(outDir)
filePath = os.path.join(outDir, str(sourceId) + '_route.bin')
logging.info('finsihed %s, %d routes', filePath, len(routes))
with open(filePath, 'wb') as f:
    for duration in routes:
        f.write(struct.pack('I', duration))
    f.close();
