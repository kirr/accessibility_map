import getopt
import json
import logging
from collections import namedtuple
import os
import struct
import sys

import indexer
import poly_viewer
import quads

config_path = './config.json'
route_mode = 'auto'
current_config = None


def make_dir_for_file(file_path):
    out_dir = os.path.dirname(file_path)
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)

def print_man():
    print """run.py start_index end_index\n
    Options:\n
    -h, --help prints this message\n
    -m, --mode router mode ('auto', 'masstransit')\n
    -c, --config set config file \n
    -s, --size print quads count for current configuration\n
    -l, --log log level DEBUG, INFO, WARNING, ERROR\n
    --districts-index build a district map to cofig points index\n
    """


def parse_config():
    config_data = {}
    with open(config_path) as json_file:
        config_data = json.load(json_file)

    global current_config_name
    current_config_name = config_data['current']
    config = config_data['configs'][current_config_name]

    # TODO(kirr): dictionary instead turple
    IndexerParams = namedtuple(
            'IndexerParams',
            ['lat_offset',
             'long_offset',
             'city_tl',
             'city_br',
             'get_reuest_url_func'])
    return IndexerParams(
        lat_offset=config['lat_offset'],
        long_offset=config['long_offset'],
        city_tl=[config['area'][0], config['area'][1]],
        city_br=[config['area'][2], config['area'][3]],
        get_reuest_url_func=get_route_request_url)


# TODO(kirr) : if should be invoked once
def get_route_request_url(source_coords, target_coords):
    template = ''
    if route_mode == 'auto-test':
        template = 'http://route-net.int01e.tst.maps.yandex.ru/1.x/?rll={long1},{lat1}~{long2},{lat2}&mode=jams'
    elif route_mode == 'masstransit-test':
        template = 'http://masstransit-net.int01e.tst.maps.yandex.ru/1.x/?rll={long1},{lat1}~{long2},{lat2}&lang=ru_RU'
    elif route_mode == 'auto':
        template = 'http://route.maps.yandex.net/1.x/?rll={long1},{lat1}~{long2},{lat2}&mode=jams'
    elif route_mode == 'masstransit':
        template = 'http://masstransit.maps.yandex.net/1.x/?rll={long1},{lat1}~{long2},{lat2}&lang=ru_RU'
    else:
        assert False, 'Unknown route mode {0}'.format(route_mode)
    return template.format(long1=source_coords[1], lat1=source_coords[0],
                           long2=target_coords[1], lat2=target_coords[0])


try:
    opts, args = getopt.getopt(
            sys.argv[1:],
            'hm:c:sl:',
            ['help', 'mode=', 'config=', 'log=', 'size', 'districts-index'])
except getopt.GetoptError:
    print_man()
    sys.exit(2)

for opt, arg in opts:
    if opt in ('-h', '--help'):
        print_man()
        sys.exit()
    elif opt in ("-m", "--mode"):
        route_mode = arg
    elif opt in ("-c", "--config"):
        config_path = arg
    elif opt in ("-l", "--log"):
        numeric_level = getattr(logging, arg.upper(), None)
        if not isinstance(numeric_level, int):
            raise ValueError('Invalid log level: %s' % loglevel)
        logging.basicConfig(level=numeric_level)
    elif opt in ("-s", "--size"):
        print quads.MapCoordsIndexer(params).quads_count
        sys.exit()
    elif opt in ("--districts-index"):
        poly_viewer.init(parse_config())
        res_path = os.path.join('routes', current_config_name, 'ymaps.geojson')
        make_dir_for_file(res_path)
        poly_viewer.build_district_index('./mo.geojson', res_path)
        sys.exit()

start_index = int(args[0])
end_index = int(args[1])

indexer.init(parse_config())
for i in range(start_index, end_index):
    routes, err = indexer.build_routes(i)
    if not routes:
        continue

    routes_mode_dir = 'masstransit' if 'masstransit' in route_mode else 'auto'
    file_path = os.path.join('routes', current_config_name,
                             routes_mode_dir, str(i) + '_route.bin')
    make_dir_for_file(file_path)
    logging.info('finsihed %s, %d routes', file_path, len(routes))
    with open(file_path, 'w') as json_output_file:
        json.dump(routes, json_output_file)
