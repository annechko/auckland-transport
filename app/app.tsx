import React from 'react';
import {createRoot} from 'react-dom/client';
import {CSVLoader} from '@loaders.gl/csv';
import DeckGL from '@deck.gl/react';
import type {MapViewState, Position} from '@deck.gl/core';
import {MapView} from '@deck.gl/core';
import {TileLayer} from '@deck.gl/geo-layers';
import {BitmapLayer, PathLayer} from '@deck.gl/layers';
import {IconLayer, IconLayerProps, PickingInfo} from "deck.gl";
import './app.css';

const INITIAL_VIEW_STATE: MapViewState = {
  latitude: -36.9,
  longitude: 174.8,
  zoom: 10,
  maxZoom: 20,
  maxPitch: 89,
  bearing: 0
};

const COPYRIGHT_LICENSE_STYLE: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  bottom: 0,
  backgroundColor: 'hsla(0,0%,100%,.5)',
  padding: '0 5px',
  font: '12px/20px Helvetica Neue,Arial,Helvetica,sans-serif'
};

const LINK_STYLE: React.CSSProperties = {
  textDecoration: 'none',
  color: 'rgba(0,0,0,.75)',
  cursor: 'grab'
};

/* global window */
const devicePixelRatio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

type Data = {
  stop_lat: number;
  stop_lon: number;
  stop_code: string;
  alert_text: string;
  period_start: string;
  period_end: string;
};

function getTooltip({object}: PickingInfo<Data>) {
  if (!object) {
    return
  }
  return {
    html: `<div class="tip-title">${object.alert_text}</div><div><span class="tip-point">From: </span>${object.period_start}</div><div><span  class="tip-point">To: </span>${object.period_end}</div>`,
    style: {
      fontSize: '0.8em'
    }
  }
}

function createSVGIcon(idx) {
  return `
    <svg width="60" height="70" viewBox="0 0 60 70" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M25.5187 9.05546C27.3546 5.34567 32.6454 5.34568 34.4813 9.05546L52.4089 45.2823C54.0535 48.6056 51.6356 52.5 47.9277 52.5H12.0723C8.36441 52.5 5.94646 48.6056 7.59105 45.2823L25.5187 9.05546Z" fill="#FFAB2E"/>
<path d="M31.6919 20.5455L31.4433 38.8409H28.5598L28.3112 20.5455H31.6919ZM30.0016 46.1989C29.3884 46.1989 28.8622 45.9793 28.4231 45.5401C27.9839 45.101 27.7643 44.5748 27.7643 43.9616C27.7643 43.3485 27.9839 42.8223 28.4231 42.3832C28.8622 41.944 29.3884 41.7244 30.0016 41.7244C30.6147 41.7244 31.1409 41.944 31.58 42.3832C32.0192 42.8223 32.2388 43.3485 32.2388 43.9616C32.2388 44.3677 32.1352 44.7405 31.928 45.0803C31.7292 45.42 31.4599 45.6934 31.1202 45.9006C30.7887 46.0994 30.4159 46.1989 30.0016 46.1989Z" fill="black"/>
</svg>
  `;
}

function svgToDataURL(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function App({
                              showBorder = false,
                              onTilesLoad
                            }: {
  showBorder?: boolean;
  onTilesLoad?: () => void;
}) {
  const layerProps: IconLayerProps<Data> = {
    id: 'icon',
    data: './upload/alerts.csv',
    loaders: [CSVLoader],
    loadOptions: {
      csv: {
        header: true,
        skipEmptyLines: true
      }
    },
    getPosition: (d: Data) => {
      return [d.stop_lon, d.stop_lat]
    },
    pickable: true,
    getIcon: (d, {index}) => ({
      url: svgToDataURL(createSVGIcon(index)),
      width: 30,
      height: 35
    }),
    sizeMinPixels: 30
  };
  const layer = new IconLayer({
    ...layerProps,
  });
  const tileLayer = new TileLayer<ImageBitmap>({
    // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Tile_servers
    data: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],

    // Since these OSM tiles support HTTP/2, we can make many concurrent requests
    // and we aren't limited by the browser to a certain number per domain.
    maxRequests: 20,

    pickable: false,
    onViewportLoad: onTilesLoad,
    autoHighlight: showBorder,
    highlightColor: [60, 60, 60, 40],
    // https://wiki.openstreetmap.org/wiki/Zoom_levels
    minZoom: 0,
    maxZoom: 19,
    tileSize: 256,
    zoomOffset: devicePixelRatio === 1 ? -1 : 0,
    renderSubLayers: props => {
      const [[west, south], [east, north]] = props.tile.boundingBox;
      const {data, ...otherProps} = props;

      return [
        new BitmapLayer(otherProps, {
          image: data,
          bounds: [west, south, east, north]
        }),
        showBorder &&
        new PathLayer<Position[]>({
          id: `${props.id}-border`,
          data: [
            [
              [west, north],
              [west, south],
              [east, south],
              [east, north],
              [west, north]
            ]
          ],
          getPath: d => d,
          getColor: [255, 0, 0],
          widthMinPixels: 4
        })
      ];
    }
  });


  return (
    <DeckGL
      layers={[tileLayer, layer]}
      views={new MapView({repeat: true})}
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      getTooltip={getTooltip}
    >
      <div style={COPYRIGHT_LICENSE_STYLE}>
        {'© '}
        <a style={LINK_STYLE} href="http://www.openstreetmap.org/copyright" target="blank">
          OpenStreetMap contributors
        </a>
      </div>
    </DeckGL>
  );
}

export function renderToDOM(container: HTMLDivElement) {
  createRoot(container).render(<App/>);
}
