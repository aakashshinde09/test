#!/bin/bash
export PATH=$PATH:/root/.nvm/versions/node/v20.18.0/bin
cd /home/ubuntu/code
pm2 start index.js --name "mqtt"


