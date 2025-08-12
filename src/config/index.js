const supabase = require('./supabase');
const { s3, bucketName } = require('./s3');
const jwt = require('./jwt');
 
module.exports = {
  supabase,
  s3,
  bucketName,
  jwt,
}; 