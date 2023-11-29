import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class EcsGpuInstancesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    // Create ECS Instances with GPU
    const clusterArn = 'arn:aws:ecs:ap-northeast-1:464616699298:cluster/ivs-transcribe-demo-cluster-gltxli'
    // const cluster = ecs.Cluster.fromClusterArn(this, 'Cluster', clusterArn);

    // const cluster = new ecs.Cluster(this, 'Cluster', { vpc });


    // Add capacity to it
    // cluster.addCapacity('DefaultAutoScalingGroupCapacity', {
      // instanceType: new ec2.InstanceType("t2.large"),
      // desiredCapacity: 1,
    // });
    //...


    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'EcsGpuInstancesQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}


// declare const vpc: ec2.Vpc;

// // Create an ECS cluster
// const cluster = new ecs.Cluster(this, 'Cluster', { vpc });



// const taskDefinition = new ecs.Ec2TaskDefinition(this, 'TaskDef');

// taskDefinition.addContainer('DefaultContainer', {
//   image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
//   memoryLimitMiB: 512,
// });

// // Instantiate an Amazon ECS Service
// const ecsService = new ecs.Ec2Service(this, 'Service', {
//   cluster,
//   taskDefinition,
// });