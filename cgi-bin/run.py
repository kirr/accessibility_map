import getopt
import indexer
import json
import logging
from collections import  namedtuple
import os
import struct
import sys

configPath = './config.json'
routeMode = 'auto'
currentConfig = None

def PrintMan():
    print """run.py start_index end_index\n
    Options:\n
    -c, --config set config file \n
    -s, --size print quads count for current configuration\n
    -l, --log log level DEBUG, INFO, WARNING, ERROR\n
    -h, --help prints this message"""


def LoadConfig():
    configData = {}
    with open(configPath) as jsonFile:
        configData = json.load(jsonFile)

    global currentConfigName
    currentConfigName = configData['current']
    config = configData['configs'][currentConfigName]

    #TODO(kirr): dictionary instead turple
    IndexerParams = namedtuple('IndexerParams',
        ['lat_offset', 'long_offset',
         'city_tl', 'city_br', 'get_reuest_url_func'])
    p = IndexerParams(
        lat_offset = config['lat_offset'],
        long_offset = config['long_offset'],
        city_tl = [config['area'][0], config['area'][1]],
        city_br = [config['area'][2], config['area'][3]],
        get_reuest_url_func = GetRouteRequestURL
    );

    indexer.Init(p)

# TODO(kirr): if should be invoked once
def GetRouteRequestURL(source_coords, target_coords):
    template = ''
    if routeMode == 'auto-test':
        template = 'http://route-net.int01e.tst.maps.yandex.ru/1.x/?rll={long1},{lat1}~{long2},{lat2}&mode=jams'
    elif routeMode == 'masstransit-test':
        template = 'http://masstransit-net.int01e.tst.maps.yandex.ru/1.x/?rll={long1},{lat1}~{long2},{lat2}&lang=ru_RU'
    elif routeMode == 'auto':
        template = 'http://route.maps.yandex.net/1.x/?rll={long1},{lat1}~{long2},{lat2}&mode=jams'
    elif routeMode == 'masstransit':
        template = 'http://masstransit.maps.yandex.net/1.x/?rll={long1},{lat1}~{long2},{lat2}&lang=ru_RU'
    else:
        assert 'Unknown route mode {0}'.format(routeMode)
    return template.format(long1=source_coords[1], lat1 = source_coords[0],
                           long2 = target_coords[1], lat2 = target_coords[0])

try:
    opts, args = getopt.getopt(sys.argv[1:], 'hm:c:sl:', ['help', 'mode=', 'config=', 'size', 'log='])
except getopt.GetoptError:
    PrintMan()
    sys.exit(2)

for opt, arg in opts:
    if opt in ('-h', '--help'):
        PrintMan()
        sys.exit()
    elif opt in ("-m", "--mode"):
        routeMode = arg
    elif opt in ("-c", "--config"):
        configPath = arg
    elif opt in ("-l", "--log"):
        numeric_level = getattr(logging, arg.upper(), None)
        if not isinstance(numeric_level, int):
            raise ValueError('Invalid log level: %s' % loglevel)
        logging.basicConfig(level=numeric_level)
    elif opt in ("-s", "--size"):
        LoadConfig()
        print indexer.quads_count
        sys.exit()

start_index = int(args[0])
end_index = int(args[1])

LoadConfig()
for i in range(start_index, end_index):
    routes, err = indexer.BuildRoutes(i)
    if not routes:
        continue

    routesModeDir = 'masstransit' if 'masstransit' in routeMode else 'auto'
    outDir = os.path.join('routes', currentConfigName, routesModeDir)
    if err:
        outDir = os.path.join(outDir, 'err')

    if not os.path.exists(outDir):
        os.makedirs(outDir)
    filePath = os.path.join(outDir, str(i) + '_route.bin')
    logging.info('finsihed %s, %d routes', filePath, len(routes))
    with open(filePath, 'wb') as f:
        for duration in routes:
            f.write(struct.pack('I', duration))
        f.close();