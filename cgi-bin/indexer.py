import StringIO
import logging
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

def QuadIdByCoords(coords):
    lat_ind = (coords[0] - city_br[0]) // lat_offset
    long_ind = (coords[1] - city_tl[1]) // long_offset
    return long_ind + long_count*lat_ind


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

def MakeDurationReuest(source_coords, target_coords, repeat_count=0, direction=0):
    target_coords = MoveForDirection(target_coords, direction)
    req_str = get_reuest_url_func(source_coords, target_coords)
    req = urllib2.Request(req_str)
    try:
        response = urllib2.urlopen(req)
        # TODO(kirr): excessive copy
        responseText = response.read()
        xml_res = StringIO.StringIO(responseText)
        for event, elem in ET.iterparse(xml_res, events=("start", "end")):
            # TODO(kirr): separate "jamsTime" and "time" by route type.
            if "jamsTime" in elem.tag or "time" in elem.tag:
                logging.debug('%d->%d: ok %s',
                    QuadIdByCoords(source_coords),
                    QuadIdByCoords(target_coords),
                    elem.text)
                return int(float(elem.text))
        # TODO(kirr): Check for directions
        if repeat_count < 5:
            return MakeDurationReuest(source_coords, target_coords,
                                      repeat_count + 1, direction + 1)
        logging.warning('No duration info finded for %s', req_str)
        return REQ_ERR_RESPONSE
    except urllib2.HTTPError as e:
        if repeat_count < 3:
            logging.warning('HTTP error while getting %d->%d. %s: %d',
                    QuadIdByCoords(source_coords),
                    QuadIdByCoords(target_coords), req_str, e.code)
            return MakeDurationReuest(source_coords, target_coords,
                       repeat_count + 1, direction)
        return REQ_ERR_HTTP

def Init(params):
    global lat_offset
    global long_offset
    global city_tl
    global city_br
    global lat_count
    global long_count
    global quads_count
    global get_reuest_url_func
    global _is_init

    lat_offset = params.lat_offset
    long_offset = params.long_offset
    city_tl = params.city_tl
    city_br = params.city_br
    get_reuest_url_func = params.get_reuest_url_func

    # TODO(kirr) : max, min
    lat_count = (city_tl[0] - city_br[0]) // lat_offset
    long_count = (city_br[1] - city_tl[1]) // long_offset
    quads_count = int(lat_count * long_count)

    _is_init = True

def BuildRoutes(quad_id):
    assert _is_init

    source_coords = QuadCoordsById(quad_id)
    routes = []
    err = False
    for i in range(0, quads_count):
        if i == quad_id:
            routes.append(1) # 1 second
            continue

        target_coords = QuadCoordsById(i)
        duration = MakeDurationReuest(source_coords, target_coords)
        err = err | IsError(duration)
        routes.append(duration)
    return routes, err
