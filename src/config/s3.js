const AWS = require('aws-sdk');

const accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'placeholder';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'placeholder';
const region = process.env.AWS_REGION || 'us-east-1';
const bucketName = process.env.AWS_S3_BUCKET_NAME || 'placeholder';

// Only throw error in production
if (process.env.NODE_ENV === 'production' && (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET_NAME)) {
  throw new Error('Missing AWS S3 environment variables');
}

// Configure AWS
AWS.config.update({
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
  region: region,
});

const s3 = new AWS.S3();

module.exports = { s3, bucketName };
