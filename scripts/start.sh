#!/bin/bash
export PATH=$PATH:/usr/bin:/usr/local/bin
cd /home/ubuntu/code
pm2 start index.js --name "mqtt"
