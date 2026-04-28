window.AuthPage = ({ onLogin, doctors, pendingDoctors = [], onBack, setPendingDoctors, adminAccount, setAdminAccount, setDoctors, nurses, setNurses }) => {
    const { useState, useEffect } = React;
    
    // Random Floating ECG Pulses
    const [pulses, setPulses] = useState([]);
    
    useEffect(() => {
        const addPulse = () => {
            const id = Date.now();
            const newPulse = {
                id,
                top: Math.random() * 90 + '%',
                left: Math.random() * 90 + '%',
                scale: 0.6 + Math.random() * 0.6, // 0.6 to 1.2
            };
            setPulses(prev => [...prev, newPulse]);

            // Cleanup pulse after animation
            setTimeout(() => {
                setPulses(prev => prev.filter(p => p.id !== id));
            }, 4000); // Slightly longer than animation to be safe
        };

        const interval = setInterval(addPulse, 350); // New pulse every 0.35s for ~8-12 active pulses
        return () => clearInterval(interval);
    }, []);

    // Single P-QRS-T Pulse Path
    const pulsePath = "M0 50 h20 l3 -5 l3 5 h5 l2 5 l5 -40 l5 45 l3 -10 h5 l5 -8 l5 8 h20";

    const [userType, setUserType] = useState('admin'); // 'admin', 'doctor', or 'nurse'
    const [isLogin, setIsLogin] = useState(true); // For signup toggle
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetStep, setResetStep] = useState(0); // 0: Email, 1: New Password
    
    // Form Data
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', confirmPassword: '', domain: '', certificates: '', idNumber: '', phone: '', newPassword: '', confirmNewPassword: ''
    });

    const [animate, setAnimate] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        setAnimate(true);
    }, []);
    
    useEffect(() => {
        setFormData({ name: '', email: '', password: '', confirmPassword: '', domain: '', certificates: '', idNumber: '', phone: '', newPassword: '', confirmNewPassword: '' });
        setIsForgotPassword(false);
        setResetStep(0);
    }, [userType, isLogin]);

    const handleChange = (e) => {
        if (e.target.type === 'file') {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData(prev => ({ ...prev, [e.target.name]: reader.result }));
                };
                reader.readAsDataURL(file);
            }
        } else {
            setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        }
    };

    const closeSuccessMessage = () => {
        setSuccessMessage('');
        setIsLogin(true); // Switch to login after acknowledging success
        setIsForgotPassword(false);
        setResetStep(0);
        setFormData(prev => ({ ...prev, newPassword: '', confirmNewPassword: '' }));
    };

    const handleForgotPasswordSubmit = (e) => {
        e.preventDefault();
        const email = formData.email;
        
        if (resetStep === 0) {
            if (!email) {
                alert('Please enter your email address.');
                return;
            }

            let found = false;
            if (userType === 'admin') {
                if (adminAccount && adminAccount.email === email) {
                    found = true;
                }
            } else {
                const doctor = doctors.find(d => d.email === email);
                if (doctor) found = true;
            }

            if (found) {
                // Simulate email sending by going to next step directly for demo purposes
                setResetStep(1);
            } else {
                alert('No account found with this email address.');
            }
        } else {
            // Reset Step 1: Set New Password
            if (formData.newPassword !== formData.confirmNewPassword) {
                alert('Passwords do not match!');
                return;
            }
            
            if (formData.newPassword.length < 6) {
                alert('Password must be at least 6 characters long.');
                return;
            }

            if (userType === 'admin') {
                const updatedAdmin = { ...adminAccount, password: formData.newPassword };
                setAdminAccount(updatedAdmin);
            } else {
                const updatedDoctors = doctors.map(d => {
                    if (d.email === email) {
                        return { ...d, password: formData.newPassword };
                    }
                    return d;
                });
                setDoctors(updatedDoctors);
            }
            
            setSuccessMessage('Password reset successfully! You can now login with your new password.');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (userType === 'admin') {
            if (isLogin) {
                // Admin Login via backend
                const API_BASE = window.API_BASE || 'http://localhost:5001/api';
                fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: formData.email.trim(), password: formData.password })
                })
                .then(res => res.json().then(body => ({ ok: res.ok, body })))
                .then(({ ok, body }) => {
                    if (!ok) {
                        alert(body.error || body.message || 'Login failed');
                        return;
                    }
                    const { token, user } = body;
                    onLogin(user, 'admin', token);
                })
                .catch(err => {
                    console.error('Login error', err);
                    alert('Unable to reach authentication server.');
                });
            } else {
                // Admin Signup via backend
                if (formData.password !== formData.confirmPassword) {
                    alert('Passwords do not match!'); return;
                }
                const API_BASE = window.API_BASE || 'http://localhost:5001/api';
                const userId = `ADMIN${Date.now().toString().slice(-4)}`;
                const payload = {
                    userId,
                    name: formData.name,
                    phone: formData.email || '',
                    password: formData.password,
                    role: 'ADMIN'
                };
                fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(res => res.json().then(body => ({ ok: res.ok, body })))
                .then(({ ok, body }) => {
                    if (!ok) {
                        alert(body.error || body.message || 'Signup failed');
                        return;
                    }
                    // Auto-login admin after sign up
                    const user = { userId: payload.userId, name: payload.name, role: 'ADMIN' };
                    onLogin(user, 'admin');
                })
                .catch(err => {
                    console.error('Signup error', err);
                    alert('Unable to reach registration server.');
                });
            }
        } else if (userType === 'doctor') {
            if (isLogin) {
                // Doctor Login via backend
                const API_BASE = window.API_BASE || 'http://localhost:5001/api';
                fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: formData.email.trim(), password: formData.password })
                })
                .then(res => res.json().then(body => ({ ok: res.ok, body })))
                .then(({ ok, body }) => {
                    if (!ok) {
                        alert(body.error || body.message || 'Login failed');
                        return;
                    }
                    const { token, user } = body;
                    onLogin(user, 'doctor', token);
                })
                .catch(err => {
                    console.error('Login error', err);
                    alert('Unable to reach authentication server.');
                });
            } else {
                // Doctor Signup
                if (formData.password !== formData.confirmPassword) {
                    alert('Passwords do not match!'); return;
                }
                
                const finalName = formData.name.startsWith('Dr. ') ? formData.name : `Dr. ${formData.name}`;
                // Use a temporary ID for pending requests. The real ID will be assigned by Admin upon approval.
                const tempID = `REQ-${Date.now()}`;

                const newDoctorRequest = {
                    id: tempID,
                    name: finalName,
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password,
                    domain: formData.domain,
                    certificates: formData.certificates,
                    patients: [],
                    status: 'pending'
                };
                
                setPendingDoctors(prev => [...prev, newDoctorRequest]);
                setSuccessMessage('Registration successful! Please wait for Admin approval.');
                // We don't switch to login immediately, wait for user to close modal
            }
        } else if (userType === 'nurse') {
             if (isLogin) {
                // Nurse Login via backend
                const API_BASE = window.API_BASE || 'http://localhost:5001/api';
                fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: formData.email.trim(), password: formData.password })
                })
                .then(res => res.json().then(body => ({ ok: res.ok, body })))
                .then(({ ok, body }) => {
                    if (!ok) {
                        alert(body.error || body.message || 'Login failed');
                        return;
                    }
                    const { token, user } = body;
                    onLogin(user, 'nurse', token);
                })
                .catch(err => {
                    console.error('Login error', err);
                    alert('Unable to reach authentication server.');
                });
            } else {
                // Nurse Signup
                if (formData.password !== formData.confirmPassword) {
                    alert('Passwords do not match!'); return;
                }

                // Simple Nurse Signup (Direct for now, or could be pending like doctors)
                // Let's make it direct for simplicity or reuse pending? 
                // User said "all the login things will be of same type" -> probably implies pending approval too?
                // But let's stick to direct for now to ensure they can login immediately for testing.
                // Or better: Just add to 'nurses' state directly.
                
                const API_BASE = window.API_BASE || 'http://localhost:5001/api';
                const payload = {
                    userId: `NURSE${Date.now().toString().slice(-4)}`,
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    password: formData.password,
                    role: 'NURSE'
                };
                fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(res => res.json().then(body => ({ ok: res.ok, body })))
                .then(({ ok, body }) => {
                    if (!ok) {
                        alert(body.error || body.message || 'Registration failed');
                        return;
                    }
                    setSuccessMessage('Nurse Registration successful! You can now login.');
                })
                .catch(err => {
                    console.error('Nurse signup error', err);
                    alert('Unable to reach server.');
                });
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 bg-grid-pattern relative overflow-hidden flex items-center justify-center p-4">
            
            {/* Random Floating ECG Pulses */}
            <div className="ecg-pulse-container">
                {pulses.map(pulse => (
                    <div 
                        key={pulse.id} 
                        className="ecg-pulse" 
                        style={{ 
                            top: pulse.top, 
                            left: pulse.left, 
                            width: '200px', 
                            height: '100px', 
                            transform: `scale(${pulse.scale})` 
                        }}
                    >
                        <svg viewBox="0 0 180 100" className="w-full h-full" preserveAspectRatio="none">
                            <path d={pulsePath} className="ecg-pulse-path" />
                        </svg>
                    </div>
                ))}
            </div>

            {/* Success Modal */}
            {successMessage && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center transform scale-100 transition-all border border-gray-100">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Success!</h3>
                        <p className="text-gray-600 mb-8">{successMessage}</p>
                        <button 
                            onClick={closeSuccessMessage}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-green-500/30"
                        >
                            Continue to Login
                        </button>
                    </div>
                </div>
            )}

            {/* Background 3D Elements */}
            <div className="absolute top-[-10%] left-[-10%] opacity-20 pointer-events-none transform scale-75">
                <div className="floating-cross-container">
                    <div className="medical-cross">
                        <div className="cross-bar cross-h"></div>
                        <div className="cross-bar cross-v"></div>
                    </div>
                </div>
            </div>

            <div className="dna-container opacity-20 pointer-events-none hidden md:block" style={{ right: '-5%', bottom: '-10%', transform: 'rotate(-15deg) scale(0.6)' }}>
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="dna-strand" style={{ top: `${i * 30}px`, animationDelay: `${i * 0.2}s` }}>
                        <div className="dna-line"></div>
                        <div className="dna-dot"></div>
                        <div className="dna-dot"></div>
                    </div>
                ))}
            </div>

            {/* Back Button */}
            <button 
                onClick={onBack}
                className="fixed top-6 left-6 z-50 flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-all font-medium bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm hover:shadow-md border border-gray-200 group"
            >
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Home</span>
            </button>

            {/* Main Auth Card */}
            <div className={`w-full max-w-md transition-all duration-700 transform ${animate ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 relative overflow-hidden">
                    
                    {/* Decorative Top Line */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600"></div>

                    {/* Logo Area */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-4 text-blue-600 shadow-inner">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                            SMART<span className="text-blue-600">WARD</span>
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Secure Access Portal</p>
                    </div>

                    {/* User Type Toggle */}
                    <div className="flex bg-gray-100/80 p-1.5 rounded-xl mb-8 relative">
                        <div 
                            className="absolute top-1.5 bottom-1.5 bg-white rounded-lg shadow-sm transition-all duration-300 ease-in-out"
                            style={{ 
                                left: userType === 'admin' ? '0.375rem' : userType === 'doctor' ? 'calc(33.33% + 0.375rem)' : 'calc(66.66% + 0.375rem)', 
                                width: 'calc(33.33% - 0.75rem)' 
                            }}
                        ></div>
                        <button 
                            onClick={() => setUserType('admin')}
                            className={`relative flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors z-10 ${
                                userType === 'admin' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Administrator
                        </button>
                        <button 
                            onClick={() => setUserType('doctor')}
                            className={`relative flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors z-10 ${
                                userType === 'doctor' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Doctor
                        </button>
                        <button 
                            onClick={() => setUserType('nurse')}
                            className={`relative flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors z-10 ${
                                userType === 'nurse' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Nurse
                        </button>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-gray-800">
                            {isForgotPassword 
                                ? (resetStep === 0 ? 'Reset Password' : 'Set New Password')
                                : (userType === 'admin' 
                                    ? (isLogin ? 'Admin Login' : 'Create Admin Account') 
                                    : (userType === 'doctor' 
                                        ? (isLogin ? 'Doctor Login' : 'Doctor Registration') 
                                        : (isLogin ? 'Nurse Login' : 'Nurse Registration')))}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {isForgotPassword
                                ? (resetStep === 0 ? 'Enter your email to verify your account.' : 'Enter your new password below.')
                                : (isLogin ? 'Enter your credentials to access the dashboard.' : 'Fill in your details to request access.')}
                        </p>
                    </div>

                    <form onSubmit={isForgotPassword ? handleForgotPasswordSubmit : handleSubmit} className="space-y-5">
                        {isForgotPassword ? (
                            resetStep === 0 ? (
                                <div className="group">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        </div>
                                        <input 
                                            type="email" 
                                            name="email" 
                                            placeholder="Enter your registered email" 
                                            required 
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder-gray-400 text-gray-700" 
                                            onChange={handleChange}
                                            value={formData.email}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="group">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            </div>
                                            <input type="password" name="newPassword" placeholder="New Password" required className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder-gray-400 text-gray-700" onChange={handleChange} value={formData.newPassword} />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <input type="password" name="confirmNewPassword" placeholder="Confirm New Password" required className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder-gray-400 text-gray-700" onChange={handleChange} value={formData.confirmNewPassword} />
                                        </div>
                                    </div>
                                </>
                            )
                        ) : (
                            <>
                                {!isLogin && (
                                    <div className="group">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            </div>
                                            <input type="text" name="name" placeholder="Full Name" required className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder-gray-400 text-gray-700" onChange={handleChange} value={formData.name} />
                                        </div>
                                    </div>
                                )}
                                
                                {!isLogin && userType === 'doctor' && (
                                    <>
                                        <div className="group">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                                </div>
                                                <select 
                                                    name="domain" 
                                                    required 
                                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-700 appearance-none" 
                                                    onChange={handleChange}
                                                    value={formData.domain}
                                                >
                                                    <option value="">Select Specialty</option>
                                                    {window.MEDICAL_SPECIALTIES && window.MEDICAL_SPECIALTIES.map(specialty => (
                                                        <option key={specialty} value={specialty}>{specialty}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="group">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                </div>
                                                <input type="tel" name="phone" placeholder="Mobile Number" required className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder-gray-400 text-gray-700" onChange={handleChange} value={formData.phone} />
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1 uppercase tracking-wide">Professional License (PDF)</label>
                                            <input type="file" name="certificates" accept="application/pdf" className="w-full px-4 py-2 border border-dashed border-gray-300 rounded-xl bg-gray-50 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" onChange={handleChange} />
                                        </div>
                                    </>
                                )}

                                <div className="group">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        </div>
                                            <input 
                                            type="text" 
                                            name="email" 
                                            placeholder={userType === 'admin' ? "Email Address" : userType === 'nurse' ? "Email ID or Nurse ID" : "Email ID or Doctor ID or Mobile"} 
                                            required 
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder-gray-400 text-gray-700" 
                                            onChange={handleChange} 
                                            value={formData.email}
                                        />
                                    </div>
                                </div>
                                
                                <div className="group">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        </div>
                                        <input type="password" name="password" placeholder="Password" required className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder-gray-400 text-gray-700" onChange={handleChange} value={formData.password} />
                                    </div>
                                </div>
                                
                                {/* Forgot Password Link */}
                                {isLogin && (
                                    <div className="flex justify-end -mt-2">
                                        <button 
                                            type="button"
                                            onClick={() => setIsForgotPassword(true)}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                        >
                                            Forgot Password?
                                        </button>
                                    </div>
                                )}
                                
                                {!isLogin && (
                                    <div className="group">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <input type="password" name="confirmPassword" placeholder="Confirm Password" required className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder-gray-400 text-gray-700" onChange={handleChange} value={formData.confirmPassword} />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <button 
                            type="submit" 
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all interactive-hover"
                        >
                            {isForgotPassword 
                                ? (resetStep === 0 ? 'Verify Email' : 'Reset Password') 
                                : (isLogin ? 'Sign In' : 'Create Account')}
                        </button>
                    </form>

                    {isForgotPassword ? (
                        <div className="mt-6 text-center">
                            <button 
                                onClick={() => setIsForgotPassword(false)} 
                                className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Back to Login
                            </button>
                        </div>
                    ) : (
                        <div className="mt-6 text-center">
                            <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                                {isLogin ? "New here? Create an account" : "Already have an account? Sign In"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
