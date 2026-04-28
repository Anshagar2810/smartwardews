// Global Constants and Helpers
window.MEDICAL_SPECIALTIES = [
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'General Surgery',
    'Internal Medicine',
    'Oncology',
    'Dermatology',
    'Gynecology',
    'Psychiatry',
    'Urology',
    'ENT',
    'Ophthalmology',
    'Anesthesiology',
    'Radiology',
    'Pathology',
    'Emergency Medicine',
    'Family Medicine',
    'Nephrology',
    'Pulmonology',
    'Gastroenterology',
    'Endocrinology',
    'Rheumatology',
    'Infectious Disease',
    'Hematology',
    'Neurosurgery',
    'Plastic Surgery'
];

window.calculateEWS = (vitals) => {
    let score = 0;
    
    // 1. Respiratory Rate (Simulated if not present)
    const rr = vitals.respiratoryRate || 18; 
    if (rr <= 8 || rr >= 25) score += 3;
    else if (rr >= 21) score += 2;
    else if (rr >= 9 && rr <= 11) score += 1;

    // 2. Oxygen Saturation
    const spo2 = vitals.spo2;
    if (spo2 <= 91) score += 3;
    else if (spo2 <= 93) score += 2;
    else if (spo2 <= 95) score += 1;

    // 3. Temperature
    const temp = parseFloat(vitals.temp);
    // Convert F to C for calculation
    const tempC = (temp - 32) * 5/9;
    if (tempC <= 35.0 || tempC >= 39.1) score += 3;
    else if (tempC >= 38.1 || tempC <= 36.0) score += 1;
    else if (tempC >= 36.1 && tempC <= 38.0) score += 0;

    // 4. Systolic BP
    const sysBp = parseInt(vitals.bp.split('/')[0]);
    if (sysBp <= 90 || sysBp >= 220) score += 3;
    else if (sysBp <= 100) score += 2;
    else if (sysBp <= 110) score += 1;

    // 5. Heart Rate
    const hr = vitals.heartRate;
    if (hr <= 40 || hr >= 131) score += 3;
    else if (hr >= 111) score += 2;
    else if (hr >= 91 || hr <= 50) score += 1;

    return score;
};

window.generatePatientDetails = (name, index) => {
    // Generate vitals first
    const vitals = {
        heartRate: 60 + Math.floor(Math.random() * 60), // 60-120 range extended
        bp: `${90 + Math.floor(Math.random() * 60)}/${60 + Math.floor(Math.random() * 30)}`,
        temp: (96 + Math.random() * 4).toFixed(1), // 96-100 range
        spo2: 88 + Math.floor(Math.random() * 12), // 88-100 range
        respiratoryRate: 12 + Math.floor(Math.random() * 12) // 12-24 range
    };

    // Calculate EWS Score
    const ewsScore = window.calculateEWS(vitals);
    
    // Determine status based on EWS
    let status = 'Stable';
    if (ewsScore >= 7) status = 'Critical';
    else if (ewsScore >= 5) status = 'Warning';
    else if (ewsScore >= 1) status = 'Stable'; // Low risk
    else status = 'Stable';

    return {
        name: name,
        id: `P-${1000 + index + Math.floor(Math.random() * 1000)}`,
        age: 20 + Math.floor(Math.random() * 60),
        status: status,
        isOnline: Math.random() > 0.3, // 70% chance of being online
        ewsScore: ewsScore,
        deviceId: `DEV-${100 + index}`,
        address: `${100 + Math.floor(Math.random() * 900)} Main St, Cityville`,
        phone: `555-${100 + Math.floor(Math.random() * 900)}-${1000 + Math.floor(Math.random() * 9000)}`,
        vitals: vitals,
        admissionDate: new Date().toISOString().split('T')[0],
        condition: ewsScore >= 7 ? 'Critical - Immediate Review' : (ewsScore >= 5 ? 'Urgent Review' : 'Stable - Routine Check')
    };
};

window.getNextDoctorId = (doctors) => {
    // Extract all numeric IDs from existing doctors (e.g., "DOC1" -> 1)
    const existingIds = doctors
        .map(d => parseInt(d.id.replace('DOC', ''), 10))
        .filter(id => !isNaN(id))
        .sort((a, b) => a - b);

    // Find the first missing number starting from 1
    let nextId = 1;
    for (const id of existingIds) {
        if (id === nextId) {
            nextId++;
        } else if (id > nextId) {
            // Found a gap
            break;
        }
    }
    
    return `DOC${nextId}`;
};

window.getNextPatientId = (patients) => {
    const existingIds = (patients || [])
        .map(p => {
            if (!p.patientId) return NaN;
            const num = parseInt(p.patientId.replace('PAT', ''), 10);
            return isNaN(num) ? NaN : num;
        })
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);
    let next = 1;
    for (const id of existingIds) {
        if (id === next) next++;
        else if (id > next) break;
    }
    return `PAT${next}`;
};

