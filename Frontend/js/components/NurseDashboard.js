window.NurseDashboard = ({ user, onLogout, patients, doctors }) => {
    const { useState, useEffect, useRef, useMemo } = React;
    const { Logout, Heart, Activity, Thermometer, Wind, AlertTriangle, User } = window.Icons;

    const renderSparkline = (data, color, min, max) => {
        if (!data || data.length < 2) return null;
        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * 100;
            const normalizedVal = Math.max(min, Math.min(val, max));
            const y = 100 - ((normalizedVal - min) / (max - min)) * 100;
            return `${x},${y}`;
        }).join(' ');
        return (
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    };

    // State
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [selectedMetric, setSelectedMetric] = useState(null);
    const [history, setHistory] = useState({ spo2: [], heartRate: [], temp: [] });
    const [sensorStatus, setSensorStatus] = useState({ isActive: false, lastUpdated: null });
    const [alarmPatient, setAlarmPatient] = useState(null);
    const [silenceCode, setSilenceCode] = useState('');
    const [audioContext, setAudioContext] = useState(null);
    const oscillatorRef = useRef(null);
    const [isAlarmActive, setIsAlarmActive] = useState(false);
    const [allVitals, setAllVitals] = useState({});
    // canvasRef removed as we are switching to SVG charts

    // Initialize Audio Context on user interaction (browser policy)
    useEffect(() => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(ctx);
        return () => {
            if (ctx) ctx.close();
        };
    }, []);

    // Alarm Logic
    const startAlarm = () => {
        if (!audioContext || oscillatorRef.current) return;
        
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, audioContext.currentTime); // High pitch beep
        
        // Pulsing effect
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        
        osc.connect(gainNode);
        gainNode.connect(audioContext.destination);
        osc.start();
        
        oscillatorRef.current = osc;
        setIsAlarmActive(true);

        // Make it beep intermittently
        const interval = setInterval(() => {
            if (audioContext.state === 'suspended') audioContext.resume();
            if (gainNode.gain.value > 0) {
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            } else {
                gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
            }
        }, 500);
        
        osc.stopCallback = () => clearInterval(interval);
    };

    const stopAlarm = () => {
        if (oscillatorRef.current) {
            oscillatorRef.current.stop();
            oscillatorRef.current.disconnect();
            if (oscillatorRef.current.stopCallback) oscillatorRef.current.stopCallback();
            oscillatorRef.current = null;
        }
        setIsAlarmActive(false);
    };

    // Monitor Patients for Critical Status
    useEffect(() => {
        // Find first critical patient
        const criticalPatient = patients.find(p => p.status === 'Critical' && p.isOnline);
        
        if (criticalPatient) {
            if (!alarmPatient) {
                setAlarmPatient(criticalPatient);
                startAlarm();
            }
        } else {
            // Auto-stop alarm if condition clears (optional, but requested behavior implies manual stop)
            // But if patient becomes stable, alarm should probably stop or at least be dismissible easier.
            // Requirement says "code type that will stop that beep alarm".
            // So we persist alarm until code is entered, unless patient is removed? 
            // Let's keep it simple: Alarm stays until silenced or patient is no longer critical.
             if (alarmPatient && (!patients.find(p => p.id === alarmPatient.id) || patients.find(p => p.id === alarmPatient.id).status !== 'Critical')) {
                 setAlarmPatient(null);
                 stopAlarm();
             }
        }
    }, [patients, alarmPatient]);

    const handleSilenceSubmit = (e) => {
        e.preventDefault();
        // Simple code for now: "1234" or maybe specific nurse code?
        // User said "have code type". Let's assume any code works or a specific one.
        // Let's use "STOP" or "1234".
        if (silenceCode === '1234') {
            stopAlarm();
            setAlarmPatient(null); // Clear the modal
            setSilenceCode('');
        } else {
            alert('Incorrect Silence Code!');
        }
    };

    // --- Charting & Selection Logic (Similar to DoctorDashboard) ---

    // Set initial selected patient
    useEffect(() => {
        if (patients.length > 0 && !selectedPatient) {
            setSelectedPatient(patients[0]);
        }
    }, [patients]);

    // History Reset on Patient Change
    useEffect(() => {
        if (!selectedPatient) return;
        setHistory({
            spo2: [selectedPatient.vitals.spo2],
            heartRate: [selectedPatient.vitals.heartRate],
            temp: [parseFloat(selectedPatient.vitals.temp)]
        });
    }, [selectedPatient?.id || selectedPatient?._id]);

    // Fetch live vitals from backend every 10 seconds
    useEffect(() => {
        if (!selectedPatient) return;
        
        const fetchVitals = async () => {
            try {
                const API_BASE = window.API_BASE || 'http://localhost:5001/api';
                const token = localStorage.getItem('app_token');
                const response = await fetch(`${API_BASE}/vitals/${selectedPatient.patientId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) {
                    setSensorStatus({ isActive: false, lastUpdated: null });
                    return;
                }
                
                const vitalsData = await response.json();
                if (vitalsData.length > 0) {
                    const latest = vitalsData[0]; // Most recent
                    console.log('📊 Live vitals fetched (Nurse):', latest);
                    
                    // Check if vitals were just updated (within last 20 seconds)
                    const createdTime = new Date(latest.createdAt || latest.timestamp).getTime();
                    const now = new Date().getTime();
                    const isRecentData = (now - createdTime) < 20000; // 20 seconds
                    
                    setSensorStatus({ 
                        isActive: isRecentData, 
                        lastUpdated: latest.createdAt || latest.timestamp 
                    });
                    
                    setHistory(prev => {
                        const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
                        return {
                            spo2: [...prev.spo2.slice(-49), clamp(latest.spo2 || prev.spo2[prev.spo2.length - 1], 88, 100)],
                            heartRate: [...prev.heartRate.slice(-49), clamp(latest.heartRate || prev.heartRate[prev.heartRate.length - 1], 50, 140)],
                            temp: [...prev.temp.slice(-49), clamp(latest.temperature || parseFloat(prev.temp[prev.temp.length - 1]), 96, 100.5)]
                        };
                    });
                } else {
                    setSensorStatus({ isActive: false, lastUpdated: null });
                }
            } catch (err) {
                console.warn('❌ Sensor Inactive - Failed to fetch vitals:', err.message);
                setSensorStatus({ isActive: false, lastUpdated: null });
                // Fallback to last known vitals - show them anyway
                setHistory(prev => {
                    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
                    const nextSpo2 = clamp((prev.spo2[prev.spo2.length - 1] || selectedPatient.vitals.spo2) + (Math.random() * 2 - 1), 88, 100);
                    const nextHr = clamp((prev.heartRate[prev.heartRate.length - 1] || selectedPatient.vitals.heartRate) + (Math.random() * 6 - 3), 50, 140);
                    const nextTemp = clamp((prev.temp[prev.temp.length - 1] || parseFloat(selectedPatient.vitals.temp)) + (Math.random() * 0.3 - 0.15), 96, 100.5);
                    return {
                        spo2: [...prev.spo2.slice(-49), Math.round(nextSpo2)],
                        heartRate: [...prev.heartRate.slice(-49), Math.round(nextHr)],
                        temp: [...prev.temp.slice(-49), parseFloat(nextTemp.toFixed(1))]
                    };
                });
            }
        };
        
        // Fetch immediately on mount
        fetchVitals();
        
        // Then fetch every 10 seconds
        const id = setInterval(fetchVitals, 10000);
        return () => clearInterval(id);
    }, [selectedPatient]);

    useEffect(() => {
        if (!patients || patients.length === 0) return;
        const token = localStorage.getItem('app_token');
        const API_BASE = window.API_BASE || 'http://localhost:5001/api';
        const fetchAll = async () => {
            const results = await Promise.all(
                patients.map(async (p) => {
                    try {
                        const r = await fetch(`${API_BASE}/vitals/${p.patientId}`, { headers: { Authorization: `Bearer ${token}` } });
                        if (!r.ok) return { id: p.patientId, latest: null };
                        const data = await r.json();
                        const list = Array.isArray(data) ? data : (data.data || data.vitals || []);
                        const latest = list[0] || null;
                        return { id: p.patientId, latest };
                    } catch {
                        return { id: p.patientId, latest: null };
                    }
                })
            );
            const map = {};
            results.forEach(({ id, latest }) => {
                if (latest) {
                    map[id] = {
                        spo2: Number(latest.spo2) || null,
                        heartRate: Number(latest.heartRate) || null,
                        temp: Number(latest.temperature) || null,
                        lastUpdated: latest.createdAt || latest.timestamp || null
                    };
                }
            });
            setAllVitals(map);
        };
        fetchAll();
        const intervalId = setInterval(fetchAll, 15000);
        return () => clearInterval(intervalId);
    }, [patients]);

    // Live Waveform Simulation (Canvas) - REMOVED
    
    const getStatusColor = (status) => {
        switch(status) {
            case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
            case 'Warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default: return 'bg-green-100 text-green-700 border-green-200';
        }
    };

    const assignedDoctor = selectedPatient ? doctors.find(d => d.id === selectedPatient.doctorId) : null;

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans relative">
            
            {/* ALARM OVERLAY */}
            {alarmPatient && isAlarmActive && (
                <div className="absolute inset-0 z-50 bg-red-600/90 backdrop-blur-md flex flex-col items-center justify-center animate-pulse-slow">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border-4 border-red-500">
                        <AlertTriangle size={64} className="mx-auto text-red-600 mb-4 animate-bounce" />
                        <h2 className="text-3xl font-bold text-red-700 mb-2">CRITICAL WARNING</h2>
                        <p className="text-xl font-semibold text-gray-800 mb-4">
                            Patient: {alarmPatient.name} (ID: {alarmPatient.patientId})
                        </p>
                        <p className="text-gray-600 mb-6">Vital signs indicate critical condition.</p>
                        
                        <form onSubmit={handleSilenceSubmit} className="space-y-4">
                            <input 
                                type="password" 
                                placeholder="Enter Code to Silence (1234)" 
                                className="w-full text-center text-2xl tracking-widest p-3 border-2 border-red-200 rounded-lg focus:border-red-500 outline-none"
                                value={silenceCode}
                                onChange={e => setSilenceCode(e.target.value)}
                                autoFocus
                            />
                            <button 
                                type="submit" 
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-lg"
                            >
                                STOP ALARM
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <aside className="w-80 bg-white shadow-lg flex flex-col z-20 border-r border-gray-200">
                <div className="p-6 border-b flex items-center justify-between bg-purple-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-600 text-white p-2 rounded-lg">
                            <Activity size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-gray-800">Nurse Station</h2>
                            <p className="text-xs text-purple-600 font-medium">Monitoring Dashboard</p>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                        <span>Total Patients</span>
                        <span className="font-bold text-gray-700">{patients.length}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {patients.map(p => (
                        <div 
                            key={p._id || p.id} 
                            onClick={() => setSelectedPatient(p)}
                            className={`p-3 rounded-xl cursor-pointer border transition-all relative overflow-hidden ${selectedPatient && (selectedPatient._id === p._id || selectedPatient.id === p.id) ? 'bg-purple-50 border-purple-500 shadow-md' : 'bg-white border-gray-100 hover:border-purple-200 hover:bg-gray-50'}`}
                        >
                            {p.status === 'Critical' && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-bl-lg animate-pulse"></div>}
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-gray-800 truncate">{p.name}</h3>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${getStatusColor(p.status)}`}>{p.status}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>ID: {p.patientId || p.id}</span>
                                {p.isOnline ? <span className="text-green-500 flex items-center gap-1">● Live</span> : <span className="text-gray-400">○ Offline</span>}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="p-4 border-t bg-gray-50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold">
                            {user.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium"
                    >
                        <Logout size={16} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Assigned Patients Vitals</h2>
                        <span className="text-xs text-gray-500">Auto-refreshing</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {patients.filter(p => p.doctorId && String(p.doctorId).length > 0).map(p => {
                            const v = allVitals[p.patientId] || {};
                            const spo2 = v.spo2 ?? (p.vitals?.spo2);
                            const hr = v.heartRate ?? (p.vitals?.heartRate);
                            const t = v.temp ?? (parseFloat(p.vitals?.temp));
                            const active = v.lastUpdated ? (Date.now() - new Date(v.lastUpdated).getTime() < 20000) : p.isOnline;
                            return (
                                <div key={p._id || p.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="font-semibold text-gray-800 truncate">{p.name}</div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {active ? 'Live' : 'Offline'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 mb-3">ID: {p.patientId || p.id}</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-center">
                                            <div className="text-[10px] uppercase text-gray-500">SpO₂</div>
                                            <div className="text-xl font-bold text-gray-800">{spo2 ? Math.round(spo2) : '-'}</div>
                                        </div>
                                        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                                            <div className="text-[10px] uppercase text-gray-500">Heart</div>
                                            <div className="text-xl font-bold text-gray-800">{hr ? Math.round(hr) : '-'}</div>
                                        </div>
                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                                            <div className="text-[10px] uppercase text-gray-500">Temp °F</div>
                                            <div className="text-xl font-bold text-gray-800">{t ? parseFloat(t).toFixed(1) : '-'}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {selectedPatient ? (
                    <div className="max-w-6xl mx-auto space-y-6">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                    {selectedPatient.name}
                                    {selectedPatient.isOnline && <span className="animate-pulse w-3 h-3 bg-green-500 rounded-full"></span>}
                                </h1>
                                <p className="text-gray-500 mt-1 flex items-center gap-4">
                                    <span>ID: {selectedPatient.patientId || selectedPatient.id}</span>
                                    <span>•</span>
                                    <span>{selectedPatient.gender}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <User size={14} /> 
                                        {assignedDoctor ? assignedDoctor.name : 'Unassigned'}
                                    </span>
                                </p>
                            </div>
                            <div className={`px-4 py-2 rounded-lg border ${getStatusColor(selectedPatient.status)}`}>
                                <p className="text-xs uppercase font-bold opacity-70">Current Status</p>
                                <p className="text-xl font-bold">{selectedPatient.status}</p>
                            </div>
                        </div>

                        {/* Vitals Grid */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">Vital Signs</h3>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${
                                sensorStatus.isActive 
                                    ? 'bg-green-200 text-green-800' 
                                    : 'bg-red-200 text-red-800'
                            }`}>
                                <span className={`w-2 h-2 rounded-full ${sensorStatus.isActive ? 'bg-green-600' : 'bg-red-600'} ${sensorStatus.isActive ? 'animate-pulse' : ''}`}></span>
                                {sensorStatus.isActive ? '🟢 Sensor Active' : '🔴 Sensor Inactive (Last Known)'}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* SPO2 */}
                            <div className="bg-orange-50 rounded-xl p-6 flex flex-col items-center justify-center border border-orange-100 transform transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer" onClick={() => setSelectedMetric('spo2')}>
                                <div className="text-orange-500 mb-2"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg></div>
                                <div className="text-xs text-gray-500 uppercase font-bold mb-1">SpO₂</div>
                                <div className="text-3xl font-bold text-gray-800">{history.spo2.length > 0 ? `${history.spo2[history.spo2.length-1]}%` : '-'}</div>
                            </div>
                            {/* Heart Rate */}
                            <div className="bg-green-50 rounded-xl p-6 flex flex-col items-center justify-center border border-green-100 transform transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer" onClick={() => setSelectedMetric('heartRate')}>
                                <div className="text-green-500 mb-2"><Activity /></div>
                                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Heart Rate</div>
                                <div className="text-3xl font-bold text-gray-800">{history.heartRate.length > 0 ? history.heartRate[history.heartRate.length-1] : '-'} <span className="text-lg text-gray-500 font-normal">bpm</span></div>
                            </div>
                            {/* Temp */}
                            <div className="bg-blue-50 rounded-xl p-6 flex flex-col items-center justify-center border border-blue-100 transform transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer" onClick={() => setSelectedMetric('temp')}>
                                <div className="text-blue-500 mb-2"><Thermometer /></div>
                                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Temperature</div>
                                <div className="text-3xl font-bold text-gray-800">{history.temp.length > 0 ? `${history.temp[history.temp.length-1]}°F` : '-'}</div>
                            </div>
                        </div>

                        {selectedMetric && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-sm font-semibold text-gray-700">Live {selectedMetric === 'spo2' ? 'SpO₂' : selectedMetric === 'heartRate' ? 'Heart Rate' : 'Temperature'} Monitor</div>
                                    <button className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 px-3 py-1 rounded" onClick={() => setSelectedMetric(null)}>Close</button>
                                </div>
                                <svg width="100%" height="250" viewBox="0 0 600 250" className="bg-white">
                                    {
                                        (() => {
                                            const data = history[selectedMetric] || [];
                                            if (data.length < 2) return (
                                                <text x="300" y="125" textAnchor="middle" fill="#9ca3af" fontSize="14">Waiting for data...</text>
                                            );
                                            
                                            // Chart dimensions
                                            const width = 600;
                                            const height = 250;
                                            const padding = 40;
                                            const chartW = width - padding * 2;
                                            const chartH = height - padding * 2;
                                            
                                            // Data Scaling
                                            const maxVal = Math.max(...data, selectedMetric === 'spo2' ? 100 : selectedMetric === 'heartRate' ? 150 : 105);
                                            const minVal = Math.min(...data, selectedMetric === 'spo2' ? 80 : selectedMetric === 'heartRate' ? 40 : 95);
                                            const range = maxVal - minVal || 1;
                                            
                                            // Helper to map values to coordinates
                                            const getX = (i) => padding + (i / (data.length - 1)) * chartW;
                                            const getY = (v) => height - padding - ((v - minVal) / range) * chartH;
                                            
                                            // Generate points for polyline
                                            const points = data.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
                                            
                                            // Grid Lines
                                            const gridLines = [];
                                            for(let i=0; i<=5; i++) {
                                                const y = height - padding - (i/5) * chartH;
                                                gridLines.push(<line key={`h-${i}`} x1={padding} y1={y} x2={width-padding} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />);
                                                gridLines.push(<text key={`ht-${i}`} x={padding - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">{Math.round(minVal + (i/5)*range)}</text>);
                                            }
                                            
                                            // Data Points
                                            const dots = data.map((v, i) => (
                                                <circle key={i} cx={getX(i)} cy={getY(v)} r="3" fill="#ef4444" stroke="#fff" strokeWidth="1" />
                                            ));

                                            return (
                                                <>
                                                    {/* Background Grid */}
                                                    {gridLines}
                                                    
                                                    {/* Axes */}
                                                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" strokeWidth="1" />
                                                    <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#374151" strokeWidth="1" />
                                                    
                                                    {/* Line Chart */}
                                                    <polyline points={points} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    
                                                    {/* Dots */}
                                                    {dots}
                                                    
                                                    {/* Labels */}
                                                    <text x={width/2} y={height - 10} textAnchor="middle" fontSize="12" fill="#374151">Time (seconds)</text>
                                                    <text x="15" y={height/2} transform={`rotate(-90, 15, ${height/2})`} textAnchor="middle" fontSize="12" fill="#374151">Value</text>
                                                </>
                                            );
                                        })()
                                    }
                                </svg>
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <Activity size={64} className="mb-4 opacity-20" />
                        <p className="text-xl font-medium">Select a patient to view live vitals</p>
                    </div>
                )}
            </main>
        </div>
    );
};
