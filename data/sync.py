import pandas as pd

print('Hi from py!')

routes_data = pd.DataFrame(['test'])
routes_data.to_csv('routes.csv')
print('loaded')
