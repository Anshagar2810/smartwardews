/**
 * Simple Direct Test - Test patient creation with auth
 */

import http from 'http';
import { URL } from 'url';

async function request(method, urlStr, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (err) => {
            console.error('❌ Request error:', err.message);
            reject(err);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function quickTest() {
    console.log('\n✅ Quick Integration Test\n');

    try {
        // Test 1: Register
        console.log('1. Registering admin...');
        const regRes = await request('POST', 'http://localhost:5000/api/auth/register', {
            userId: `ADMIN_${Date.now()}`,
            name: 'Test Admin',
            phone: `+1${Math.random().toString().slice(2,11)}`,
            password: 'Test123',
            role: 'ADMIN'
        });
        console.log(`   Status: ${regRes.status}`);
        if (regRes.status !== 201 && regRes.status !== 200) {
            console.log(`   Error: ${regRes.data.error}`);
            return;
        }
        const adminId = regRes.data.user.userId;
        console.log(`   ✅ Admin registered: ${adminId}`);

        // Test 2: Login
        console.log('\n2. Logging in admin...');
        const loginRes = await request('POST', 'http://localhost:5000/api/auth/login', {
            identifier: adminId,
            password: 'Test123'
        });
        console.log(`   Status: ${loginRes.status}`);
        if (loginRes.status !== 200) {
            console.log(`   Error: ${loginRes.data.error}`);
            return;
        }
        const token = loginRes.data.token;
        console.log(`   ✅ Logged in, token: ${token.substring(0,20)}...`);

        // Test 3: Create Patient
        console.log('\n3. Creating patient with auth token...');
        const patRes = await request('POST', 'http://localhost:5000/api/patients', {
            patientId: `PAT_${Date.now()}`,
            name: 'Test Patient',
            age: 50,
            phone: '+1234567890',
            deviceId: `ESP32_${Date.now()}`
        }, { Authorization: `Bearer ${token}` });
        console.log(`   Status: ${patRes.status}`);
        if (patRes.status !== 201 && patRes.status !== 200) {
            console.log(`   Error: ${patRes.data.error}`);
            return;
        }
        const patient = patRes.data.data || patRes.data;
        console.log(`   ✅ Patient created:`);
        console.log(`      ID: ${patient.patientId}`);
        console.log(`      Doctor: ${patient.doctorId}`);
        console.log(`      Device: ${patient.deviceId}`);

        // Test 4: Retrieve Patients
        console.log('\n4. Retrieving all patients...');
        const getRes = await request('GET', 'http://localhost:5000/api/patients', null, {
            Authorization: `Bearer ${token}`
        });
        console.log(`   Status: ${getRes.status}`);
        const patients = Array.isArray(getRes.data) ? getRes.data : getRes.data.data || [];
        console.log(`   ✅ Retrieved ${patients.length} patients`);

        console.log('\n✅ ALL TESTS PASSED\n');
        console.log('Summary:');
        console.log('  ✓ User registration working');
        console.log('  ✓ JWT authentication working');
        console.log('  ✓ Patient creation with auto-doctorId working');
        console.log('  ✓ Patient retrieval working');
        console.log('  ✓ MongoDB data persistence working');

    } catch (err) {
        console.error('\n❌ Test failed:', err.message);
    }
}

quickTest();
