import StringIO
import json
import os
import struct
import sys
import urllib2
import xml.etree.ElementTree as ET


def QuadCoordsById(quad_id):
    i = quad_id // long_count
    j = quad_id % long_count
    lat = city_br[0] + i*lat_offset + 0.5*lat_offset
    long = city_tl[1] + j*long_offset + 0.5*long_offset
    return [lat, long]


if not len(sys.argv) == 2:
    print 'Using undexer.py start_index'
    sys.exit(1)

routes = []
configPath = './config.json'
ok = True

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
for i in range(0, quads_count):
    if i == sourceId:
        routes.append([i, 1]) # 1 second
        continue

    targetCoords = QuadCoordsById(i)
    req_str = '{url}?rll={long1},{lat1}~{long2},{lat2}&mode=jams'.format(
            url = 'http://route-net.int01e.tst.maps.yandex.ru/1.x/',
            long1=sourceCoords[1],
            lat1 = sourceCoords[0],
            long2 = targetCoords[1],
            lat2 = targetCoords[0])
    req = urllib2.Request(req_str)
    try:
        response = urllib2.urlopen(req)
        xml_res = StringIO.StringIO(response.read())
        for event, elem in ET.iterparse(xml_res, events=("start", "end")):
            if "jamsTime" in elem.tag:
                routes.append([i, int(float(elem.text))])
                break
    except urllib2.HTTPError as e:
        print req_str, e.code
        ok = False
        break

if ok:
    outDir = './routes/' + configData['current']
    if not os.path.exists(outDir):
        os.makedirs(outDir)
    filePath = '{0}/{1}_route.bin'.format(outDir, sourceId)
    print 'finsihed {0}, {1} routes'.format(filePath, len(routes))
    with open(filePath, 'wb') as f:
        for data in routes:
            f.write(struct.pack('2I', data[0], data[1]))
        f.close();
