import json
import logging

import matplotlib.patches as mpatches
import matplotlib.path as mpath
import matplotlib.pyplot as plt
import matplotlib.transforms as mtransforms
import pyproj

import quads


def make_path_verts(proj, geom):
    proj_verts = [proj(v[0], v[1]) for v in geom[0]]
    for i in range(1, len(geom)):
        int_verts = [merc_proj(v[0], v[1]) for v in geom[i]]
        proj_verts.extend(int_verts[::-1])
    return proj_verts


def init(params):
    global merc_proj
    global map_bbox
    global qi

    merc_proj = pyproj.Proj(
            '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 '
            '+x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs')
    xmin, ymin = merc_proj(params.city_tl[1], params.city_br[0])
    xmax, ymax = merc_proj(params.city_br[1], params.city_tl[0])
    map_bbox = mtransforms.Bbox([[xmin, ymin], [xmax, ymax]])
    qi = quads.MapCoordsIndexer(params)


def get_control_points():
    control_points = []
    for i in range(qi.quads_count):
        map_point = qi.quad_coords_by_id(i)
        control_points.append((i, merc_proj(map_point[1], map_point[0])))
    return control_points


def filter_control_points(control_points, path):
    inner_points = []
    outer_points = []
    for p in control_points:
        if path.contains_point(p[1]):
            inner_points.append(p[0])
        else:
            outer_points.append(p)
    return inner_points, outer_points


def clip_districts_to_map_bbox(data):
    ymaps_districts = []
    for district in data['features']:
        district_geom = district['geometry']
        if district_geom['type'] == 'Polygon':
            verts = make_path_verts(merc_proj, district_geom['coordinates'])
            if map_bbox.count_contains(verts) == len(verts):
                ymaps_districts.append(district)
        elif district_geom['type'] == 'MultiPolygon':
            contained_parts = []
            for poly_geom in district_geom['coordinates']:
                verts = make_path_verts(merc_proj, poly_geom)
                if map_bbox.count_contains(verts) == len(verts):
                   contained_parts.append(poly_geom)
            # FIXME(kirr): Hack for Kuncevo
            if len(contained_parts):
                ymaps_districts.append(district)
                ymaps_districts[-1]['geometry']['coordinates'] = contained_parts

    data['features'] = ymaps_districts
    return data


def build_district_index(districts_file,
                         geojson_output,
                         remaining_point_output):
    json_data = {}
    with open(districts_file) as json_file:
        json_data = json.load(json_file)

    clip_districts_to_map_bbox(json_data)
    control_points = get_control_points()

    logging.debug('All points:%d', len(control_points))
    for district in json_data['features']:
        district_name = district['properties']['NAME']
        district_geom = district['geometry']
        geom = district_geom['coordinates']
        inner_indexes = []
        if district_geom['type'] == 'Polygon':
            verts = make_path_verts(merc_proj, geom)
            path = mpath.Path(verts)
            inner_indexes, control_points = \
                filter_control_points(control_points, path)
        elif district_geom['type'] == 'MultiPolygon':
            for poly_geom in geom:
                verts = make_path_verts(merc_proj, poly_geom)
                path = mpath.Path(verts)
                inner_points_part, control_points = \
                    filter_control_points(control_points, path)
                inner_indexes.extend(inner_points_part)
        logging.debug('%s: %d', district_name, len(inner_indexes))
        if not len(inner_indexes):
            logging.error("%s is empty.", district_name)
        district['properties']['index'] = inner_indexes
    logging.debug('Points remaining:%d', len(control_points))

    with open(geojson_output, 'w') as json_output_file:
        json.dump(json_data, json_output_file)

    remaining_indexes = [v[0] for v in control_points]
    with open(remaining_point_output, 'w') as json_output_file:
        json.dump(remaining_indexes, json_output_file)
