window.AdminDashboard = ({ user, onLogout, doctors, setDoctors, pendingDoctors, setPendingDoctors, adminAccount, patients = [], setPatients, nurses = [], setNurses }) => {
    const { useState, useEffect } = React;
    const { UserPlus, UserCheck, Table, Trash, XMark, Logout, Activity, Eye, EyeOff, Menu, FileText, Check, ChevronLeft, ChevronRight, User } = window.Icons;
    const { MEDICAL_SPECIALTIES } = window;

    // View State
    const [currentView, setCurrentView] = useState('dashboard'); 
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [expandedMenu, setExpandedMenu] = useState({ doctors: true, patients: true, nurses: true });

    // Form States
    const [newDoc, setNewDoc] = useState({ name: '', field: '', email: '', phone: '', password: '' });
    const [newNurse, setNewNurse] = useState({ name: '', email: '', phone: '', password: '' });
    const [newPatient, setNewPatient] = useState({ name: '', age: '', phone: '', deviceId: '' });
    const [assignData, setAssignData] = useState({ docId: '', patientId: '' });

    const API_BASE = window.API_BASE || 'http://localhost:5001/api';

    const handleAddDoctor = (e) => {
        e.preventDefault();
        const payload = {
            userId: `DOC${Date.now().toString().slice(-4)}`,
            name: newDoc.name.startsWith('Dr. ') ? newDoc.name : `Dr. ${newDoc.name}`,
            phone: newDoc.phone,
            email: newDoc.email,
            password: newDoc.password,
            role: 'DOCTOR',
            domain: newDoc.field
        };

        fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json().then(body => ({ ok: res.ok, body })))
        .then(({ ok, body }) => {
            if (!ok) {
                alert(body.error || 'Failed to add doctor');
                return;
            }
            setDoctors(prev => [...prev, { ...payload, id: payload.userId }]);
            setNewDoc({ name: '', field: '', email: '', phone: '', password: '' });
            alert('Doctor added successfully!');
        })
        .catch(err => alert('Error connecting to server'));
    };

    const handleAddNurse = (e) => {
        e.preventDefault();
        const payload = {
            userId: `NURSE${Date.now().toString().slice(-4)}`,
            name: newNurse.name,
            phone: newNurse.phone,
            email: newNurse.email,
            password: newNurse.password,
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
                alert(body.error || 'Failed to add nurse');
                return;
            }
            setNurses(prev => [...prev, payload]);
            setNewNurse({ name: '', email: '', phone: '', password: '' });
            alert('Nurse added successfully!');
        })
        .catch(err => alert('Error connecting to server'));
    };

    const handleAddPatient = (e) => {
        e.preventDefault();
        const token = localStorage.getItem('app_token');
        const payload = {
            patientId: `PAT${Date.now().toString().slice(-4)}`,
            name: newPatient.name,
            age: parseInt(newPatient.age),
            phone: newPatient.phone,
            deviceId: newPatient.deviceId,
            doctorId: 'UNASSIGNED' 
        };

        fetch(`${API_BASE}/patients`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        })
        .then(res => res.json().then(body => ({ ok: res.ok, body })))
        .then(({ ok, body }) => {
            if (!ok) {
                alert(body.error || 'Failed to add patient');
                return;
            }
            setPatients(prev => [...prev, body.data || body]);
            setNewPatient({ name: '', age: '', phone: '', deviceId: '' });
            alert('Patient added successfully!');
        })
        .catch(err => alert('Error connecting to server'));
    };

    const handleAssignPatient = (e) => {
        e.preventDefault();
        if (!assignData.docId || !assignData.patientId) return;

        const token = localStorage.getItem('app_token');
        fetch(`${API_BASE}/patients/${assignData.patientId}/assign-doctor`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ doctorId: assignData.docId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                setPatients(prev => prev.map(p => (p.patientId === assignData.patientId ? { ...p, doctorId: assignData.docId } : p)));
                alert('Patient assigned successfully!');
            }
        })
        .catch(err => alert('Error assigning patient'));
    };

    const handleDeleteUser = (userId, role) => {
        if (!confirm(`Are you sure you want to delete this ${role.toLowerCase()}?`)) return;
        const token = localStorage.getItem('app_token');
        fetch(`${API_BASE}/auth/user/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            if (res.ok) {
                if (role === 'DOCTOR') setDoctors(prev => prev.filter(d => d.userId !== userId && d.id !== userId));
                if (role === 'NURSE') setNurses(prev => prev.filter(n => n.userId !== userId));
                alert('User deleted successfully');
            } else {
                alert('Failed to delete user');
            }
        });
    };

    const handleDeletePatient = (id) => {
        if (!confirm('Are you sure you want to delete this patient?')) return;
        const token = localStorage.getItem('app_token');
        fetch(`${API_BASE}/patients/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            if (res.ok) {
                setPatients(prev => prev.filter(p => p._id !== id && p.patientId !== id));
                alert('Patient deleted successfully');
            } else {
                alert('Failed to delete patient');
            }
        });
    };

    const renderDashboard = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-500 font-medium">Total Doctors</h3>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><User /></div>
                </div>
                <p className="text-3xl font-bold text-gray-800">{doctors.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-500 font-medium">Total Nurses</h3>
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><UserPlus /></div>
                </div>
                <p className="text-3xl font-bold text-gray-800">{nurses.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-500 font-medium">Total Patients</h3>
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Activity /></div>
                </div>
                <p className="text-3xl font-bold text-gray-800">{patients.length}</p>
            </div>
        </div>
    );

    const renderDoctorsList = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg">Doctors Management</h3>
                <button onClick={() => setCurrentView('add-doctor')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">+ Add Doctor</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Specialty</th>
                            <th className="px-6 py-4">Contact</th>
                            <th className="px-6 py-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {doctors.map(doc => (
                            <tr key={doc.userId || doc.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">{doc.name}</td>
                                <td className="px-6 py-4 text-gray-600">{doc.domain || doc.field || 'General'}</td>
                                <td className="px-6 py-4 text-gray-500 text-sm">{doc.email}<br/>{doc.phone}</td>
                                <td className="px-6 py-4">
                                    <button onClick={() => handleDeleteUser(doc.userId || doc.id, 'DOCTOR')} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"><Trash /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderNursesList = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg">Nurses Management</h3>
                <button onClick={() => setCurrentView('add-nurse')} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">+ Add Nurse</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Contact</th>
                            <th className="px-6 py-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {nurses.map(nurse => (
                            <tr key={nurse.userId} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">{nurse.name}</td>
                                <td className="px-6 py-4 text-gray-500 text-sm">{nurse.email}<br/>{nurse.phone}</td>
                                <td className="px-6 py-4">
                                    <button onClick={() => handleDeleteUser(nurse.userId, 'NURSE')} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"><Trash /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderPatientsList = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg">Patients Management</h3>
                <div className="space-x-2">
                    <button onClick={() => setCurrentView('add-patient')} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">+ Add Patient</button>
                    <button onClick={() => setCurrentView('assign-patient')} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">Assign Doctor</button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="px-6 py-4">Patient</th>
                            <th className="px-6 py-4">Device ID</th>
                            <th className="px-6 py-4">Assigned Doctor</th>
                            <th className="px-6 py-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {patients.map(p => (
                            <tr key={p.patientId} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{p.name}</div>
                                    <div className="text-xs text-gray-500">{p.age} years | {p.phone}</div>
                                </td>
                                <td className="px-6 py-4 font-mono text-sm text-blue-600">{p.deviceId}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.doctorId === 'UNASSIGNED' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {p.doctorId === 'UNASSIGNED' ? 'Not Assigned' : (doctors.find(d => d.userId === p.doctorId || d.id === p.doctorId)?.name || p.doctorId)}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <button onClick={() => handleDeletePatient(p._id || p.patientId)} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"><Trash /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderAddDoctorForm = () => (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Register New Doctor</h3>
            <form onSubmit={handleAddDoctor} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Name</label>
                    <input type="text" placeholder="e.g. Dr. John Doe" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500" value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                    <select className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={newDoc.field} onChange={e => setNewDoc({...newDoc, field: e.target.value})} required>
                        <option value="">Select Specialty</option>
                        {MEDICAL_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" placeholder="email@example.com" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500" value={newDoc.email} onChange={e => setNewDoc({...newDoc, email: e.target.value})} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input type="tel" placeholder="Phone number" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500" value={newDoc.phone} onChange={e => setNewDoc({...newDoc, phone: e.target.value})} required />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" placeholder="Set password" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500" value={newDoc.password} onChange={e => setNewDoc({...newDoc, password: e.target.value})} required />
                </div>
                <div className="pt-4">
                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">+ Register Doctor</button>
                </div>
            </form>
        </div>
    );

    const renderAddNurseForm = () => (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Register New Nurse</h3>
            <form onSubmit={handleAddNurse} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nurse Name</label>
                    <input type="text" placeholder="e.g. Jane Doe" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-purple-500" value={newNurse.name} onChange={e => setNewNurse({...newNurse, name: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" placeholder="email@example.com" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-purple-500" value={newNurse.email} onChange={e => setNewNurse({...newNurse, email: e.target.value})} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input type="tel" placeholder="Phone number" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-purple-500" value={newNurse.phone} onChange={e => setNewNurse({...newNurse, phone: e.target.value})} required />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" placeholder="Set password" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-purple-500" value={newNurse.password} onChange={e => setNewNurse({...newNurse, password: e.target.value})} required />
                </div>
                <div className="pt-4">
                    <button type="submit" className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200">+ Register Nurse</button>
                </div>
            </form>
        </div>
    );

    const renderAddPatientForm = () => (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Add New Patient</h3>
            <form onSubmit={handleAddPatient} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                    <input type="text" placeholder="Full name" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-green-500" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                        <input type="number" placeholder="Age" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-green-500" value={newPatient.age} onChange={e => setNewPatient({...newPatient, age: e.target.value})} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input type="tel" placeholder="Phone number" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-green-500" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} required />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Device ID (e.g. ESP32_001)</label>
                    <input type="text" placeholder="ESP32_XXX" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-green-500 font-mono" value={newPatient.deviceId} onChange={e => setNewPatient({...newPatient, deviceId: e.target.value})} required />
                </div>
                <div className="pt-4">
                    <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200">+ Add Patient</button>
                </div>
            </form>
        </div>
    );

    const renderAssignPatientForm = () => (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Assign Patient to Doctor</h3>
            <form onSubmit={handleAssignPatient} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Patient</label>
                    <select className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-orange-500 bg-white" value={assignData.patientId} onChange={e => setAssignData({...assignData, patientId: e.target.value})} required>
                        <option value="">Select Patient</option>
                        {patients.map(p => <option key={p.patientId} value={p.patientId}>{p.name} ({p.deviceId})</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Doctor</label>
                    <select className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-orange-500 bg-white" value={assignData.docId} onChange={e => setAssignData({...assignData, docId: e.target.value})} required>
                        <option value="">Select Doctor</option>
                        {doctors.map(d => <option key={d.userId || d.id} value={d.userId || d.id}>{d.name} ({d.domain || 'General'})</option>)}
                    </select>
                </div>
                <div className="pt-4">
                    <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200">Assign Patient</button>
                </div>
            </form>
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="p-6 flex items-center justify-between">
                    {isSidebarOpen && <div className="text-xl font-black text-blue-600">SMART WARD</div>}
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-gray-100 rounded-lg"><Menu /></button>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                    <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${currentView === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <div className="min-w-[1.5rem]"><Table /></div>
                        {isSidebarOpen && <span className="ml-3 font-medium">Dashboard</span>}
                    </button>

                    <div className="pt-4 pb-2 text-xs font-bold text-gray-400 px-4 uppercase tracking-widest">{isSidebarOpen ? 'Management' : '...'}</div>
                    
                    <button onClick={() => setCurrentView('doctors-list')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${currentView.includes('doctor') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <div className="min-w-[1.5rem]"><User /></div>
                        {isSidebarOpen && <span className="ml-3 font-medium">Doctors</span>}
                    </button>

                    <button onClick={() => setCurrentView('nurses-list')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${currentView.includes('nurse') ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <div className="min-w-[1.5rem]"><UserPlus /></div>
                        {isSidebarOpen && <span className="ml-3 font-medium">Nurses</span>}
                    </button>

                    <button onClick={() => setCurrentView('patients-list')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${currentView.includes('patient') ? 'bg-green-50 text-green-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <div className="min-w-[1.5rem]"><Activity /></div>
                        {isSidebarOpen && <span className="ml-3 font-medium">Patients</span>}
                    </button>
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button onClick={onLogout} className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all">
                        <div className="min-w-[1.5rem]"><Logout /></div>
                        {isSidebarOpen && <span className="ml-3 font-medium">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-600 text-white rounded-lg shadow-md"><UserCheck /></div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Admin Control Panel</h2>
                            <p className="text-xs text-gray-500 font-medium">Welcome back, {user.name}</p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8">
                    {currentView === 'dashboard' && renderDashboard()}
                    {currentView === 'doctors-list' && renderDoctorsList()}
                    {currentView === 'nurses-list' && renderNursesList()}
                    {currentView === 'patients-list' && renderPatientsList()}
                    {currentView === 'add-doctor' && renderAddDoctorForm()}
                    {currentView === 'add-nurse' && renderAddNurseForm()}
                    {currentView === 'add-patient' && renderAddPatientForm()}
                    {currentView === 'assign-patient' && renderAssignPatientForm()}
                </div>
            </main>
        </div>
    );
};