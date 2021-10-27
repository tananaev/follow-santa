/*
 * Copyright 2021 Anton Tananaev (anton@traccar.org)
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const token = 'TRACCAR-USER-TOKEN'; // user token
const history = 60; // initial history in minutes

const url = window.location.protocol + '//' + window.location.host;

const routeSource = new ol.source.Vector();
const geofenceSource = new ol.source.Vector();
const deviceSource = new ol.source.Vector();

const mapView = new ol.View({
  center: ol.proj.fromLonLat([0, 0]),
  zoom: 2,
});

const map = new ol.Map({
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM(),
    }),
    new ol.layer.Vector({
      source: routeSource,
    }),
    new ol.layer.Vector({
      source: geofenceSource,
    }),
    new ol.layer.Vector({
      source: deviceSource,
    }),
  ],
  target: 'map',
  view: mapView,
});

const loginUser = () => {
  fetch(url + '/api/session?token=' + token)
    .then((response) => response.json())
    .then((data) => {
      loadGeofences();
      loadDevices();
    });
};

const loadGeofences = () => {
  fetch(url + '/api/geofences')
    .then((response) => response.json())
    .then((data) => {
      let minLat = Number.MAX_VALUE;
      let maxLat = -Number.MAX_VALUE;
      let minLon = Number.MAX_VALUE;
      let maxLon = -Number.MAX_VALUE;
      data.forEach((geofence) => {
        const wkt = geofence.area;
        if (wkt.lastIndexOf('LINESTRING', 0) === 0) {
          const content = wkt.match(/\([^()]+\)/);
          if (content !== null) {
            const coordinates = content[0].match(/-?\d+\.?\d*/g);
            if (coordinates !== null) {
              for (let i = 0; i < coordinates.length; i += 2) {
                const [lon, lat] = ol.proj.fromLonLat([Number(coordinates[i + 1]), Number(coordinates[i])]);
                const point = new ol.geom.Point([lon, lat]);
                minLat = Math.min(lat, minLat);
                maxLat = Math.max(lat, maxLat);
                minLon = Math.min(lon, minLon);
                maxLon = Math.max(lon, maxLon);
                const marker = new ol.Feature(point);
                marker.setStyle(
                  new ol.style.Style({
                    image: new ol.style.Icon({
                      src: 'tree.svg',
                    }),
                  })
                );
                geofenceSource.addFeature(marker);
              }
            }
          }
        }
        if (minLat < maxLat && minLon < maxLon) {
          const padding = Math.min(innerWidth, innerHeight) / 6;
          mapView.fit([minLon, minLat, maxLon, maxLat], {
            padding: [padding, padding, padding, padding],
          });
        }
      });
    });
};

const loadDevices = () => {
  fetch(url + '/api/devices')
    .then((response) => response.json())
    .then((data) => loadHistory(data.map((device) => device.id)));
};

const loadHistory = (devices) => {
  const routes = {};
  const addRoutePoint = (id, lat, lon) => {
    let geometry = routes[id];
    if (!geometry) {
      geometry = new ol.geom.LineString([
        ol.proj.fromLonLat([lon, lat]),
      ]);
      routes[id] = geometry;
      const marker = new ol.Feature({
        geometry: geometry,
      });
      marker.setStyle(new ol.style.Style({
        stroke: new ol.style.Stroke({
          width: 3,
          color: 'rgba(234, 70, 48, 1)',
        }),
      }));
      routeSource.addFeature(marker);
    } else {
      geometry.appendCoordinate(ol.proj.fromLonLat([lon, lat]));
    }
  };

  const params = new URLSearchParams({
    from: new Date(Date.now() - history * 60000).toISOString(),
    to: new Date().toISOString(),
  });
  devices.forEach((id) => params.append('deviceId', id));
  fetch(url + '/api/reports/route?' + params, {
    headers: {
      'Accept': 'application/json',
    },
  })
    .then((response) => response.json())
    .then((data) => {
      data.forEach((position) => addRoutePoint(position.deviceId, position.latitude, position.longitude));
      connectSocket(addRoutePoint);
    });
};

const connectSocket = (addRoutePoint) => {
  const devices = {};
  const socket = new WebSocket('ws' + url.substring(4) + '/api/socket');
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.positions) {
      data.positions.forEach((position) => {
        addRoutePoint(position.deviceId, position.latitude, position.longitude)
        let marker = devices[position.deviceId];
        const point = new ol.geom.Point(ol.proj.fromLonLat([position.longitude, position.latitude]));
        if (!marker) {
            marker = new ol.Feature(point);
            marker.setStyle(
              new ol.style.Style({
                image: new ol.style.Icon({
                  src: 'santa.svg',
                }),
              })
            );
            devices[position.deviceId] = marker;
            deviceSource.addFeature(marker);
        } else {
            marker.setGeometry(point);
        }
      });
    }
  };
};

loginUser();
