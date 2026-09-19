
print("URBANVISION - SMART DRAINAGE MONITORING")
print("----------------------------------------")

# Set the water level limit
water_level_limit = 70

# Take water level input from the user
water_level = float(input("Enter water level (0 to 100): "))

# Check the water level
if water_level < 0 or water_level > 100:
    print("Invalid water level. Enter a value from 0 to 100.")

elif water_level >= water_level_limit:
    print("ALERT: High water level detected!")
    print("Possible drainage overflow.")
    print("Please inspect the drainage system.")

else:
    print("Drainage condition: Normal")
    print("No high water level alert.")

print("----------------------------------------")
print("Monitoring completed.")