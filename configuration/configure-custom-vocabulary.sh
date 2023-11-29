# Remove current
aws transcribe delete-vocabulary --vocabulary-name ivs-transcribe-demo-custom-vocabulary-gltxli

# Create new
bash ./create-custom-vocabulary.sh data/custom-vocabulary.txt

# Restart Transcribe container
bash ./stop-container.sh ivs-transcribe-demo-cluster-gltxli ivs-transcribe-demo-transcribe-service-gltxli
bash ./start-container.sh ivs-transcribe-demo-cluster-gltxli ivs-transcribe-demo-transcribe-service-gltxli