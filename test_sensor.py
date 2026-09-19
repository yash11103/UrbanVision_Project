import requests

water_level = 90

data = {
    "water_level": water_level
}

response = requests.post(
    "http://127.0.0.1:5000/sensor",
    json=data
)

print(response.json())