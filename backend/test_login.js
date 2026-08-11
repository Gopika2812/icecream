async function testApi() {
    try {
        console.log('1. Logging in to AWS Lambda API...');
        const loginRes = await fetch('https://k5icageghf.execute-api.ap-south-1.amazonaws.com/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'adminpassword123'
            })
        });

        const loginData = await loginRes.json();
        console.log('Login Status:', loginRes.status);
        console.log('Login Data:', loginData);

        if (!loginData.accessToken) {
            console.error('Failed to obtain token');
            return;
        }

        console.log('\n2. Fetching Products from DynamoDB...');
        const prodRes = await fetch('https://k5icageghf.execute-api.ap-south-1.amazonaws.com/api/v1/products', {
            headers: {
                'Authorization': `Bearer ${loginData.accessToken}`
            }
        });

        const prodData = await prodRes.json();
        console.log('Products API Status:', prodRes.status);
        console.log('Products Response Body:', prodData);
        (prodData.data || []).forEach(p => console.log(` - [${p.itemCode}] ${p.name} (Category: ${p.category}, Type: ${p.itemType})`));

    } catch (err) {
        console.error('Test Error:', err);
    }
}

testApi();
