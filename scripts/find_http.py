import os
base = 'D:/restaurant-system/node_modules/@restaurante'
for root, dirs, files in os.walk(base):
    for f in files:
        if 'http' in f:
            print(os.path.join(root, f))
