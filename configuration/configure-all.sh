#!/bin/bash
AWS_REGION=$(aws configure get region)

# Configure overlays
node ./cleanup-overlays.js --tableName ivs-transcribe-demo-overlays-gltxli --awsRegion $AWS_REGION
node ./load-overlays.js --filePath data/overlays.json --dynamoDbTable ivs-transcribe-demo-overlays-gltxli --awsRegion $AWS_REGION

# Configure custom vocabulary
aws transcribe delete-vocabulary --vocabulary-name ivs-transcribe-demo-custom-vocabulary-gltxli
bash ./create-custom-vocabulary.sh data/custom-vocabulary.txt

# Configure vocabulary filter
aws transcribe delete-vocabulary-filter --vocabulary-filter-name ivs-transcribe-demo-vocabulary-filter-gltxli
bash ./create-vocabulary-filter.sh data/vocabulary-filter.txt

# Restart Transcribe container
bash ./stop-container.sh ivs-transcribe-demo-cluster-gltxli ivs-transcribe-demo-transcribe-service-gltxli
bash ./start-container.sh ivs-transcribe-demo-cluster-gltxli ivs-transcribe-demo-transcribe-service-gltxli