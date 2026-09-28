// Brev.ly — Infraestrutura AWS (Pulumi).
// Fase 6: stack brevly-prod (região us-east-1).

import * as aws from "@pulumi/aws"
import * as awsx from "@pulumi/awsx"
import * as pulumi from "@pulumi/pulumi"

const config = new pulumi.Config()
const accountId = config.require("accountId")
const region = aws.config.region ?? "us-east-1"

const commonTags = {
  project: "brevly",
  environment: "prod",
}

// ---------------------------------------------------------------- VPC

const vpc = new awsx.ec2.Vpc("brevly-vpc", {
  cidrBlock: "10.0.0.0/16",
  numberOfAvailabilityZones: 2,
  subnetStrategy: "Auto",
  natGateways: {
    strategy: "Single",
  },
  tags: { ...commonTags, name: "brevly-vpc" },
})

// ---------------------------------------------------------------- Storage (front + CSV/CDN)

const frontendBucket = new aws.s3.Bucket("brevly-frontend", {
  bucket: "brevly-frontend-web",
  tags: { ...commonTags, name: "brevly-frontend-web" },
})

const publicAccessBlock = new aws.s3.BucketPublicAccessBlock(
  "brevly-frontend-public-access-block",
  {
    bucket: frontendBucket.bucket,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
  }
)

const frontendBucketPolicy = new aws.s3.BucketPolicy(
  "brevly-frontend-policy",
  {
    bucket: frontendBucket.bucket,
    policy: frontendBucket.arn.apply(arn =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "PublicReadGetObject",
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: `${arn}/*`,
          },
        ],
      })
    ),
  },
  { dependsOn: [publicAccessBlock] }
)

const cdnDistribution = new aws.cloudfront.Distribution("brevly-cdn", {
  enabled: true,
  defaultRootObject: "index.html",
  viewerCertificate: {
    cloudfrontDefaultCertificate: true,
  },
  origins: [
    {
      originId: "brevly-frontend-origin",
      domainName: pulumi.interpolate`${frontendBucket.bucket}.s3.${region}.amazonaws.com`,
    },
  ],
  defaultCacheBehavior: {
    targetOriginId: "brevly-frontend-origin",
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD", "OPTIONS"],
    forwardedValues: {
      queryString: false,
      cookies: { forward: "none" },
    },
    compress: true,
  },
  priceClass: "PriceClass_100",
  restrictions: {
    geoRestriction: {
      restrictionType: "none",
    },
  },
  customErrorResponses: [
    {
      errorCode: 404,
      responseCode: 200,
      responsePagePath: "/index.html",
    },
  ],
  tags: commonTags,
})

const csvBucket = new aws.s3.Bucket("brevly-csv", {
  bucket: "brevly-csv-reports",
  tags: { ...commonTags, name: "brevly-csv-reports" },
})

const csvPublicAccessBlock = new aws.s3.BucketPublicAccessBlock(
  "brevly-csv-public-access-block",
  {
    bucket: csvBucket.bucket,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
  }
)

const csvBucketPolicy = new aws.s3.BucketPolicy(
  "brevly-csv-policy",
  {
    bucket: csvBucket.bucket,
    policy: csvBucket.arn.apply(arn =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "PublicReadGetObject",
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: `${arn}/*`,
          },
        ],
      })
    ),
  },
  { dependsOn: [csvPublicAccessBlock] }
)

// ---------------------------------------------------------------- Banco (RDS PostgreSQL)

const dbSubnetGroup = new aws.rds.SubnetGroup("brevly-db-subnet-group", {
  subnetIds: vpc.privateSubnetIds,
  tags: commonTags,
})

const database = new aws.rds.Instance("brevly-db", {
  engine: "postgres",
  engineVersion: "15",
  instanceClass: "db.t4g.micro",
  allocatedStorage: 20,
  dbName: "brevly",
  username: "postgres",
  password: config.requireSecret("dbPassword"),
  dbSubnetGroupName: dbSubnetGroup.name,
  skipFinalSnapshot: true,
  backupRetentionPeriod: 0,
  storageEncrypted: true,
  publiclyAccessible: false,
  tags: commonTags,
})

