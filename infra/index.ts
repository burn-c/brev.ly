import * as aws from "@pulumi/aws"
import * as awsx from "@pulumi/awsx"
import * as pulumi from "@pulumi/pulumi"

const config = new pulumi.Config()
const accountId = config.require("accountId")
const region = aws.config.region ?? "us-east-1"
const enableTls = config.getBoolean("enableTls") ?? false
const imageTag = config.get("imageTag") ?? "latest"

const commonTags = {
  project: "brevly",
  environment: "prod",
}

const vpc = new awsx.ec2.Vpc("brevly-vpc", {
  cidrBlock: "10.0.0.0/16",
  numberOfAvailabilityZones: 2,
  subnetStrategy: "Auto",
  natGateways: {
    strategy: "Single",
  },
  tags: { ...commonTags, name: "brevly-vpc" },
})

const cert = new aws.acm.Certificate("brevly-acm-cert", {
  domainName: "brev-ly.burndev.app",
  subjectAlternativeNames: ["api.brev-ly.burndev.app"],
  validationMethod: "DNS",
  tags: commonTags,
})

const frontendBucket = new aws.s3.Bucket("brevly-frontend", {
  bucket: "brevly-frontend-web",
  tags: { ...commonTags, name: "brevly-frontend-web" },
})

const frontendPublicAccessBlock = new aws.s3.BucketPublicAccessBlock(
  "brevly-frontend-public-access-block",
  {
    bucket: frontendBucket.bucket,
    blockPublicAcls: true,
    blockPublicPolicy: false,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
  }
)

const csvBucket = new aws.s3.Bucket("brevly-csv", {
  bucket: "brevly-csv-reports",
  tags: { ...commonTags, name: "brevly-csv-reports" },
})

const csvPublicAccessBlock = new aws.s3.BucketPublicAccessBlock(
  "brevly-csv-public-access-block",
  {
    bucket: csvBucket.bucket,
    blockPublicAcls: true,
    blockPublicPolicy: false,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
  }
)

const oac = new aws.cloudfront.OriginAccessControl("brevly-oac", {
  description: "brevly",
  originAccessControlOriginType: "s3",
  signingBehavior: "always",
  signingProtocol: "sigv4",
})

const cdnDistribution = new aws.cloudfront.Distribution("brevly-cdn", {
  enabled: true,
  defaultRootObject: "index.html",
  aliases: enableTls ? ["brev-ly.burndev.app"] : undefined,
  viewerCertificate: enableTls
    ? { acmCertificateArn: cert.arn, sslSupportMethod: "sni-only" }
    : { cloudfrontDefaultCertificate: true },
  origins: [
    {
      originId: "brevly-frontend-origin",
      domainName: pulumi.interpolate`${frontendBucket.bucket}.s3.${region}.amazonaws.com`,
      originAccessControlId: oac.id,
    },
    {
      originId: "brevly-csv-origin",
      domainName: pulumi.interpolate`${csvBucket.bucket}.s3.${region}.amazonaws.com`,
      originAccessControlId: oac.id,
    },
  ],
  defaultCacheBehavior: {
    targetOriginId: "brevly-frontend-origin",
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD", "OPTIONS"],
    cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
    compress: true,
  },
  orderedCacheBehaviors: [
    {
      pathPattern: "/csv/*",
      targetOriginId: "brevly-csv-origin",
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET", "HEAD", "OPTIONS"],
      cachedMethods: ["GET", "HEAD", "OPTIONS"],
      cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
      compress: true,
    },
  ],
  priceClass: "PriceClass_100",
  restrictions: {
    geoRestriction: {
      restrictionType: "none",
    },
  },
  customErrorResponses: [
    {
      errorCode: 403,
      responseCode: 200,
      responsePagePath: "/index.html",
    },
    {
      errorCode: 404,
      responseCode: 200,
      responsePagePath: "/index.html",
    },
  ],
  tags: commonTags,
})

const frontendBucketPolicy = new aws.s3.BucketPolicy(
  "brevly-frontend-oac-policy",
  {
    bucket: frontendBucket.bucket,
    policy: pulumi.interpolate`{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "AllowCloudFrontServicePrincipalReadOnly",
          "Effect": "Allow",
          "Principal": {
            "Service": "cloudfront.amazonaws.com"
          },
          "Action": "s3:GetObject",
          "Resource": "${frontendBucket.arn}/*",
          "Condition": {
            "StringEquals": {
              "AWS:SourceArn": "${cdnDistribution.arn}"
            }
          }
        }
      ]
    }`,
  },
  { dependsOn: [frontendPublicAccessBlock, cdnDistribution] }
)

const csvBucketPolicy = new aws.s3.BucketPolicy(
  "brevly-csv-oac-policy",
  {
    bucket: csvBucket.bucket,
    policy: pulumi.interpolate`{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "AllowCloudFrontServicePrincipalReadOnly",
          "Effect": "Allow",
          "Principal": {
            "Service": "cloudfront.amazonaws.com"
          },
          "Action": "s3:GetObject",
          "Resource": "${csvBucket.arn}/*",
          "Condition": {
            "StringEquals": {
              "AWS:SourceArn": "${cdnDistribution.arn}"
            }
          }
        }
      ]
    }`,
  },
  { dependsOn: [csvPublicAccessBlock, cdnDistribution] }
)

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

const dbUrlSecret = new aws.secretsmanager.Secret("brevly-db-url", {
  name: "brevly/DATABASE_URL",
})

const dbUrlSecretVersion = new aws.secretsmanager.SecretVersion("brevly-db-url-version", {
  secretId: dbUrlSecret.id,
  secretString: pulumi.interpolate`postgres://postgres:${database.password}@${database.endpoint}/brevly?sslmode=no-verify`,
})

