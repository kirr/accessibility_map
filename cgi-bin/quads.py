class MapCoordsIndexer(object):
    def __init__(self, params):
        self._lat_offset = params.lat_offset
        self._long_offset = params.long_offset
        self._city_tl = params.city_tl
        self._city_br = params.city_br

        # TODO(kirr) : max, min
        self._lat_count = \
            (self._city_tl[0]-self._city_br[0]) // self._lat_offset
        self._long_count = \
            (self._city_br[1]-self._city_tl[1]) // self._long_offset
        self._quads_count = int(self._lat_count * self._long_count)

    @property
    def lat_offset(self):
        return self._lat_offset

    @property
    def long_offset(self):
        return self._long_offset

    @property
    def quads_count(self):
        return self._quads_count

    def quad_coords_by_id(self, quad_id):
        i = quad_id // self._long_count
        j = quad_id % self._long_count
        lat = self._city_br[0] + i*self._lat_offset + 0.5*self._lat_offset
        long = self._city_tl[1] + j*self._long_offset + 0.5*self._long_offset
        return [lat, long]

    def quad_id_by_coords(self, coords):
        lat_ind = (coords[0] - self._city_br[0]) // self._lat_offset
        long_ind = (coords[1] - self._city_tl[1]) // self._long_offset
        return long_ind + self._long_count*lat_ind