// ---------------------------------------------------------------- Back-end (ECR → ECS Fargate + ALB)

const repository = new awsx.ecr.Repository("brevly-server-repo", {
  name: "brevly-server",
  forceDelete: true,
})

const albSecurityGroup = new aws.ec2.SecurityGroup("brevly-alb-sg", {
  vpcId: vpc.vpcId,
  ingress: [
    {
      protocol: "tcp",
      fromPort: 80,
      toPort: 80,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  tags: commonTags,
})

const alb = new awsx.lb.ApplicationLoadBalancer("brevly-alb", {
  internal: false,
  securityGroups: [albSecurityGroup.id],
  subnetIds: vpc.publicSubnetIds,
  defaultTargetGroup: { port: 3333 },
  listener: { port: 80 },
  tags: commonTags,
})

const ecsCluster = new aws.ecs.Cluster("brevly-cluster", {
  name: "brevly-cluster",
  tags: commonTags,
})

const appSecurityGroup = new aws.ec2.SecurityGroup("brevly-app-sg", {
  vpcId: vpc.vpcId,
  ingress: [
    {
      protocol: "tcp",
      fromPort: 3333,
      toPort: 3333,
      securityGroups: [albSecurityGroup.id],
    },
  ],
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  tags: commonTags,
})

// permite o ECS acessar o Postgres na porta 5432
const dbSecurityGroupId = database.vpcSecurityGroupIds.apply(ids => ids[0])

const dbIngressRule = new aws.ec2.SecurityGroupRule("brevly-db-allow-app", {
  type: "ingress",
  securityGroupId: dbSecurityGroupId,
  sourceSecurityGroupId: appSecurityGroup.id,
  fromPort: 5432,
  toPort: 5432,
  protocol: "tcp",
})

const appImage = pulumi.interpolate`${repository.url}:latest`

const fargateService = new awsx.ecs.FargateService("brevly-server", {
  cluster: ecsCluster.arn,
  desiredCount: 1,
  continueBeforeSteadyState: true,
  networkConfiguration: {
    assignPublicIp: false,
    subnets: vpc.privateSubnetIds,
    securityGroups: [appSecurityGroup.id],
  },
  taskDefinitionArgs: {
    container: {
      name: "brevly-server",
      image: appImage,
      cpu: 256,
      memory: 512,
      essential: true,
      portMappings: [{ containerPort: 3333, hostPort: 3333 }],
      environment: [
        { name: "PORT", value: "3333" },
        { name: "NODE_ENV", value: "production" },
        {
          name: "DATABASE_URL",
          value: pulumi.interpolate`postgres://postgres:${database.password}@${database.endpoint}/brevly`,
        },
        { name: "FRONTEND_URL", value: "https://cdn.brevly.com.br" },
        { name: "STORAGE_PROVIDER", value: "aws" },
        { name: "AWS_REGION", value: region },
        { name: "AWS_S3_BUCKET", value: csvBucket.bucket },
        { name: "AWS_CDN_URL", value: pulumi.interpolate`https://${cdnDistribution.domainName}` },
      ],
      logConfiguration: {
        logDriver: "awslogs",
        options: {
          "awslogs-group": "/ecs/brevly-server",
          "awslogs-region": region,
          "awslogs-stream-prefix": "brevly-server",
          "awslogs-create-group": "true",
        },
      },
    },
  },
})

export const frontendBucketName = frontendBucket.bucket
export const cdnUrl = pulumi.interpolate`https://${cdnDistribution.domainName}`
export const cdnDistributionId = cdnDistribution.id
export const apiUrl = pulumi.interpolate`http://${alb.loadBalancer.dnsName}`
export const databaseEndpoint = database.endpoint
export const ecrRepositoryUrl = repository.url
export const privateSubnetIds = vpc.privateSubnetIds
export { accountId }