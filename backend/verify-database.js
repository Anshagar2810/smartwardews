/**
 * MongoDB Database Verification & Monitoring
 * Checks all collections and data persistence
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function verifyDatabase() {
    try {
        console.log('\n========== DATABASE VERIFICATION ==========\n');
        
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('❌ MONGO_URI not configured in .env');
            return;
        }

        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Get database
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        
        console.log(`\n📊 Found ${collections.length} collections:\n`);

        for (const coll of collections) {
            const collName = coll.name;
            const count = await db.collection(collName).countDocuments();
            const sample = await db.collection(collName).findOne();
            
            console.log(`📦 ${collName}`);
            console.log(`   Count: ${count}`);
            if (sample) {
                console.log(`   Sample:`, JSON.stringify(sample, null, 2).substring(0, 150) + '...');
            }
            console.log();
        }

        // Detailed check for critical collections
        console.log('========== CRITICAL COLLECTIONS ==========\n');

        // Check Users
        const userCount = await db.collection('users').countDocuments();
        console.log(`👤 Users Collection: ${userCount} documents`);
        const users = await db.collection('users').find().limit(3).toArray();
        if (users.length > 0) {
            console.log('   Sample users:');
            users.forEach((u, i) => {
                console.log(`   [${i+1}] ${u.userId} - ${u.name} (${u.role})`);
            });
        }

        // Check Patients
        const patientCount = await db.collection('patients').countDocuments();
        console.log(`\n🏥 Patients Collection: ${patientCount} documents`);
        const patients = await db.collection('patients').find().limit(3).toArray();
        if (patients.length > 0) {
            console.log('   Sample patients:');
            patients.forEach((p, i) => {
                console.log(`   [${i+1}] ${p.patientId} - ${p.name} (Doctor: ${p.doctorId})`);
            });
        } else {
            console.log('   ⚠️ No patients found in database');
        }

        // Check Vitals
        const vitalCount = await db.collection('vitals').countDocuments();
        console.log(`\n📈 Vitals Collection: ${vitalCount} documents`);
        const vitals = await db.collection('vitals').find().sort({ createdAt: -1 }).limit(3).toArray();
        if (vitals.length > 0) {
            console.log('   Latest vitals:');
            vitals.forEach((v, i) => {
                const time = new Date(v.createdAt).toLocaleTimeString();
                console.log(`   [${i+1}] HR:${v.heartRate} O2:${v.spo2} Temp:${v.temperature} @ ${time}`);
            });
        }

        // Check Alerts
        const alertCount = await db.collection('alerts').countDocuments();
        console.log(`\n🚨 Alerts Collection: ${alertCount} documents`);
        const alerts = await db.collection('alerts').find().sort({ createdAt: -1 }).limit(3).toArray();
        if (alerts.length > 0) {
            console.log('   Recent alerts:');
            alerts.forEach((a, i) => {
                const time = new Date(a.createdAt).toLocaleTimeString();
                console.log(`   [${i+1}] ${a.riskLevel} - Notified: ${a.notified} @ ${time}`);
            });
        }

        console.log('\n========== DATA PERSISTENCE CHECK ==========\n');
        console.log('✅ Database connection working');
        console.log(`✅ Users: ${userCount} registered`);
        console.log(`✅ Patients: ${patientCount} added`);
        console.log(`✅ Vitals: ${vitalCount} recorded`);
        console.log(`✅ Alerts: ${alertCount} triggered`);

        await mongoose.disconnect();
        console.log('\n✅ Database verification complete\n');

    } catch (error) {
        console.error('❌ Database verification failed:', error.message);
    }
}

verifyDatabase();
