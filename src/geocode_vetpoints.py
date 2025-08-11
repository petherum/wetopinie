import pandas as pd
import time
import re
from geopy.geocoders import Nominatim

input_file = input("Enter the name of the input JSON file: ").strip()
output_file = input("Enter the name of the output JSON file: ").strip()

df = pd.read_json(input_file)
geolocator = Nominatim(user_agent="vetopinie-geocoder")

def clean_address(address):
    if not address or pd.isna(address):
        return address
    parts = address.split(',')
    if not parts:
        return address

    street_part = parts[0]
    # Remove "/something" if directly after number, e.g., 20/5 -> 20
    street_cleaned = re.sub(r'(\d+)[\\/][\w\d]+', r'\1', street_part).strip()
    rest = ','.join(parts[1:]).strip()
    if rest:
        return f"{street_cleaned}, {rest}"
    else:
        return street_cleaned

def geocode_address(address):
    if not address or pd.isna(address):
        return None, None
    try:
        location = geolocator.geocode(address, timeout=10)
        if location:
            return location.latitude, location.longitude
    except Exception as e:
        print("Error geocoding", address, e)
    return None, None


latitudes = []
longitudes = []

for idx, row in df.iterrows():
    lat = row.get('lat')
    lng = row.get('lng')
    if pd.notna(lat) and pd.notna(lng):
        latitudes.append(lat)
        longitudes.append(lng)
        continue

    orig_address = row.get('Address')
    clean_addr = clean_address(orig_address)
    print(f"Geocoding: {clean_addr}")
    lat, lng = geocode_address(clean_addr)
    latitudes.append(lat)
    longitudes.append(lng)
    time.sleep(1)

df['lat'] = latitudes
df['lng'] = longitudes

df.to_json(output_file, orient="records", force_ascii=False, indent=2)
print("Geocoding done! Output file:", output_file)