window.getNextDeviceId = (patients) => {
    const existingNums = (patients || [])
        .map(p => {
            if (!p.deviceId) return NaN;
            const match = String(p.deviceId).match(/ESP32_(\d+)/);
            if (!match) return NaN;
            return parseInt(match[1], 10);
        })
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);
    const next = (existingNums.length ? existingNums[existingNums.length - 1] + 1 : 1);
    const padded = String(next).padStart(3, '0');
    return `ESP32_${padded}`;
};
window.App = () => {
    const { useState, useEffect } = React;
    const { AuthPage, AdminDashboard, DoctorDashboard, LandingPage } = window;

    // View State: 'landing' | 'auth' | 'dashboard'
    // If we have a session, we might want to skip landing, but for the "experience" let's show landing or go straight to dashboard if logged in.
    // User request: "have login button from this existing part starts" -> Suggests Landing -> Login.
    
    const [showLanding, setShowLanding] = useState(true);
    const [user, setUser] = useState(null); // { ...userData }
    const [userType, setUserType] = useState(null); // 'admin' | 'doctor'
    const [adminAccount, setAdminAccount] = useState(null);
    
    // Initial Mock Data with rich patient objects
    const [doctors, setDoctors] = useState([]);
    const [pendingDoctors, setPendingDoctors] = useState([]);
    const [patients, setPatients] = useState([]);

    const [nurses, setNurses] = useState(() => {
        const saved = localStorage.getItem('hospital_nurses_db');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('hospital_nurses_db', JSON.stringify(nurses));
    }, [nurses]);

    // Persist Doctors Data (Simulated Database)
    useEffect(() => {
        const savedDocs = localStorage.getItem('hospital_doctors_db');
        if (savedDocs) {
            setDoctors(JSON.parse(savedDocs));
        }
        
        const savedPending = localStorage.getItem('hospital_pending_doctors_db');
        if (savedPending) {
            setPendingDoctors(JSON.parse(savedPending));
        }

        const savedAdmin = localStorage.getItem('hospital_admin_account');
        if (savedAdmin) {
            setAdminAccount(JSON.parse(savedAdmin));
        }
        
        const savedPatients = localStorage.getItem('hospital_patients_db');
        if (savedPatients) {
            let loadedPatients = JSON.parse(savedPatients);
            // Patch missing isOnline property for existing data
            loadedPatients = loadedPatients.map(p => ({
                ...p,
                isOnline: p.isOnline !== undefined ? p.isOnline : (Math.random() > 0.3)
            }));
            setPatients(loadedPatients);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('hospital_doctors_db', JSON.stringify(doctors));
    }, [doctors]);

    useEffect(() => {
        localStorage.setItem('hospital_pending_doctors_db', JSON.stringify(pendingDoctors));
    }, [pendingDoctors]);

    useEffect(() => {
        if (adminAccount) {
            localStorage.setItem('hospital_admin_account', JSON.stringify(adminAccount));
        }
    }, [adminAccount]);
    
    useEffect(() => {
        localStorage.setItem('hospital_patients_db', JSON.stringify(patients));
    }, [patients]);

    // Check Session and attempt to hydrate data from backend if token exists
    const API_BASE = window.API_BASE || 'http://localhost:5001/api';

    useEffect(() => {
        const session = localStorage.getItem('app_session');
        const token = localStorage.getItem('app_token');
        let sessionData = null;
        if (session) {
            sessionData = JSON.parse(session);
            setUser({ ...sessionData.user, id: sessionData.user.userId || sessionData.user.id });
            setUserType(sessionData.type);
        }

        // If we have a token, fetch patients for the logged-in user
            // ALWAYS fetch patients from backend if we have a token (to get latest data from DB)
            if (token) {
            const headers = { Authorization: `Bearer ${token}` };
            
            // Fetch Patients
            fetch(`${API_BASE}/patients`, { headers })
            .then(r => r.json())
            .then(data => {
                    console.log('📥 Fetched patients from backend:', data);
                // Handle both array and wrapped response
                const patientList = Array.isArray(data) ? data : (data.data || data.patients || []);
                if (patientList.length > 0) {
                        const patched = patientList.map(p => ({ 
                            ...p, 
                            isOnline: p.isOnline !== undefined ? p.isOnline : (Math.random() > 0.3),
                            vitals: p.vitals || { spo2: 95, heartRate: 70, temp: 36.5, bp: '120/80' }
                        }));
                    setPatients(patched);
                        console.log('✅ Patients loaded from DB:', patched.length);
                    } else {
                        setPatients([]);
                }
            })
            .catch(err => console.warn('Failed to fetch patients on init', err));

            // If Admin, also fetch Doctors and Nurses
            if (sessionData && sessionData.type && sessionData.type.toLowerCase() === 'admin') {
                // Fetch Doctors
                fetch(`${API_BASE}/doctor`, { headers })
                .then(r => r.json())
                .then(data => {
                    const list = Array.isArray(data) ? data : (data.data || []);
                    const mapped = list.map(d => ({
                        id: d.userId,
                        name: d.name,
                        email: d.email || '',
                        phone: d.phone || '',
                        field: d.role === 'DOCTOR' ? (d.domain || 'General') : '',
                        patients: []
                    }));
                    setDoctors(mapped);
                })
                .catch(err => console.warn('Failed to fetch doctors', err));

                // Fetch Nurses
                fetch(`${API_BASE}/nurse`, { headers })
                .then(r => r.json())
                .then(data => {
                    const list = Array.isArray(data) ? data : (data.data || []);
                    setNurses(list);
                })
                .catch(err => console.warn('Failed to fetch nurses', err));
            }
        }
    }, []);

    const handleLogin = (userData, type, token) => {
        setUser({ ...userData, id: userData.userId || userData.id });
        setUserType(type);
        if (token) localStorage.setItem('app_token', token);
        localStorage.setItem('app_session', JSON.stringify({ user: userData, type }));

        if (token) {
            const headers = { Authorization: `Bearer ${token}` };
            
            // Fetch Patients
            fetch(`${API_BASE}/patients`, { headers })
            .then(r => r.json())
            .then(data => {
                console.log('📥 Login: Fetched patients:', data);
                // Handle both array and wrapped response
                const patientList = Array.isArray(data) ? data : (data.data || data.patients || []);
                if (patientList.length > 0) {
                    const patched = patientList.map(p => ({ 
                        ...p, 
                        isOnline: p.isOnline !== undefined ? p.isOnline : (Math.random() > 0.3),
                        vitals: p.vitals || { spo2: 95, heartRate: 70, temp: 36.5, bp: '120/80' }
                    }));
                    setPatients(patched);
                    console.log('✅ Patients loaded after login:', patched.length);
                } else {
                    setPatients([]);
                }
            })
            .catch(err => console.warn('Failed to fetch patients after login', err));

            // If Admin, also fetch Doctors and Nurses
            if (type === 'admin') {
                // Fetch Doctors
                fetch(`${API_BASE}/doctor`, { headers })
                .then(r => r.json())
                .then(data => {
                    const list = Array.isArray(data) ? data : (data.data || []);
                    const mapped = list.map(d => ({
                        id: d.userId,
                        name: d.name,
                        email: d.email || '',
                        phone: d.phone || '',
                        field: d.role === 'DOCTOR' ? (d.domain || 'General') : '',
                        patients: []
                    }));
                    setDoctors(mapped);
                })
                .catch(err => console.warn('Failed to fetch doctors', err));

                // Fetch Nurses
                fetch(`${API_BASE}/nurse`, { headers })
                .then(r => r.json())
                .then(data => {
                    const list = Array.isArray(data) ? data : (data.data || []);
                    setNurses(list);
                })
                .catch(err => console.warn('Failed to fetch nurses', err));
            }
        }
    };

    const handleLogout = () => {
        setUser(null);
        setUserType(null);
        localStorage.removeItem('app_session');
        localStorage.removeItem('app_token');
        setShowLanding(true); // Go back to landing on logout
    };

    const handleEnterSystem = () => {
        setShowLanding(false);
    };

    const handleBackToLanding = () => {
        setShowLanding(true);
    };

    // Render Logic
    if (showLanding) {
        return <LandingPage onEnter={handleEnterSystem} />;
    }

    if (!user) {
        return <AuthPage onLogin={handleLogin} doctors={doctors} setDoctors={setDoctors} pendingDoctors={pendingDoctors} onBack={handleBackToLanding} setPendingDoctors={setPendingDoctors} adminAccount={adminAccount} setAdminAccount={setAdminAccount} nurses={nurses} setNurses={setNurses} />;
    }

    if (userType === 'admin') {
        return <AdminDashboard user={user} onLogout={handleLogout} doctors={doctors} setDoctors={setDoctors} pendingDoctors={pendingDoctors} setPendingDoctors={setPendingDoctors} adminAccount={adminAccount} patients={patients} setPatients={setPatients} nurses={nurses} setNurses={setNurses} />;
    } else if (userType === 'nurse') {
        return <NurseDashboard user={user} onLogout={handleLogout} patients={patients} doctors={doctors} />;
    } else {
        return <DoctorDashboard user={user} onLogout={handleLogout} doctors={doctors} patients={patients} />;
    }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<window.App />);
