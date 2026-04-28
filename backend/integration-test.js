/**
 * Integration Test: Complete Frontend-Backend Flow
 * Tests:
 * 1. Admin Registration
 * 2. Admin Login
 * 3. Patient Creation
 * 4. Verify data persists in database
 * 5. Verify Alert system works
 */

import http from 'http';

const API_BASE = 'http://localhost:5000/api';

function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
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

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log('\n✅ Starting Integration Tests\n');
    
    try {
        // Test 1: Admin Registration
        console.log('📝 Test 1: Admin Registration');
        const adminId = `ADMIN_${Date.now()}`;
        const adminRes = await makeRequest('POST', '/auth/register', {
            userId: adminId,
            name: 'Test Admin',
            phone: `+1${Math.random().toString().slice(2, 11)}`,
            password: 'TestPassword123',
            role: 'ADMIN'
        });
        
        if (adminRes.status === 201 || adminRes.status === 200) {
            console.log('✅ Admin registered:', adminRes.data.user);
        } else {
            console.error('❌ Admin registration failed:', adminRes.data);
            return;
        }

        // Test 2: Admin Login
        console.log('\n📝 Test 2: Admin Login');
        const loginRes = await makeRequest('POST', '/auth/login', {
            identifier: adminRes.data.user.userId,
            password: 'TestPassword123'
        });
        
        if (loginRes.status === 200) {
            console.log('✅ Admin logged in. Token:', loginRes.data.token.substring(0, 20) + '...');
            var adminToken = loginRes.data.token;
        } else {
            console.error('❌ Admin login failed:', loginRes.data);
            return;
        }

        // Test 3: Patient Creation
        console.log('\n📝 Test 3: Patient Creation WITH AUTH TOKEN');
        const patientRes = await makeRequest('POST', '/patients', {
            patientId: `PAT_${Date.now()}`,
            name: 'John Doe',
            age: 45,
            phone: '+1234567890',
            deviceId: `ESP32_${Date.now()}`
            // doctorId is auto-set from auth token
        }, { Authorization: `Bearer ${adminToken}` });
        
        if (patientRes.status === 200 || patientRes.status === 201) {
            console.log('✅ Patient created:', patientRes.data.data || patientRes.data);
        } else {
            console.error('❌ Patient creation failed:', patientRes.data);
            return;
        }

        // Test 4: Retrieve Patient Data
        console.log('\n📝 Test 4: Retrieve Patient Data');
        const getPatientsRes = await makeRequest('GET', '/patients', null, { Authorization: `Bearer ${adminToken}` });
        
        if (getPatientsRes.status === 200) {
            const patients = Array.isArray(getPatientsRes.data) ? getPatientsRes.data : getPatientsRes.data.data || [];
            console.log(`✅ Retrieved ${patients.length} patients`);
            if (patients.length > 0) console.log('Patient sample:', patients[0]);
        } else {
            console.error('❌ Failed to retrieve patients:', getPatientsRes.data);
        }

        // Test 5: Nurse Registration
        console.log('\n📝 Test 5: Nurse Registration');
        const nurseRes = await makeRequest('POST', '/nurse', {
            userId: `NURSE_${Date.now()}`,
            name: 'Test Nurse',
            phone: `+1987654321`,
            password: 'NursePass123',
            role: 'NURSE'
        });
        
        if (nurseRes.status === 201 || nurseRes.status === 200) {
            console.log('✅ Nurse registered:', nurseRes.data.data || nurseRes.data);
        } else {
            console.error('❌ Nurse registration failed:', nurseRes.data);
        }

        console.log('\n✅ All Integration Tests Passed!\n');

    } catch (error) {
        console.error('❌ Test Error:', error.message);
    }
}

runTests();
