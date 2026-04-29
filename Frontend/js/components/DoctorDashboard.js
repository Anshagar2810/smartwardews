window.DoctorDashboard = ({ user, onLogout, doctors, patients: globalPatients }) => {
    const { useState, useEffect, useMemo } = React;
    const { Logout, Heart, Activity, Thermometer } = window.Icons;

    // Get live data for this doctor from the shared state
    // Filter global patients list for this doctor
    // Use useMemo to prevent re-creation of array on every render
    const patients = useMemo(() => 
        (globalPatients || []).filter(p => p.doctorId === user.id), 
        [globalPatients, user.id]
    );
    
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [selectedMetric, setSelectedMetric] = useState(null);
    const [history, setHistory] = useState({ spo2: [], heartRate: [], temp: [] });
    const [sensorStatus, setSensorStatus] = useState({ isActive: false, lastUpdated: null });
    const [fetchError, setFetchError] = useState('');

    // Set initial selected patient or update if list changes
    useEffect(() => {
        if (patients.length > 0) {
            if (!selectedPatient) {
                setSelectedPatient(patients[0]);
            } else {
                // Check if currently selected patient is still in the list
                const stillAssigned = patients.find(p => p.id === selectedPatient.id || p._id === selectedPatient._id);
                if (stillAssigned) {
                    // Update the selected patient object to reflect any changes (e.g. status updates)
                    // but don't reset to first one if found
                    setSelectedPatient(stillAssigned);
                } else {
                    // Only if the currently selected one is gone, reset to first
                    setSelectedPatient(patients[0]);
                }
            }
        } else {
            setSelectedPatient(null);
        }
    }, [patients]); // Removed globalPatients from dependency to avoid unnecessary resets if filtered list is stable

    useEffect(() => {
        if (!selectedPatient) return;
        // If switching patients, reset history to current snapshot
        setHistory({
            spo2: [selectedPatient.vitals.spo2],
            heartRate: [selectedPatient.vitals.heartRate],
            temp: [parseFloat(selectedPatient.vitals.temp)]
        });
    }, [selectedPatient?.id || selectedPatient?._id]); // Only reset if ID changes

    // When user opens a specific metric, fetch ThingSpeak history for that field
    useEffect(() => {
        if (!selectedPatient || !selectedMetric) return;

        // Map metric to ThingSpeak field numbers
        const fieldMap = { spo2: '1', heartRate: '2', temp: '3' };
        const field = fieldMap[selectedMetric] || '1';

        const fetchTS = async () => {
            try {
                const token = localStorage.getItem('app_token');
                // Proxy through backend to avoid exposing keys
                const res = await fetch(`${window.API_BASE || 'http://localhost:5001/api'}/vitals/thingspeak?field=${field}&results=60`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) return;
                const body = await res.json();
                const series = body.series || [];
                if (!series.length) return;

                // Create arrays for the selected metric
                const values = series.map(s => Number(s.value || 0)).filter(v => !isNaN(v));
                if (values.length === 0) return;

                setHistory(prev => ({
                    ...prev,
                    [selectedMetric]: values.map(v => (selectedMetric === 'temp' ? parseFloat(v) : Math.round(v)))
                }));
            } catch (err) {
                console.warn('Failed to fetch ThingSpeak series', err.message);
            }
        };

        fetchTS();
    }, [selectedMetric, selectedPatient]);

    useEffect(() => {
        // Fetch live vitals from backend every 10 seconds
        if (!selectedPatient) return;
        
        const fetchVitals = async () => {
            try {
                const token = localStorage.getItem('app_token');
                const patId = selectedPatient.patientId;
                const API_BASE = window.API_BASE || 'http://localhost:5001/api';
                const url = `${API_BASE}/vitals/${patId}`;
                console.log('🔍 Fetching vitals for patientId:', patId, 'URL:', url);
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                console.log('📨 Vitals response status:', response.status);
                if (!response.ok) {
                    setSensorStatus({ isActive: false, lastUpdated: null });
                    try {
                        const errBody = await response.json().catch(() => null);
                        const msg = (errBody && (errBody.error || errBody.message)) || `Failed to fetch vitals: ${response.status}`;
                        console.error('❌ API Error:', msg);
                        setFetchError(msg);
                    } catch (e) {
                        setFetchError(`Failed to fetch vitals: ${response.status}`);
                    }
                    return;
                }
                
                const vitalsData = await response.json();
                // Support array or wrapped responses
                const list = Array.isArray(vitalsData) ? vitalsData : (vitalsData.data || vitalsData.vitals || vitalsData.series || []);
                console.log('📦 Vitals response data:', vitalsData, 'parsed list length:', list.length);
                if (list.length > 0) {
                    const latest = list[0]; // Most recent
                    console.log('📊 Live vitals fetched:', latest);
                    
                    // Check if vitals were just updated (within last 20 seconds)
                    const createdTime = new Date(latest.createdAt || latest.timestamp || latest.created_at).getTime();
                    const now = new Date().getTime();
                    const isRecentData = (now - createdTime) < 20000; // 20 seconds

                    // Also query ThingSpeak status endpoint for a channel-level active flag
                    let tsIsActive = false;
                    let tsLast = null;
                    try {
                        const statusRes = await fetch(`${window.API_BASE || 'http://localhost:5001/api'}/vitals/thingspeak/status`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (statusRes.ok) {
                            const st = await statusRes.json();
                            tsIsActive = !!st.isActive;
                            tsLast = st.lastUpdated || null;
                        }
                    } catch (e) {
                        // ignore ThingSpeak status failures
                    }

                    const finalIsActive = isRecentData || tsIsActive;

                    setSensorStatus({ 
                        isActive: finalIsActive, 
                        lastUpdated: tsLast || latest.createdAt || latest.timestamp || latest.created_at
                    });
                    
                    setHistory(prev => {
                        const clamp = (val, min, max) => {
                            if (val == null || isNaN(val)) return prev.spo2 ? prev.spo2[prev.spo2.length - 1] || min : min;
                            return Math.min(Math.max(val, min), max);
                        };
                        return {
                            spo2: [...prev.spo2.slice(-49), clamp(latest.spo2 ?? prev.spo2[prev.spo2.length - 1], 88, 100)],
                            heartRate: [...prev.heartRate.slice(-49), clamp(latest.heartRate ?? prev.heartRate[prev.heartRate.length - 1], 50, 140)],
                            temp: [...prev.temp.slice(-49), clamp(latest.temperature ?? parseFloat(prev.temp[prev.temp.length - 1]), 96, 100.5)]
                        };
                    });
                } else {
                    console.warn('⚠️ No vitals returned from API');
                    setSensorStatus({ isActive: false, lastUpdated: null });
                }
            } catch (err) {
                console.warn('❌ Sensor Inactive - Failed to fetch vitals:', err.message);
                setSensorStatus({ isActive: false, lastUpdated: null });
                setFetchError(err.message || 'Failed to fetch live vitals');
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

    const getStatusColor = (status) => {
        switch(status) {
            case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
            case 'Warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default: return 'bg-green-100 text-green-700 border-green-200';
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Sidebar / Patient List */}
            <aside className="w-80 bg-white shadow-lg flex flex-col z-20">
                <div className="p-6 border-b flex items-center justify-between">
                    <h2 className="font-bold text-xl text-gray-800">Patients List</h2>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{patients.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {patients.length === 0 ? (
                        <p className="text-center text-gray-500 mt-10">No patients assigned yet.</p>
                    ) : patients.map(p => (
                        <div 
                            key={p._id || p.id} 
                            onClick={() => setSelectedPatient(p)}
                            className={`p-4 rounded-xl cursor-pointer border transition-all ${selectedPatient && (selectedPatient._id === p._id || selectedPatient.id === p.id) ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-gray-800">{p.name}</h3>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${getStatusColor(p.status)}`}>{p.status}</span>
                            </div>
                            <p className="text-xs text-gray-500">{p.patientId || p.id}</p>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t bg-gray-50">
                    <div className="flex items-center mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold mr-3">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.field}</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full flex items-center justify-center space-x-2 text-sm text-gray-600 hover:text-red-600 py-2 rounded hover:bg-gray-100 transition-colors">
                        <Logout /> <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Header */}
                <header className="bg-white shadow-sm px-8 py-5 flex justify-between items-center z-10">
                    <div className="flex items-center text-blue-600 space-x-2">
                        <Heart />
                        <span className="font-bold text-xl tracking-tight text-gray-800">Smart Ward <span className="text-blue-600 font-light">Monitor</span></span>
                    </div>
                    <div className="text-sm text-gray-500">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </header>

                {/* Error notice */}
                {fetchError && (
                    <div className="p-4 bg-red-100 border border-red-200 rounded-md mx-8 my-4 flex items-center justify-between">
                        <div className="text-sm text-red-800">Unable to load live data — {fetchError}</div>
                        <button className="text-red-700 text-sm font-medium ml-4" onClick={() => setFetchError('')}>Dismiss</button>
                    </div>
                )}

                {/* Patient Dashboard Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {selectedPatient ? (
                        <div className="max-w-5xl mx-auto space-y-6">
                            
                            {/* Patient Info Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <div className="bg-blue-600 -mx-6 -mt-6 px-6 py-4 rounded-t-2xl mb-6">
                                    <h2 className="text-white font-bold text-lg">Patient Information</h2>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Patient Name</p>
                                        <p className="text-lg font-bold text-gray-800">{selectedPatient.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Age</p>
                                        <p className="text-lg font-bold text-gray-800">{selectedPatient.age} years</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Patient ID</p>
                                        <p className="text-lg font-bold text-gray-800">{selectedPatient.patientId || selectedPatient.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Device ID</p>
                                        <p className="text-lg font-bold text-gray-800">{selectedPatient.deviceId}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Phone Number</p>
                                        <p className="text-base text-gray-700">{selectedPatient.phone}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Vitals Signs */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-green-600 px-6 py-4 flex justify-between items-center">
                                    <h2 className="text-white font-bold text-lg">Vital Signs</h2>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${
                                        sensorStatus.isActive 
                                            ? 'bg-green-200 text-green-800' 
                                            : 'bg-red-200 text-red-800'
                                    }`}>
                                        <span className={`w-2 h-2 rounded-full ${sensorStatus.isActive ? 'bg-green-600' : 'bg-red-600'} ${sensorStatus.isActive ? 'animate-pulse' : ''}`}></span>
                                        {sensorStatus.isActive ? '🟢 Sensor Active' : '🔴 Sensor Inactive (Last Known)'}
                                    </div>
                                </div>
                                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* SPO2 */}
                                    <div className="bg-orange-50 rounded-xl p-6 flex flex-col items-center justify-center border border-orange-100 transform transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer" onClick={() => setSelectedMetric('spo2')}>
                                        <div className="text-orange-500 mb-2"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg></div>
                                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">SpO₂</div>
                                        <div className="text-3xl font-bold text-gray-800">{history.spo2 && history.spo2.length > 0 && history.spo2[history.spo2.length - 1] != null && !isNaN(history.spo2[history.spo2.length - 1]) ? history.spo2[history.spo2.length - 1] : (selectedPatient?.vitals?.spo2 || '-')} %</div>
                                    </div>
                                    {/* Heart Rate */}
                                    <div className="bg-green-50 rounded-xl p-6 flex flex-col items-center justify-center border border-green-100 transform transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer" onClick={() => setSelectedMetric('heartRate')}>
                                        <div className="text-green-500 mb-2"><Activity /></div>
                                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Heart Rate</div>
                                        <div className="text-3xl font-bold text-gray-800">{history.heartRate && history.heartRate.length > 0 && history.heartRate[history.heartRate.length - 1] != null && !isNaN(history.heartRate[history.heartRate.length - 1]) ? history.heartRate[history.heartRate.length - 1] : (selectedPatient?.vitals?.heartRate || '-')} <span className="text-lg text-gray-500 font-normal">bpm</span></div>
                                    </div>
                                    {/* Temp */}
                                    <div className="bg-blue-50 rounded-xl p-6 flex flex-col items-center justify-center border border-blue-100 transform transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer" onClick={() => setSelectedMetric('temp')}>
                                        <div className="text-blue-500 mb-2"><Thermometer /></div>
                                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Temperature</div>
                                        <div className="text-3xl font-bold text-gray-800">{history.temp && history.temp.length > 0 && history.temp[history.temp.length - 1] != null && !isNaN(history.temp[history.temp.length - 1]) ? history.temp[history.temp.length - 1] : (selectedPatient?.vitals?.temp || '-')} °F</div>
                                    </div>
                                    
                                </div>
                                {selectedMetric && (
                                    <div className="px-8 pb-8">
                                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
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
                                    </div>
                                )}
                            </div>

                            {/* Overall Status & EWS Score */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <p className="text-sm font-bold text-gray-400 uppercase">Early Warning Score (EWS)</p>
                                        <p className="text-xl font-bold text-gray-800">Risk Assessment</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-block px-4 py-1 rounded-full text-sm font-bold mb-1 ${
                                            (selectedPatient.ewsScore || 0) >= 7 ? 'bg-red-100 text-red-700' :
                                            (selectedPatient.ewsScore || 0) >= 5 ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            Score: {selectedPatient.ewsScore || 0}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50 rounded-lg p-4">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Clinical Response</p>
                                        <div className="flex items-center space-x-2">
                                            <span className={`px-3 py-1 rounded text-sm font-medium ${selectedPatient.isOnline ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                                {selectedPatient.isOnline ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`px-6 py-2 rounded-lg text-lg font-bold uppercase tracking-widest ${getStatusColor(selectedPatient.status)}`}>
                                        {selectedPatient.status}
                                    </span>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <svg className="w-20 h-20 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            <p className="text-lg">Select a patient from the list to view details.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};