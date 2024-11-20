#!/bin/bash
cd /home/ubuntu/code

if pm2 list | grep -q "mqtt"; then
    echo "stopping the application........."
    pm2 stop mqtt
    pm2 delete mqtt
else
    echo "Application is not running. Skipping the step"
fi

# pm2 stop mqtt
# npm install 
