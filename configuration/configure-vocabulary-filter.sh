# Remove current
aws transcribe delete-vocabulary-filter --vocabulary-filter-name ivs-transcribe-demo-vocabulary-filter-gltxli

# Create new
bash ./create-vocabulary-filter.sh data/vocabulary-filter.txt

# Restart Transcribe container
bash ./stop-container.sh ivs-transcribe-demo-cluster-gltxli ivs-transcribe-demo-transcribe-service-gltxli
bash ./start-container.sh ivs-transcribe-demo-cluster-gltxli ivs-transcribe-demo-transcribe-service-gltxli