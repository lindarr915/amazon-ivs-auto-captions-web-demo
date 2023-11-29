export AWS_PROFILE=whisper-translate;ECR_REGISTRY=464616699298.dkr.ecr.ap-northeast-1.amazonaws.com;TRANSCRIBE_REPOSITORY_NAME=ivs-transcribe-demo-transcribe-images-gltxli
docker build  -t $ECR_REGISTRY/$TRANSCRIBE_REPOSITORY_NAME .
docker push $ECR_REGISTRY/$TRANSCRIBE_REPOSITORY_NAME

CLUSTER=ivs-transcribe-demo-cluster-gltxli;SERVICE=ivs-transcribe-demo-transcribe-service-gltxli
aws ecs update-service --cluster $CLUSTER --service $SERVICE --force-new-deployment 