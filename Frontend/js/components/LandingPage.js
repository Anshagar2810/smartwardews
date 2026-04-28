window.LandingPage = ({ onEnter }) => {
    const { useState, useEffect, useRef } = React;
    const { Icons } = window;

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

    // Extended Single P-QRS-T Pulse Path (Longer tails)
    const pulsePath = "M0 50 h60 l3 -5 l3 5 h10 l2 5 l5 -40 l5 45 l3 -10 h10 l5 -8 l5 8 h60";

    // Interactive mouse movement effect
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    
    // Stats Counter State
    const [stats, setStats] = useState({ hospitals: 0, patients: 0, accuracy: 0 });
    const statsRef = useRef(null);
    const [statsVisible, setStatsVisible] = useState(false);

    // 3D Tilt State for Cards
    const cardRefs = useRef([]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({
                x: (e.clientX / window.innerWidth) * 20 - 10,
                y: (e.clientY / window.innerHeight) * 20 - 10
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // 3D Card Tilt Handler
    const handleCardMouseMove = (e, index) => {
        const card = cardRefs.current[index];
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg rotation
        const rotateY = ((x - centerX) / centerX) * 10;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const handleCardMouseLeave = (index) => {
        const card = cardRefs.current[index];
        if (card) {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        }
    };

    // Scroll Reveal Observer
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    if (entry.target.id === 'stats-section') {
                        setStatsVisible(true);
                    }
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    // Animated Counter Logic
    useEffect(() => {
        if (statsVisible) {
            const duration = 2000; // 2 seconds
            const steps = 60;
            const interval = duration / steps;
            
            let currentStep = 0;
            const timer = setInterval(() => {
                currentStep++;
                const progress = currentStep / steps;
                
                setStats({
                    hospitals: Math.floor(50 * progress),
                    patients: Math.floor(12000 * progress),
                    accuracy: 99.9
                });

                if (currentStep >= steps) clearInterval(timer);
            }, interval);
        }
    }, [statsVisible]);

    // Scroll to section handler
    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 bg-grid-pattern relative overflow-x-hidden flex flex-col font-sans">
            
            {/* Live Status Ticker */}
            <div className="bg-blue-900 text-blue-100 text-xs py-2 overflow-hidden relative z-50">
                <div className="ticker-wrap">
                    <div className="ticker">
                        <span className="ticker-item">● System Status: Operational</span>
                        <span className="ticker-item">● Live Patients Monitored: 1,248</span>
                        <span className="ticker-item">● AI Risk Analysis: Active</span>
                        <span className="ticker-item">● New Ward Added: ICU-Alpha (Delhi)</span>
                        <span className="ticker-item">● Server Latency: 12ms</span>
                        <span className="ticker-item">● Real-time Sync: Enabled</span>
                    </div>
                </div>
            </div>

            {/* Navbar */}
            <nav className="fixed top-8 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    {/* Logo - Click to Home */}
                    <button 
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="flex items-center space-x-3 group cursor-pointer focus:outline-none"
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all duration-300">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-gray-900">
                            SMART<span className="text-blue-600">WARD</span>
                        </span>
                    </button>

                    <div className="flex items-center space-x-6">
                        {/* About Link - Moves to section */}
                        <button 
                            onClick={() => scrollToSection('about-section')}
                            className="text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors uppercase tracking-wide"
                        >
                            About
                        </button>

                        {/* Highlighted Login Button */}
                        <button 
                            onClick={onEnter}
                            className="px-8 py-2.5 rounded-full bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transform hover:-translate-y-0.5 transition-all duration-300"
                        >
                            Login
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content Spacer for Fixed Nav */}
            <div className="h-28"></div>

            {/* Hero Section */}
            <main className="flex-none min-h-[calc(100vh-112px)] flex flex-col items-center justify-center relative z-10 px-4 text-center py-20 overflow-hidden">
                
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

                {/* 3D DNA Animation Background - Left Side */}
                <div className="dna-container hidden lg:block" style={{ left: '5%', top: '40%', transform: 'rotate(15deg) scale(0.8)' }}>
                    {[...Array(15)].map((_, i) => (
                        <div key={i} className="dna-strand" style={{ top: `${i * 30}px`, animationDelay: `${i * 0.2}s` }}>
                            <div className="dna-line"></div>
                            <div className="dna-dot"></div>
                            <div className="dna-dot"></div>
                        </div>
                    ))}
                </div>

                {/* 3D Floating Cross - Right Side */}
                <div className="hidden lg:block absolute right-[10%] top-[30%] opacity-80" style={{ zIndex: -1 }}>
                    <div className="floating-cross-container">
                        <div className="medical-cross">
                            <div className="cross-bar cross-h"></div>
                            <div className="cross-bar cross-v"></div>
                        </div>
                    </div>
                </div>

                {/* Hero Text */}
                <div 
                    className="max-w-5xl mx-auto mb-16 reveal active relative z-10"
                    style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
                >
                    <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-bold tracking-wide uppercase animate-pulse">
                        Next Gen Healthcare
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-tight text-gray-900">
                        THE FUTURE OF<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 animate-gradient glow-text">
                            PATIENT SAFETY
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
                        Real-time Early Warning System (EWS) for modern hospitals. 
                        Track vitals, predict risks, and save lives with intelligent automation.
                    </p>
                    
                    <button 
                        onClick={onEnter}
                        className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-blue-600 font-pj rounded-xl shadow-xl shadow-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 hover:bg-blue-700 hover:-translate-y-1"
                    >
                        Access Dashboard
                        <svg className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                </div>

                {/* Interactive Heart/ECG Animation */}
                <div className="w-full max-w-4xl h-48 relative flex items-center justify-center reveal">
                    <div className="relative">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                            <svg className="w-24 h-24 text-red-600 heart-beat drop-shadow-2xl" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <svg className="w-[800px] h-32" viewBox="0 0 800 100">
                            <path d="M0 50 L300 50 L310 50 L320 20 L330 80 L340 50 L350 50 L360 30 L370 70 L380 50 L420 50 L430 50 L440 20 L450 80 L460 50 L800 50" fill="none" stroke="#e5e7eb" strokeWidth="2" />
                            <path className="ecg-line" d="M0 50 L300 50 L310 50 L320 20 L330 80 L340 50 L350 50 L360 30 L370 70 L380 50 L420 50 L430 50 L440 20 L450 80 L460 50 L800 50" fill="none" strokeDasharray="1000" />
                        </svg>
                    </div>
                </div>
            </main>

            {/* Live Stats Section */}
            <section id="stats-section" className="py-20 bg-blue-600 text-white reveal relative overflow-hidden">
                 {/* Background Decorative Circles */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full translate-x-1/3 translate-y-1/3"></div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        <div className="p-6">
                            <div className="text-5xl font-black mb-2">{stats.hospitals}+</div>
                            <div className="text-blue-200 font-medium uppercase tracking-wide">Hospitals Connected</div>
                        </div>
                        <div className="p-6 border-l border-r border-blue-500">
                            <div className="text-5xl font-black mb-2">{stats.patients.toLocaleString()}+</div>
                            <div className="text-blue-200 font-medium uppercase tracking-wide">Patients Monitored</div>
                        </div>
                        <div className="p-6">
                            <div className="text-5xl font-black mb-2">99.9%</div>
                            <div className="text-blue-200 font-medium uppercase tracking-wide">System Uptime</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Interactive Feature Cards with 3D Tilt */}
            <section className="py-24 bg-white relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 reveal">
                        <h2 className="text-3xl font-bold text-gray-900">Why Choose Smart Ward?</h2>
                        <p className="text-gray-500 mt-4">Advanced technology meeting healthcare needs.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 perspective-1000">
                        {[
                            { title: 'Real-time Monitoring', desc: 'Continuous tracking of SpO₂, Heart Rate, and BP.', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                            { title: 'Instant Alerts', desc: 'WhatsApp & SMS notifications for critical conditions.', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
                            { title: 'AI Analytics', desc: 'Predictive risk scoring to prevent patient deterioration.', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
                        ].map((feature, i) => (
                            <div 
                                key={i} 
                                ref={el => cardRefs.current[i] = el}
                                onMouseMove={(e) => handleCardMouseMove(e, i)}
                                onMouseLeave={() => handleCardMouseLeave(i)}
                                className="dashboard-card p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition-all cursor-default reveal tilt-card shadow-lg" 
                                style={{ transitionDelay: `${i * 200}ms` }}
                            >
                                <div className="tilt-content">
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={feature.icon} /></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                                    <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about-section" className="py-32 bg-gray-50 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="order-2 lg:order-1 reveal">
                            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-8 leading-tight">
                                Transforming<br />
                                <span className="text-blue-600">Hospital Care</span>
                            </h2>
                            <div className="space-y-6 text-lg text-gray-600 leading-relaxed text-justify">
                                <p>
                                    <strong>Smart Ward EWS (Early Warning System)</strong> is an intelligent hospital monitoring platform designed to improve patient safety through continuous health surveillance and real-time alerts. The system integrates IoT-enabled medical devices with a centralized backend to collect vital signs such as heart rate, oxygen saturation (SpO₂), body temperature, and blood pressure.
                                </p>
                                <p>
                                    These vitals are automatically analyzed using predefined medical thresholds and risk-scoring logic to detect early signs of patient deterioration. The platform provides role-based dashboards for administrators, doctors, and nurses, enabling efficient patient management and real-time visualization of health data.
                                </p>
                                <p>
                                    When abnormal or critical conditions are detected, the system instantly triggers alerts, including WhatsApp notifications, ensuring timely medical intervention even when healthcare staff are not actively monitoring the dashboard. By combining automation, real-time data processing, and seamless communication, Smart Ward EWS helps reduce response time, minimize human error, and enhance overall quality of patient care in modern hospital environments.
                                </p>
                            </div>
                        </div>
                        <div className="order-1 lg:order-2 relative reveal">
                            <div className="absolute inset-0 bg-blue-600 blur-[100px] opacity-10 rounded-full"></div>
                            {/* 3D Floating Status Card */}
                            <div className="relative bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 transform rotate-2 hover:rotate-0 transition-transform duration-500 group animate-[float_6s_ease-in-out_infinite]">
                                <div className="flex items-center space-x-4 mb-8 border-b border-gray-100 pb-6">
                                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">System Active</h4>
                                        <p className="text-sm text-gray-500">Monitoring 24/7</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="h-2 bg-gray-100 rounded-full w-3/4 group-hover:w-full transition-all duration-1000"></div>
                                    <div className="h-2 bg-gray-100 rounded-full w-full group-hover:w-3/4 transition-all duration-1000 delay-100"></div>
                                    <div className="h-2 bg-gray-100 rounded-full w-5/6 group-hover:w-1/2 transition-all duration-1000 delay-200"></div>
                                    <div className="h-2 bg-gray-100 rounded-full w-1/2 group-hover:w-5/6 transition-all duration-1000 delay-300"></div>
                                </div>
                                <div className="mt-8 flex justify-between items-end">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Response Time</p>
                                        <p className="text-3xl font-black text-blue-600">&lt; 2s</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Accuracy</p>
                                        <p className="text-3xl font-black text-blue-600">99.9%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer with Contact & Socials */}
            <footer className="bg-white border-t border-gray-200 py-16 reveal">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-12">
                        <div className="col-span-2">
                            <div className="flex items-center space-x-2 mb-6">
                                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <span className="text-xl font-bold tracking-wider text-gray-900">SMART<span className="text-blue-600">WARD</span></span>
                            </div>
                            <p className="text-gray-500 leading-relaxed mb-6 max-w-sm">
                                Empowering healthcare professionals with intelligent tools for better patient outcomes.
                            </p>
                            {/* Social Icons */}
                            <div className="flex space-x-4">
                                {[
                                    { icon: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z', href: '#' }, // Facebook
                                    { icon: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z', href: '#' }, // Twitter
                                    { icon: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z', href: '#' }, // LinkedIn
                                    { icon: 'M12 2.163c3.204 0 3.584.012 4.85.072 3.269.143 4.797 3.072 4.872 4.85.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-3.087 4.757-4.872 4.85 1.265-.058 1.645-.069 4.85-.069z', href: '#' } // Instagram
                                ].map((social, i) => (
                                    <a key={i} href={social.href} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-blue-600 hover:text-white transition-all duration-300">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d={social.icon} /></svg>
                                    </a>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-gray-900 mb-6">Contact Us</h4>
                            <ul className="space-y-4 text-gray-600">
                                <li className="flex items-start space-x-3">
                                    <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <span>IILM UNIVERSITY GREATER NOIDA<br />Knowledge Park-2</span>
                                </li>
                                <li className="flex items-center space-x-3">
                                    <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    <span>+91 8860623884</span>
                                </li>
                                <li className="flex items-center space-x-3">
                                    <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    <span>khan.amaan1210@gmail.com</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-gray-900 mb-6">Quick Links</h4>
                            <ul className="space-y-3 text-gray-600">
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">System Status</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">Help Center</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-100 mt-16 pt-8 text-center text-gray-400 text-sm">
                        &copy; 2026 Smart Ward EWS. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};
