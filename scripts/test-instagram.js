const axios = require('axios');
require('dotenv').config();

async function testInstagramCredentials() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;

  console.log('🔍 Testing Instagram Credentials...\n');

  if (!accessToken || !userId) {
    console.log('❌ Missing credentials in .env file');
    console.log('Please add:');
    console.log('INSTAGRAM_ACCESS_TOKEN=your_token_here');
    console.log('INSTAGRAM_USER_ID=your_user_id_here');
    return;
  }

  console.log('✅ Credentials found in .env file');
  console.log(`Access Token: ${accessToken.substring(0, 20)}...`);
  console.log(`User ID: ${userId}\n`);

  try {
    // Test 1: Get user profile
    console.log('📱 Testing Instagram Profile...');
    const profileResponse = await axios.get(`https://graph.instagram.com/v12.0/${userId}`, {
      params: {
        fields: 'id,username,account_type,media_count',
        access_token: accessToken
      }
    });
    console.log('✅ Profile API working');
    console.log('Profile:', profileResponse.data);

    // Test 2: Get posts
    console.log('\n📸 Testing Instagram Posts...');
    const postsResponse = await axios.get(`https://graph.instagram.com/v12.0/${userId}/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
        access_token: accessToken,
        limit: 3
      }
    });
    console.log('✅ Posts API working');
    console.log(`Found ${postsResponse.data.data.length} posts`);

    // Test 3: Test our API
    console.log('\n🌐 Testing Our Instagram API...');
    const ourApiResponse = await axios.get('http://localhost:3000/api/instagram/profile');
    console.log('✅ Our API working');
    console.log('Response:', ourApiResponse.data);

    console.log('\n🎉 All tests passed! Your Instagram integration is ready.');

  } catch (error) {
    console.log('❌ Error testing Instagram API:');
    if (error.response?.data?.error) {
      console.log('Instagram API Error:', error.response.data.error.message);
    } else {
      console.log('Error:', error.message);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if your access token is valid');
    console.log('2. Ensure your Instagram account is Business/Creator');
    console.log('3. Verify your app permissions');
    console.log('4. Check if token has expired (refresh if needed)');
  }
}

// Run the test
testInstagramCredentials(); 