#!/bin/bash
cd /home/ubuntu/code
pm2 start index.js --name "mqtt"
