// Quick test script to verify Instagram API connection
// Run this with: node test-instagram-api.js

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'instagram-statistics-api.p.rapidapi.com';

async function testInstagramAPI() {
    if (!RAPIDAPI_KEY) {
        console.error('❌ RAPIDAPI_KEY is not set in environment variables');
        console.log('Please set it: export RAPIDAPI_KEY="your-key-here"');
        return;
    }

    console.log('🔍 Testing Instagram Statistics API...');
    console.log('RAPIDAPI_HOST:', RAPIDAPI_HOST);
    console.log('RAPIDAPI_KEY:', RAPIDAPI_KEY ? `${RAPIDAPI_KEY.substring(0, 10)}...` : 'NOT SET');

    const testCIDs = [
        'therock',
        'IG:therock',
        'instagram.com/therock',
        'https://www.instagram.com/therock/',
    ];

    for (const cid of testCIDs) {
        console.log(`\n📍 Testing CID: "${cid}"`);

        try {
            const url = new URL(`https://${RAPIDAPI_HOST}/community`);
            url.searchParams.append('cid', cid);

            console.log(`   URL: ${url.toString()}`);

            const response = await fetch(url.toString(), {
                headers: {
                    'X-RapidAPI-Key': RAPIDAPI_KEY,
                    'X-RapidAPI-Host': RAPIDAPI_HOST,
                },
            });

            console.log(`   Status: ${response.status} ${response.statusText}`);

            if (response.ok) {
                const data = await response.json();
                console.log('   ✅ SUCCESS!');
                console.log('   Response:', JSON.stringify(data, null, 2));

                // Check social type
                const profile = data.data || data;
                const socialType = profile.socialType || profile.cid?.split(':')[0] || 'UNKNOWN';
                console.log(`   Social Type: ${socialType}`);
                console.log(`   Followers: ${profile.usersCount || 'N/A'}`);

                if (socialType === 'INST' || socialType === 'IG') {
                    console.log('   🎉 Found Instagram profile!');
                    break; // Success, stop testing
                } else {
                    console.log(`   ⚠️  Got ${socialType} instead of Instagram`);
                }
            } else {
                const errorText = await response.text();
                console.log(`   ❌ Error: ${errorText}`);
            }
        } catch (error) {
            console.log(`   ❌ Exception: ${error.message}`);
        }
    }
}

testInstagramAPI().catch(console.error);
