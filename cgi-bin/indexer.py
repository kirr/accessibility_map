import StringIO
import logging
import urllib2
import xml.etree.ElementTree as ET

import quads

REQ_ERR_HTTP = 100000000
REQ_ERR_RESPONSE = REQ_ERR_HTTP + 1
REQ_ERR_SKIPPED = REQ_ERR_HTTP + 2


def is_error(duration):
    return duration == REQ_ERR_HTTP or duration == REQ_ERR_RESPONSE


def move_for_direction(coords, direction):
    if direction == 0:
        return coords

    lat_step = quad_indexer.lat_offset / 8
    long_step = quad_indexer.long_offset / 8
    if direction > 2:
        lat_step = -lat_step
    if direction % 2 == 0:
        long_step = -long_step
    return [coords[0] + lat_step, coords[1] + long_step]


def make_duration_request(source_coords, target_coords,
                          repeat_count=0, direction=0):
    target_coords = move_for_direction(target_coords, direction)
    req_str = get_reuest_url_func(source_coords, target_coords)
    req = urllib2.Request(req_str)
    try:
        response = urllib2.urlopen(req)
        # TODO(kirr): excessive copy
        response_text = response.read()
        xml_res = StringIO.StringIO(response_text)
        for event, elem in ET.iterparse(xml_res, events=("start", "end")):
            # TODO(kirr): separate "jamsTime" and "time" by route type.
            if "jamsTime" in elem.tag or "time" in elem.tag:
                logging.debug('%d->%d: ok %s',
                              quad_indexer.quad_id_by_coords(source_coords),
                              quad_indexer.quad_id_by_coords(target_coords),
                              elem.text)
                return int(float(elem.text))
        # TODO(kirr): Check for directions
        if repeat_count < 5:
            return make_duration_request(source_coords, target_coords,
                                         repeat_count + 1, direction + 1)
        logging.warning('No duration info finded for %s', req_str)
        return REQ_ERR_RESPONSE
    except urllib2.HTTPError as e:
        if repeat_count < 3:
            logging.warning('HTTP error while getting %d->%d. %s: %d',
                            quad_indexer.quad_id_by_coords(source_coords),
                            quad_indexer.quad_id_by_coords(target_coords),
                            req_str, e.code)
            return make_duration_request(source_coords, target_coords,
                                         repeat_count + 1, direction)
        return REQ_ERR_HTTP


def init(params, excluded_points_list):
    global quad_indexer
    global get_reuest_url_func
    global excluded_points
    global _is_init

    quad_indexer = quads.MapCoordsIndexer(params)
    get_reuest_url_func = params.get_reuest_url_func
    excluded_points = set(excluded_points_list)

    _is_init = True


def build_routes(quad_id):
    assert _is_init

    source_coords = quad_indexer.quad_coords_by_id(quad_id)
    routes = []
    err = False
    for i in range(quad_indexer.quads_count):
        if i == quad_id:
            routes.append(1)  # 1 second
            continue
        if i in excluded_points:
            routes.append(REQ_ERR_SKIPPED)
            continue

        target_coords = quad_indexer.quad_coords_by_id(i)
        duration = make_duration_request(source_coords, target_coords)
        err = err | is_error(duration)
        routes.append(duration)
    return routes, err
