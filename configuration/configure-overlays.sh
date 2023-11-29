#!/bin/bash
AWS_REGION=$(aws configure get region)

# Configure overlays
node ./cleanup-overlays.js --tableName ivs-transcribe-demo-overlays-gltxli --awsRegion $AWS_REGION
node ./load-overlays.js --filePath data/overlays.json --dynamoDbTable ivs-transcribe-demo-overlays-gltxli --awsRegion $AWS_REGION

# Restart Transcribe container
bash ./stop-container.sh ivs-transcribe-demo-cluster-gltxli ivs-transcribe-demo-transcribe-service-gltxli
bash ./start-container.sh ivs-transcribe-demo-cluster-gltxli ivs-transcribe-demo-transcribe-service-gltxli