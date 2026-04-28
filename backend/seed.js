import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import User from './src/models/user.model.js';
import Patient from './src/models/patient.model.js';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();
    console.log('✅ MongoDB connected.');

    console.log('--- Deleting existing data ---');
    await User.deleteMany({});
    await Patient.deleteMany({});
    console.log('--- Existing data deleted ---\n');

    const hashedPassword = await bcrypt.hash('aa', 10);

    // --- Create Users ---
    const usersToCreate = [
      // Admin
      { userId: 'ADMIN01', name: 'Ansh', email: 'admin@gmail.com', password: hashedPassword, role: 'ADMIN' },
      
      // Doctors
      { userId: 'DOC001', name: 'Dr. Emily Carter', email: 'emily.carter@hospital.com', domain: 'Cardiology', password: hashedPassword, role: 'DOCTOR' },
      { userId: 'DOC002', name: 'Dr. Ben Hanson', email: 'ben.hanson@hospital.com', domain: 'Neurology', password: hashedPassword, role: 'DOCTOR' },
      { userId: 'DOC003', name: 'Dr. Olivia Rodriguez', email: 'olivia.rodriguez@hospital.com', domain: 'Pediatrics', password: hashedPassword, role: 'DOCTOR' },
      { userId: 'DOC004', name: 'Dr. Akhand', email: 'akhand@gmail.com', domain: 'Orthopedics', password: hashedPassword, role: 'DOCTOR' },

      // Nurses
      { userId: 'NURSE01', name: 'Nurse Joy', email: 'nurse1@gmail.com', password: hashedPassword, role: 'NURSE' },
      { userId: 'NURSE02', name: 'Nurse Alex', email: 'nurse2@gmail.com', password: hashedPassword, role: 'NURSE' },
    ];

    console.log('--- Creating users ---');
    const createdUsers = await User.insertMany(usersToCreate);
    console.log(`${createdUsers.length} users created successfully!\n`);

    // --- Create Patients ---
    const patientsToCreate = [
      { patientId: 'PAT001', name: 'John Smith', age: 45, phone: '555-0101', doctorId: 'DOC004', deviceId: 'ESP32_001' },
      { patientId: 'PAT002', name: 'Jane Doe', age: 32, phone: '555-0102', doctorId: 'DOC001', deviceId: 'ESP32002' },
      { patientId: 'PAT003', name: 'Peter Jones', age: 67, phone: '555-0103', doctorId: 'DOC002', deviceId: 'ESP32003' },
      { patientId: 'PAT004', name: 'Mary Williams', age: 71, phone: '555-0104', doctorId: 'DOC003', deviceId: 'ESP32004' },
      { patientId: 'PAT005', name: 'David Brown', age: 28, phone: '555-0105', doctorId: 'DOC004', deviceId: 'ESP32005' },
      { patientId: 'PAT006', name: 'Susan Miller', age: 53, phone: '555-0106', doctorId: 'DOC002', deviceId: 'ESP32006' },
    ];

    console.log('--- Creating patients ---');
    const createdPatients = await Patient.insertMany(patientsToCreate);
    console.log(`${createdPatients.length} patients created successfully!\n`);

    console.log('✅✅✅ Database seeded successfully! ✅✅✅');
    process.exit();

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