const repository = new awsx.ecr.Repository("brevly-server-repo", {
  name: "brevly-server",
  forceDelete: true,
  imageScanningConfiguration: { scanOnPush: true },
})

const albSecurityGroup = new aws.ec2.SecurityGroup("brevly-alb-sg", {
  vpcId: vpc.vpcId,
  ingress: enableTls
    ? [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
        { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] },
      ]
    : [{ protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] }],
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

const albLoadBalancer = new aws.lb.LoadBalancer("brevly-alb", {
  name: "brevly-alb",
  internal: false,
  securityGroups: [albSecurityGroup.id],
  subnets: vpc.publicSubnetIds,
  tags: commonTags,
})

const albTargetGroup = new aws.lb.TargetGroup("brevly-alb-tg", {
  name: "brevly-alb-tg",
  port: 3333,
  protocol: "HTTP",
  vpcId: vpc.vpcId,
  targetType: "ip",
  healthCheck: {
    path: "/health",
    healthyThreshold: 3,
    unhealthyThreshold: 3,
    interval: 30,
    timeout: 5,
  },
  tags: commonTags,
})

const listenerHttps = enableTls
  ? new aws.lb.Listener("brevly-alb-https", {
      loadBalancerArn: albLoadBalancer.arn,
      port: 443,
      protocol: "HTTPS",
      sslPolicy: "ELBSecurityPolicy-TLS13-1-2-2021-06",
      certificateArn: cert.arn,
      defaultActions: [{ type: "forward", targetGroupArn: albTargetGroup.arn }],
    })
  : undefined

const listenerHttp = new aws.lb.Listener("brevly-alb-http", {
  loadBalancerArn: albLoadBalancer.arn,
  port: 80,
  protocol: "HTTP",
  defaultActions: enableTls
    ? [
        {
          type: "redirect",
          redirect: { port: "443", protocol: "HTTPS", statusCode: "HTTP_301" },
        },
      ]
    : [{ type: "forward", targetGroupArn: albTargetGroup.arn }],
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

const dbSecurityGroupId = database.vpcSecurityGroupIds.apply(ids => ids[0])

const dbIngressRule = new aws.ec2.SecurityGroupRule("brevly-db-allow-app", {
  type: "ingress",
  securityGroupId: dbSecurityGroupId,
  sourceSecurityGroupId: appSecurityGroup.id,
  fromPort: 5432,
  toPort: 5432,
  protocol: "tcp",
})

const appImage = pulumi.interpolate`${repository.url}:${imageTag}`

const fargateService = new awsx.ecs.FargateService("brevly-server", {
  cluster: ecsCluster.arn,
  desiredCount: 1,
  continueBeforeSteadyState: true,
  loadBalancers: [
    {
      targetGroupArn: albTargetGroup.arn,
      containerName: "brevly-server",
      containerPort: 3333,
    },
  ],
  networkConfiguration: {
    assignPublicIp: false,
    subnets: vpc.privateSubnetIds,
    securityGroups: [appSecurityGroup.id],
  },
  taskDefinitionArgs: {
    executionRole: {
      args: {
        inlinePolicies: [
          {
            name: "ecs-log-group-create",
            policy: JSON.stringify({
              Version: "2012-10-17",
              Statement: [
                {
                  Sid: "CreateLogGroup",
                  Effect: "Allow",
                  Action: ["logs:CreateLogGroup"],
                  Resource: "arn:aws:logs:us-east-1:488182246611:log-group:/ecs/brevly-server:*",
                },
              ],
            }),
          },
          {
            name: "brevly-db-secret-read",
            policy: dbUrlSecret.arn.apply(arn =>
              JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                  {
                    Sid: "GetDbUrlSecret",
                    Effect: "Allow",
                    Action: ["secretsmanager:GetSecretValue"],
                    Resource: arn,
                  },
                ],
              })
            ),
          },
        ],
      },
    },
    taskRole: {
      args: {
        inlinePolicies: [
          {
            name: "brevly-csv-write",
            policy: JSON.stringify({
              Version: "2012-10-17",
              Statement: [
                {
                  Sid: "PutCsv",
                  Effect: "Allow",
                  Action: ["s3:PutObject"],
                  Resource: "arn:aws:s3:::brevly-csv-reports/*",
                },
              ],
            }),
          },
        ],
      },
    },
    container: {
      name: "brevly-server",
      image: appImage,
      cpu: 256,
      memory: 512,
      essential: true,
      portMappings: [{ containerPort: 3333, hostPort: 3333 }],
      secrets: [{ name: "DATABASE_URL", valueFrom: dbUrlSecret.arn }],
      environment: [
        { name: "PORT", value: "3333" },
        { name: "NODE_ENV", value: "production" },
        { name: "FRONTEND_URL", value: "https://brev-ly.burndev.app" },
        { name: "STORAGE_PROVIDER", value: "aws" },
        { name: "AWS_REGION", value: region },
        { name: "AWS_S3_BUCKET", value: csvBucket.bucket },
        { name: "AWS_CDN_URL", value: "https://brev-ly.burndev.app" },
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
export const apiUrl = pulumi.interpolate`http://${albLoadBalancer.dnsName}`
export const databaseEndpoint = database.endpoint
export const ecrRepositoryUrl = repository.url
export const privateSubnetIds = vpc.privateSubnetIds
export const certValidationRecords = cert.domainValidationOptions.apply(opts =>
  opts.map(o => ({
    name: o.resourceRecordName,
    value: o.resourceRecordValue,
    type: o.resourceRecordType,
  }))
)
export const certArn = cert.arn
export { enableTls, accountId }