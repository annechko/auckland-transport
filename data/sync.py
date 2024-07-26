import urllib.request
import json
import pandas as pd
import time
import os

FILE_ALERTS='./data/upload/alerts.csv'
FILE_STOPS='./stops.txt'

url = "https://api.at.govt.nz/realtime/legacy/servicealerts"

hdr = {
'Cache-Control': 'no-cache',
'Ocp-Apim-Subscription-Key': os.environ.get('AT_KEY'),
}
req = urllib.request.Request(url, headers=hdr)

req.get_method = lambda: 'GET'
response = urllib.request.urlopen(req)

if response.getcode()!=200:
  raise Exception(response.getcode())
contents = (response.read())

data = json.loads((contents))
entities = pd.json_normalize(data['response']['entity'])

# data preparation - json extraction of alert texts:
alerts_copy = entities.copy()
alerts_copy = pd.json_normalize(data['response']['entity'],
  ['alert','informed_entity' ], meta=['id'])
alerts_copy = alerts_copy.drop(['route_id'], axis=1)

# data preparation - add extracted alert texts to the original dataset:
n = entities.merge(alerts_copy, on=['id'])
n.dropna(subset=["stop_id"], inplace=True)

# data preparation - load stops coordinates dataset:
stops = pd.read_csv(FILE_STOPS)
# data preparation - extraction of needed fields:
stops = stops[["stop_code", "stop_id", "stop_lat", "stop_lon", "stop_name"]]


# data preparation - merge alerts and stops datasets in one:
result = n.merge(stops, on=['stop_id'], how='left')

copy = result.copy()

# data preparation - json extraction of alert information:
copy['alert_text'] = pd.json_normalize(pd.json_normalize(copy['alert.header_text.translation'])[0])['text']
#copy['description'] = pd.json_normalize(pd.json_normalize(copy['alert.description_text.translation'])[0])['text']

# data preparation - convert dates:
copy['period_start'] = pd.json_normalize(pd.json_normalize(copy['alert.active_period'])[0])['start']
copy['period_end'] =   pd.json_normalize(pd.json_normalize(copy['alert.active_period'])[0])['end']

copy['period_end']= pd.to_datetime(copy['period_end'], unit='s', utc=True)
copy['period_start']= pd.to_datetime(copy['period_start'], unit='s', utc=True)

# data preparation - convert to New Zealand timezone:
copy['period_end'] = copy['period_end'] + pd.Timedelta('12:00:00')
copy['period_start'] = copy['period_start'] + pd.Timedelta('12:00:00')
copy['period_start'] = copy['period_start'].dt.strftime('%d/%m/%Y, %H:%M:%S')
copy['period_end'] = copy['period_end'].dt.strftime('%d/%m/%Y, %H:%M:%S')

# data preparation - remove unused data columns:
copy=copy.drop(['alert.header_text.translation','alert.description_text.translation',
                'alert.url.translation','stop_id','id','alert.cause','trip.trip_id',
                'alert.active_period','alert.informed_entity','timestamp','alert.effect',
                ], axis=1)

copy.to_csv(FILE_ALERTS)
