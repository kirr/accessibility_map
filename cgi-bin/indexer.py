import StringIO
import struct
import sys
import urllib2
import xml.etree.ElementTree as ET

#//LAT_OFFSET = 0.005
#//LONG_OFFSET = 0.0075

LAT_OFFSET = 0.02
LONG_OFFSET = 0.03

CITY_TL = [55.916260, 37.320640]
CITY_BR = [55.566246, 37.914602]

# TODO(kirr): max, min
LAT_COUNT = (CITY_TL[0] - CITY_BR[0]) // (2*LAT_OFFSET)
LONG_COUNT = (CITY_BR[1] - CITY_TL[1]) // (2*LONG_OFFSET)
QUADS_COUNT = int(LAT_COUNT * LONG_COUNT)

def QuadCoordsById(quad_id):
    i = quad_id // LONG_COUNT
    j = quad_id % LONG_COUNT
    lat = CITY_BR[0] + i*(2*LAT_OFFSET)
    long = CITY_TL[1] + j*(2*LONG_OFFSET)
    return [lat, long]

if not len(sys.argv) == 2:
    print 'Using undexer.py start_index'
    sys.exit(1)

routes = []
sourceId = int(sys.argv[1])
sourceCoords = QuadCoordsById(sourceId)
ok = True
for i in range(0, QUADS_COUNT):
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
    print routes
    with open(str(sourceId) + '_route.bin', 'wb') as f:
        for data in routes:
            f.write(struct.pack('2I', data[0], data[1]))
        f.close();
