import React, { useState, useEffect } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Save, Upload, Edit2, Trash2, GripVertical } from 'lucide-react';

const WorkshopPlanner = () => {
  const [jobs, setJobs] = useState([
    { id: 1, number: '100-0001', name: 'Cabinet Build', totalHours: 40, color: '#e07a5f', notes: 'Oak finish required', completed: false },
    { id: 2, number: '100-0002', name: 'Table Restoration', totalHours: 20, color: '#81b29a', notes: 'Antique piece', completed: false },
  ]);
  
  const [personnel, setPersonnel] = useState([
    { id: 1, name: 'John' },
    { id: 2, name: 'Sarah' },
    { id: 3, name: 'Machine A' },
  ]);
  
  const [allocations, setAllocations] = useState({});
  const [startDate, setStartDate] = useState(new Date());
  const [editingJob, setEditingJob] = useState(null);
  const [draggedJobId, setDraggedJobId] = useState(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [hoveredCell, setHoveredCell] = useState(null);
  const [weeksToShow, setWeeksToShow] = useState(2);
  
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [hoursInput, setHoursInput] = useState('8');
  const [pendingAllocation, setPendingAllocation] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [draggedJobIndex, setDraggedJobIndex] = useState(null);
  const [draggedPersonIndex, setDraggedPersonIndex] = useState(null);
  const [draggedAllocation, setDraggedAllocation] = useState(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [showJobSummary, setShowJobSummary] = useState(false);
  const [jobFilter, setJobFilter] = useState('open'); // 'open', 'complete', 'all'
  const [showDaySummary, setShowDaySummary] = useState(false);
  const [daySummaryDate, setDaySummaryDate] = useState(new Date());
  const [darkMode, setDarkMode] = useState(false);

  const getCellAllocations = (personId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    const topKey = `${personId}-${dateStr}-top`;
    const bottomKey = `${personId}-${dateStr}-bottom`;
    
    return {
      top: allocations[topKey] || null,
      bottom: allocations[bottomKey] || null
    };
  };

  const generateDates = () => {
    const dates = [];
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    // Adjust to start on Monday
    const dayOfWeek = start.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday (0), go back 6 days, else go to Monday
    start.setDate(start.getDate() + daysToMonday);
    
    const totalDays = weeksToShow * 7;
    
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = generateDates();

  const getAllocatedHours = (jobId) => {
    let total = 0;
    Object.values(allocations).forEach(alloc => {
      if (alloc.jobId === jobId) {
        total += alloc.hours;
      }
    });
    return total;
  };

  const saveData = () => {
    const data = { jobs, personnel, allocations };
    localStorage.setItem('workshopPlannerData', JSON.stringify(data));
    alert('Data saved successfully!');
  };

  const loadData = () => {
    const saved = localStorage.getItem('workshopPlannerData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setJobs(data.jobs || []);
        setPersonnel(data.personnel || []);
        setAllocations(data.allocations || {});
        alert('Data loaded successfully!');
      } catch (e) {
        alert('Error loading data');
      }
    } else {
      alert('No saved data found');
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const data = { jobs, personnel, allocations };
      localStorage.setItem('workshopPlannerData', JSON.stringify(data));
    }, 30000);
    return () => clearInterval(interval);
  }, [jobs, personnel, allocations]);

  const addJob = () => {
    const newId = Math.max(0, ...jobs.map(j => j.id)) + 1;
    const colors = ['#e07a5f', '#81b29a', '#f2cc8f', '#3d5a80', '#98c1d9', '#ee6c4d'];
    setJobs([...jobs, {
      id: newId,
      number: `${String(Math.floor(100 + Math.random() * 900)).padStart(3, '0')}-${String(newId).padStart(4, '0')}`,
      name: 'New Job',
      totalHours: 0,
      color: colors[newId % colors.length],
      notes: '',
      completed: false
    }]);
  };

  const toggleJobComplete = (jobId) => {
    setJobs(jobs.map(j => j.id === jobId ? { ...j, completed: !j.completed } : j));
  };

  const getFilteredJobs = () => {
    if (jobFilter === 'open') return jobs.filter(j => !j.completed);
    if (jobFilter === 'complete') return jobs.filter(j => j.completed);
    return jobs;
  };

  const getDayAllocations = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayAllocs = [];
    
    Object.entries(allocations).forEach(([key, alloc]) => {
      if (alloc.date === dateStr) {
        const person = personnel.find(p => p.id === alloc.personId);
        const job = jobs.find(j => j.id === alloc.jobId);
        const slot = key.includes('-top') ? 'Morning' : 'Afternoon';
        
        if (person && job) {
          dayAllocs.push({
            key,
            person: person.name,
            personId: person.id,
            job: job.number,
            jobName: job.name,
            jobColor: job.color,
            hours: alloc.hours,
            slot,
            totalJobHours: job.totalHours,
            allocatedJobHours: getAllocatedHours(job.id),
            notes: job.notes
          });
        }
      }
    });
    
    return dayAllocs.sort((a, b) => a.person.localeCompare(b.person));
  };

  const changeDaySummaryDate = (days) => {
    const newDate = new Date(daySummaryDate);
    newDate.setDate(newDate.getDate() + days);
    setDaySummaryDate(newDate);
  };

  const updateJob = (id, updates) => {
    setJobs(jobs.map(j => j.id === id ? { ...j, ...updates } : j));
  };

  const deleteJob = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    
    setConfirmAction({
      message: 'Delete this job and all its allocations?',
      onConfirm: () => {
        setJobs(prevJobs => prevJobs.filter(j => j.id !== id));
        setAllocations(prevAllocs => {
          const newAllocs = {};
          Object.keys(prevAllocs).forEach(key => {
            if (prevAllocs[key].jobId !== id) {
              newAllocs[key] = prevAllocs[key];
            }
          });
          return newAllocs;
        });
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const addPerson = () => {
    if (newPersonName.trim()) {
      const newId = Math.max(0, ...personnel.map(p => p.id)) + 1;
      setPersonnel([...personnel, { 
        id: newId, 
        name: newPersonName.trim()
      }]);
      setNewPersonName('');
      setShowAddPerson(false);
    }
  };

  const updatePerson = (id, updates) => {
    setPersonnel(personnel.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removePerson = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    
    setConfirmAction({
      message: 'Remove this person/machine and all their allocations?',
      onConfirm: () => {
        setPersonnel(prevPersonnel => prevPersonnel.filter(p => p.id !== id));
        setAllocations(prevAllocs => {
          const newAllocs = {};
          Object.keys(prevAllocs).forEach(key => {
            if (prevAllocs[key].personId !== id) {
              newAllocs[key] = prevAllocs[key];
            }
          });
          return newAllocs;
        });
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleJobDragForReorder = (index) => {
    setDraggedJobIndex(index);
  };

  const handleJobDropForReorder = (index) => {
    if (draggedJobIndex !== null && draggedJobIndex !== index) {
      const newJobs = [...jobs];
      const [draggedJob] = newJobs.splice(draggedJobIndex, 1);
      newJobs.splice(index, 0, draggedJob);
      setJobs(newJobs);
    }
    setDraggedJobIndex(null);
  };

  const handlePersonDragForReorder = (index) => {
    setDraggedPersonIndex(index);
  };

  const handlePersonDropForReorder = (index) => {
    if (draggedPersonIndex !== null && draggedPersonIndex !== index) {
      const newPersonnel = [...personnel];
      const [draggedPerson] = newPersonnel.splice(draggedPersonIndex, 1);
      newPersonnel.splice(index, 0, draggedPerson);
      setPersonnel(newPersonnel);
    }
    setDraggedPersonIndex(null);
  };

  const handleJobDragStart = (e, jobId) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', jobId.toString());
    setDraggedJobId(jobId);
  };

  const handleCellDragOver = (e, personId, date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const slot = y < rect.height / 2 ? 'top' : 'bottom';
    
    setHoveredCell(`${personId}-${date.toISOString().split('T')[0]}`);
    setHoveredSlot(slot);
  };

  const handleCellDragLeave = () => {
    setHoveredCell(null);
    setHoveredSlot(null);
  };

  const handleCellDrop = (e, personId, date) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const slot = y < rect.height / 2 ? 'top' : 'bottom';
    
    const dateStr = date.toISOString().split('T')[0];
    const targetKey = `${personId}-${dateStr}-${slot}`;
    
    if (draggedAllocation) {
      const newAllocations = { ...allocations };
      
      if (!isDuplicating) {
        delete newAllocations[draggedAllocation.key];
      }
      
      newAllocations[targetKey] = {
        jobId: draggedAllocation.jobId,
        personId,
        date: dateStr,
        hours: draggedAllocation.hours
      };
      
      setAllocations(newAllocations);
      setDraggedAllocation(null);
      setIsDuplicating(false);
    } else if (draggedJobId) {
      setPendingAllocation({ jobId: draggedJobId, personId, date, key: targetKey, slot });
      setHoursInput('8');
      setShowHoursModal(true);
    }
    
    setHoveredCell(null);
    setHoveredSlot(null);
    setDraggedJobId(null);
  };

  const confirmHours = () => {
    const hours = parseFloat(hoursInput);
    if (!isNaN(hours) && hours > 0 && pendingAllocation) {
      setAllocations(prev => ({
        ...prev,
        [pendingAllocation.key]: { 
          jobId: pendingAllocation.jobId, 
          personId: pendingAllocation.personId, 
          date: pendingAllocation.date.toISOString().split('T')[0], 
          hours 
        }
      }));
    }
    setShowHoursModal(false);
    setPendingAllocation(null);
  };

  const handleJobDragEnd = () => {
    setDraggedJobId(null);
    setHoveredCell(null);
  };

  const updateAllocation = (e, key) => {
    e.preventDefault();
    e.stopPropagation();
    
    const alloc = allocations[key];
    setPendingAllocation({ ...alloc, key, isUpdate: true });
    setHoursInput(String(alloc.hours));
    setShowHoursModal(true);
  };

  const confirmUpdateHours = () => {
    const hours = parseFloat(hoursInput);
    
    if (!isNaN(hours) && hours > 0 && pendingAllocation) {
      setAllocations(prev => ({
        ...prev,
        [pendingAllocation.key]: { ...allocations[pendingAllocation.key], hours }
      }));
    } else if (hours === 0 && pendingAllocation) {
      setAllocations(prev => {
        const updated = { ...prev };
        delete updated[pendingAllocation.key];
        return updated;
      });
    }
    setShowHoursModal(false);
    setPendingAllocation(null);
  };

  const moveWeek = (direction) => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setStartDate(newDate);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        setIsDuplicating(true);
      }
    };
    
    const handleKeyUp = (e) => {
      if (!e.ctrlKey && !e.metaKey) {
        setIsDuplicating(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {showDaySummary ? (
        <div className="flex-1 flex flex-col">
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-6 flex justify-between items-center`}>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Day Summary</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeDaySummaryDate(-1)}
                  className={`p-2 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-xl transition-all`}
                >
                  <ChevronLeft size={20} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                </button>
                <div className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} min-w-[250px] text-center`}>
                  {daySummaryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <button
                  onClick={() => changeDaySummaryDate(1)}
                  className={`p-2 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-xl transition-all`}
                >
                  <ChevronRight size={20} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                </button>
                <button
                  onClick={() => setDaySummaryDate(new Date())}
                  className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all font-semibold shadow-sm hover:shadow-md transform hover:scale-105"
                >
                  Today
                </button>
              </div>
              <button 
                onClick={() => setShowDaySummary(false)}
                className={`px-6 py-3 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${darkMode ? 'text-white' : 'text-gray-900'} rounded-full transition-all font-semibold shadow-sm hover:shadow-md transform hover:scale-105`}
              >
                Back to Planner
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto">
              {getDayAllocations(daySummaryDate).length === 0 ? (
                <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-3xl border p-12 text-center shadow-sm`}>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-lg`}>No jobs scheduled for this day</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-3xl border p-6 shadow-sm`}>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Day Overview</h2>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-md">
                        <div className="text-sm text-blue-100 font-medium">Total Personnel</div>
                        <div className="text-3xl font-bold text-white mt-2">
                          {new Set(getDayAllocations(daySummaryDate).map(a => a.personId)).size}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 shadow-md">
                        <div className="text-sm text-emerald-100 font-medium">Total Jobs</div>
                        <div className="text-3xl font-bold text-white mt-2">
                          {new Set(getDayAllocations(daySummaryDate).map(a => a.job)).size}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 shadow-md">
                        <div className="text-sm text-amber-100 font-medium">Total Hours</div>
                        <div className="text-3xl font-bold text-white mt-2">
                          {getDayAllocations(daySummaryDate).reduce((sum, a) => sum + a.hours, 0)}h
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-md">
                        <div className="text-sm text-purple-100 font-medium">Allocations</div>
                        <div className="text-3xl font-bold text-white mt-2">
                          {getDayAllocations(daySummaryDate).length}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-3xl border shadow-sm overflow-hidden`}>
                    <table className="w-full">
                      <thead className={`${darkMode ? 'bg-gray-750' : 'bg-gray-50'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <tr>
                          <th className={`px-6 py-4 text-left text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Personnel</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Time Slot</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Job Number</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Job Name</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Hours Allocated</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Job Progress</th>
                          <th className={`px-6 py-4 text-left text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-wider`}>Notes</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {getDayAllocations(daySummaryDate).map((alloc, index) => {
                          const percentComplete = alloc.totalJobHours > 0 
                            ? Math.round((alloc.allocatedJobHours / alloc.totalJobHours) * 100) 
                            : 0;
                          
                          return (
                            <tr key={index} className={`${darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors`}>
                              <td className="px-6 py-4">
                                <div className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{alloc.person}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                                  alloc.slot === 'Morning' 
                                    ? 'bg-amber-100 text-amber-700' 
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {alloc.slot}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full shadow-sm" 
                                    style={{ backgroundColor: alloc.jobColor }}
                                  />
                                  <span className={`font-mono text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{alloc.job}</span>
                                </div>
                              </td>
                              <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{alloc.jobName}</td>
                              <td className="px-6 py-4">
                                <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{alloc.hours}h</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className={`flex-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2 max-w-[100px]`}>
                                    <div 
                                      className="bg-emerald-500 h-2 rounded-full transition-all" 
                                      style={{ width: `${Math.min(percentComplete, 100)}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{alloc.allocatedJobHours}/{alloc.totalJobHours}h</span>
                                </div>
                              </td>
                              <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} max-w-xs truncate`}>
                                {alloc.notes || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : showJobSummary ? (
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-stone-200 p-4 flex justify-between items-center shadow-sm">
            <h1 className="text-2xl font-bold text-stone-800 tracking-tight">Job Summary</h1>
            <div className="flex items-center gap-4">
              <div className="flex gap-2 bg-stone-100 rounded-lg p-1">
                <button
                  onClick={() => setJobFilter('open')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    jobFilter === 'open' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-600 hover:text-stone-800'
                  }`}
                >
                  Open Jobs
                </button>
                <button
                  onClick={() => setJobFilter('complete')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    jobFilter === 'complete' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-600 hover:text-stone-800'
                  }`}
                >
                  Complete Jobs
                </button>
                <button
                  onClick={() => setJobFilter('all')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    jobFilter === 'all' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-600 hover:text-stone-800'
                  }`}
                >
                  All Jobs
                </button>
              </div>
              <button 
                onClick={() => setShowJobSummary(false)}
                className="px-4 py-2 bg-stone-700 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium"
              >
                Back to Planner
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-6xl mx-auto">
              <table className="w-full bg-white rounded-lg shadow-sm border border-stone-200">
                <thead className="bg-stone-100 border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Job Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Est. Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Act. Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">% Complete</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Notes</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {getFilteredJobs().sort((a, b) => a.number.localeCompare(b.number)).map(job => {
                    const allocated = getAllocatedHours(job.id);
                    const percentComplete = job.totalHours > 0 ? Math.round((allocated / job.totalHours) * 100) : 0;
                    
                    return (
                      <tr key={job.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: job.color }}
                            />
                            <span className="font-mono text-sm font-semibold">{job.number}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-700">{job.name}</td>
                        <td className="px-4 py-3 text-sm text-stone-700">{job.totalHours}h</td>
                        <td className="px-4 py-3 text-sm text-stone-700">{allocated}h</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-stone-200 rounded-full h-2 max-w-[100px]">
                              <div 
                                className="bg-emerald-500 h-2 rounded-full transition-all" 
                                style={{ width: `${Math.min(percentComplete, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-stone-700">{percentComplete}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600 max-w-xs truncate">{job.notes || '-'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleJobComplete(job.id)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                              job.completed 
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            }`}
                          >
                            {job.completed ? 'Complete' : 'Open'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
      {showHoursModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-stone-800 mb-4">
              {pendingAllocation?.isUpdate ? 'Update Hours' : 'Enter Hours'}
            </h3>
            <input
              type="number"
              value={hoursInput}
              onChange={(e) => setHoursInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (pendingAllocation?.isUpdate ? confirmUpdateHours() : confirmHours())}
              className="w-full px-4 py-3 border-2 border-stone-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
              placeholder="Hours"
              autoFocus
            />
            {pendingAllocation?.isUpdate && (
              <p className="text-xs text-stone-500 mt-2">Enter 0 to delete this allocation</p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowHoursModal(false);
                  setPendingAllocation(null);
                }}
                className="flex-1 px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={pendingAllocation?.isUpdate ? confirmUpdateHours : confirmHours}
                className="flex-1 px-4 py-2 bg-stone-700 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-stone-800 mb-4">Confirm Action</h3>
            <p className="text-stone-600 mb-6">{confirmAction.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction.onConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-80 bg-white border-r border-stone-200 flex flex-col shadow-sm overflow-hidden">
        <div className="p-3 border-b border-stone-200 bg-gradient-to-r from-stone-50 to-white flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-stone-700 tracking-wide uppercase">Jobs</h2>
            <div className="flex gap-1">
              <button onClick={saveData} className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors" title="Save">
                <Save size={14} className="text-stone-600" />
              </button>
              <button onClick={loadData} className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors" title="Load">
                <Upload size={14} className="text-stone-600" />
              </button>
              <button onClick={addJob} className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors" title="Add Job">
                <Plus size={14} className="text-stone-600" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ maxHeight: 'calc(100vh - 60px)' }}>
          {jobs.filter(j => !j.completed).map((job, index) => {
            const allocated = getAllocatedHours(job.id);
            const remaining = job.totalHours - allocated;
            const isOverAllocated = remaining < 0;
            
            return (
              <div
                key={job.id}
                draggable={editingJob !== job.id}
                onDragStart={(e) => {
                  if (editingJob !== job.id) {
                    handleJobDragForReorder(index);
                    handleJobDragStart(e, job.id);
                  }
                }}
                onDragEnd={handleJobDragEnd}
                onDragOver={(e) => {
                  if (draggedJobIndex !== null) {
                    e.preventDefault();
                  }
                }}
                onDrop={(e) => {
                  if (draggedJobIndex !== null) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleJobDropForReorder(index);
                  }
                }}
                className={`border border-stone-200 rounded-lg p-2 ${editingJob !== job.id ? 'cursor-move hover:shadow-md hover:border-stone-300' : ''} transition-all bg-white ${draggedJobIndex === index ? 'opacity-50' : ''}`}
                style={{ borderLeftWidth: '4px', borderLeftColor: job.color }}
              >
                {editingJob === job.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={job.number}
                      onChange={(e) => updateJob(job.id, { number: e.target.value })}
                      className="w-full px-2 py-1 border border-stone-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                      placeholder="000-0000"
                    />
                    <input
                      type="text"
                      value={job.name}
                      onChange={(e) => updateJob(job.id, { name: e.target.value })}
                      className="w-full px-2 py-1 border border-stone-300 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-stone-400"
                      placeholder="Job Name"
                    />
                    <input
                      type="number"
                      value={job.totalHours}
                      onChange={(e) => updateJob(job.id, { totalHours: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-stone-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                      placeholder="Total Hours"
                    />
                    <input
                      type="color"
                      value={job.color}
                      onChange={(e) => updateJob(job.id, { color: e.target.value })}
                      className="w-full h-8 border border-stone-300 rounded"
                    />
                    <textarea
                      value={job.notes}
                      onChange={(e) => updateJob(job.id, { notes: e.target.value })}
                      className="w-full px-2 py-1 border border-stone-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                      placeholder="Notes"
                      rows="2"
                    />
                    <button
                      onClick={() => setEditingJob(null)}
                      className="w-full px-2 py-1 bg-stone-700 text-white rounded text-xs hover:bg-stone-800 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-stone-800">{job.number}</div>
                        <div className="text-xs text-stone-600 truncate">{job.name}</div>
                      </div>
                      <div className="flex gap-0.5 ml-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleJobComplete(job.id);
                          }}
                          className="p-1 hover:bg-emerald-50 rounded transition-colors"
                          title="Mark Complete"
                        >
                          <div className="w-3 h-3 border-2 border-emerald-600 rounded" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingJob(job.id);
                          }}
                          className="p-1 hover:bg-stone-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={12} className="text-stone-600" />
                        </button>
                        <button
                          onClick={(e) => deleteJob(e, job.id)}
                          className="p-1 hover:bg-red-50 rounded text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <div className="flex-1 bg-stone-50 rounded px-1.5 py-0.5">
                        <span className="text-stone-500">Total:</span>
                        <span className="font-medium text-stone-700 ml-1">{job.totalHours}h</span>
                      </div>
                      <div className="flex-1 bg-stone-50 rounded px-1.5 py-0.5">
                        <span className="text-stone-500">Used:</span>
                        <span className="font-medium text-stone-700 ml-1">{allocated}h</span>
                      </div>
                    </div>
                    <div className={`text-xs px-1.5 py-0.5 rounded ${isOverAllocated ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      <span className="font-semibold">{remaining}h</span> remaining {isOverAllocated && 'âš ï¸'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-stone-200 p-4 flex justify-between items-center shadow-sm">
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">Workshop Planner</h1>
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                setDaySummaryDate(new Date());
                setShowDaySummary(true);
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Day Summary
            </button>
            
            <button
              onClick={() => setShowJobSummary(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Job Summary
            </button>
            
            <div className="flex gap-2 bg-stone-100 rounded-lg p-1">
              <button
                onClick={() => setWeeksToShow(1)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  weeksToShow === 1 ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-600 hover:text-stone-800'
                }`}
              >
                1 Week
              </button>
              <button
                onClick={() => setWeeksToShow(2)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  weeksToShow === 2 ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-600 hover:text-stone-800'
                }`}
              >
                2 Weeks
              </button>
              <button
                onClick={() => setWeeksToShow(4)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  weeksToShow === 4 ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-600 hover:text-stone-800'
                }`}
              >
                4 Weeks
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <button onClick={() => moveWeek(-1)} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                <ChevronLeft size={20} className="text-stone-600" />
              </button>
              <span className="font-medium text-stone-700 min-w-[200px] text-center">
                {formatDate(dates[0])} - {formatDate(dates[dates.length - 1])}
              </span>
              <button onClick={() => moveWeek(1)} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                <ChevronRight size={20} className="text-stone-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-stone-50" style={{ overflowX: 'auto', overflowY: 'auto', scrollBehavior: 'smooth' }}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="border-2 border-stone-200 p-3 bg-gradient-to-br from-slate-100 to-slate-50 sticky left-0 z-20 min-w-[180px] shadow-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 font-bold uppercase text-xs tracking-wider">Personnel</span>
                    {showAddPerson ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={newPersonName}
                          onChange={(e) => setNewPersonName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addPerson()}
                          className="px-2 py-1 border border-stone-300 rounded-lg text-xs w-24 focus:outline-none focus:ring-2 focus:ring-stone-400"
                          placeholder="Name"
                          autoFocus
                        />
                        <button onClick={addPerson} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded-lg transition-colors">
                          <Plus size={14} />
                        </button>
                        <button onClick={() => setShowAddPerson(false)} className="text-red-600 hover:bg-red-50 p-1 rounded-lg transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddPerson(true)} className="hover:bg-stone-200 p-1.5 rounded-lg transition-colors">
                        <Plus size={16} className="text-stone-600" />
                      </button>
                    )}
                  </div>
                </th>
                {dates.map(date => (
                  <th 
                    key={date.toISOString()} 
                    className={`border-2 border-stone-200 p-3 min-w-[140px] ${isWeekend(date) ? 'bg-stone-100' : 'bg-white'}`}
                  >
                    <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">{getDayName(date)}</div>
                    <div className={`text-base font-semibold mt-1 ${isWeekend(date) ? 'text-stone-600' : 'text-stone-800'}`}>
                      {date.getDate()}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {personnel.map((person, index) => (
                <tr key={person.id}>
                  <td 
                    className="border-2 border-stone-200 p-3 sticky left-0 z-10 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100"
                    draggable
                    onDragStart={() => handlePersonDragForReorder(index)}
                    onDragEnd={() => setDraggedPersonIndex(null)}
                    onDragOver={(e) => {
                      if (draggedPersonIndex !== null) {
                        e.preventDefault();
                      }
                    }}
                    onDrop={(e) => {
                      if (draggedPersonIndex !== null) {
                        e.preventDefault();
                        handlePersonDropForReorder(index);
                      }
                    }}
                  >
                    {editingPerson === person.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={person.name}
                          onChange={(e) => updatePerson(person.id, { name: e.target.value })}
                          className="w-full px-2 py-1 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                          placeholder="Name"
                        />
                        <button
                          onClick={() => setEditingPerson(null)}
                          className="w-full px-2 py-1 bg-slate-600 text-white rounded-lg text-xs hover:bg-slate-700 transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div className={`flex justify-between items-center gap-2 cursor-move ${draggedPersonIndex === index ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-2 flex-1">
                          <GripVertical size={14} className="text-slate-400 flex-shrink-0" />
                          <div 
                            className="font-bold text-sm text-white px-3 py-2 rounded-xl shadow-md hover:shadow-lg transition-all flex-1 text-center bg-gradient-to-br from-slate-500 to-slate-600"
                          >
                            {person.name}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPerson(person.id);
                            }}
                            className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={12} className="text-slate-600" />
                          </button>
                          <button
                            onClick={(e) => removePerson(e, person.id)}
                            className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                  {dates.map(date => {
                    const cellAllocs = getCellAllocations(person.id, date);
                    const topJob = cellAllocs.top ? jobs.find(j => j.id === cellAllocs.top.jobId) : null;
                    const bottomJob = cellAllocs.bottom ? jobs.find(j => j.id === cellAllocs.bottom.jobId) : null;
                    const cellKey = `${person.id}-${date.toISOString().split('T')[0]}`;
                    const isHovered = hoveredCell === cellKey && draggedJobId;
                    
                    return (
                      <td
                        key={date.toISOString()}
                        className={`border-2 p-0 align-top transition-all relative ${
                          isWeekend(date) ? 'bg-stone-50 border-stone-200' : 'bg-white border-stone-200'
                        }`}
                        style={{ height: '160px' }}
                        onDragOver={(e) => handleCellDragOver(e, person.id, date)}
                        onDragLeave={handleCellDragLeave}
                        onDrop={(e) => handleCellDrop(e, person.id, date)}
                      >
                        <div 
                          className={`h-1/2 p-2 transition-all relative ${
                            isHovered && hoveredSlot === 'top' ? 'bg-amber-50' : ''
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setHoveredCell(cellKey);
                            setHoveredSlot('top');
                          }}
                        >
                          {isHovered && hoveredSlot === 'top' && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 border-2 border-amber-400 border-dashed rounded">
                              <div className="text-amber-600 font-semibold text-xs bg-white px-2 py-1 rounded-lg shadow-sm border border-amber-200">
                                Drop in TOP
                              </div>
                            </div>
                          )}
                          {cellAllocs.top && topJob && (
                            <div
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                setDraggedAllocation({
                                  key: `${cellKey}-top`,
                                  jobId: topJob.id,
                                  hours: cellAllocs.top.hours
                                });
                              }}
                              onDragEnd={() => {
                                setDraggedAllocation(null);
                                setIsDuplicating(false);
                              }}
                              onClick={(e) => updateAllocation(e, `${cellKey}-top`)}
                              className={`h-full p-2 rounded-lg text-white text-xs cursor-move hover:opacity-90 transition-all hover:shadow-md flex flex-col justify-between ${isDuplicating && draggedAllocation?.key === `${cellKey}-top` ? 'ring-2 ring-blue-400' : ''}`}
                              style={{ backgroundColor: topJob.color }}
                              title={isDuplicating ? "Hold Ctrl to duplicate while dragging" : "Drag to move | Hold Ctrl while dragging to duplicate"}
                            >
                              <div>
                                <div className="font-bold text-xs tracking-tight">{topJob.number}</div>
                                <div className="text-xs opacity-90 mt-0.5" style={{ 
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%'
                                }}>
                                  {topJob.name.length > 12 ? topJob.name.substring(0, 12) + '...' : topJob.name}
                                </div>
                              </div>
                              <div className="font-semibold">{cellAllocs.top.hours}h</div>
                            </div>
                          )}
                        </div>
                        
                        <div 
                          className={`h-1/2 p-2 transition-all relative ${
                            isHovered && hoveredSlot === 'bottom' ? 'bg-amber-50' : ''
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setHoveredCell(cellKey);
                            setHoveredSlot('bottom');
                          }}
                        >
                          {isHovered && hoveredSlot === 'bottom' && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 border-2 border-amber-400 border-dashed rounded">
                              <div className="text-amber-600 font-semibold text-xs bg-white px-2 py-1 rounded-lg shadow-sm border border-amber-200">
                                Drop in BOTTOM
                              </div>
                            </div>
                          )}
                          {cellAllocs.bottom && bottomJob && (
                            <div
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                setDraggedAllocation({
                                  key: `${cellKey}-bottom`,
                                  jobId: bottomJob.id,
                                  hours: cellAllocs.bottom.hours
                                });
                              }}
                              onDragEnd={() => {
                                setDraggedAllocation(null);
                                setIsDuplicating(false);
                              }}
                              onClick={(e) => updateAllocation(e, `${cellKey}-bottom`)}
                              className={`h-full p-2 rounded-lg text-white text-xs cursor-move hover:opacity-90 transition-all hover:shadow-md flex flex-col justify-between ${isDuplicating && draggedAllocation?.key === `${cellKey}-bottom` ? 'ring-2 ring-blue-400' : ''}`}
                              style={{ backgroundColor: bottomJob.color }}
                              title={isDuplicating ? "Hold Ctrl to duplicate while dragging" : "Drag to move | Hold Ctrl while dragging to duplicate"}
                            >
                              <div>
                                <div className="font-bold text-xs tracking-tight">{bottomJob.number}</div>
                                <div className="text-xs opacity-90 mt-0.5" style={{ 
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%'
                                }}>
                                  {bottomJob.name.length > 12 ? bottomJob.name.substring(0, 12) + '...' : bottomJob.name}
                                </div>
                              </div>
                              <div className="font-semibold">{cellAllocs.bottom.hours}h</div>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default WorkshopPlanner;
