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
  const [jobFilter, setJobFilter] = useState('open');
  const [showDaySummary, setShowDaySummary] = useState(false);
  const [daySummaryDate, setDaySummaryDate] = useState(new Date());

  // Load data from localStorage on startup
  useEffect(() => {
    const loadData = () => {
      try {
        const savedData = localStorage.getItem('workshopPlannerData');
        if (savedData) {
          const data = JSON.parse(savedData);
          if (data.jobs) setJobs(data.jobs);
          if (data.personnel) setPersonnel(data.personnel);
          if (data.allocations) setAllocations(data.allocations);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, []);

  // Auto-save data to localStorage
  useEffect(() => {
    const saveData = () => {
      try {
        const data = { jobs, personnel, allocations };
        localStorage.setItem('workshopPlannerData', JSON.stringify(data));
      } catch (error) {
        console.error('Save error:', error);
      }
    };
    
    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);
  }, [jobs, personnel, allocations]);

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
    
    const dayOfWeek = start.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
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
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>
      {/* JOBS SIDEBAR - FORCED TO SHOW WITH INLINE STYLES */}
      <div style={{ 
        width: '320px', 
        backgroundColor: 'white', 
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '12px', 
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(to right, #fafaf9, white)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Jobs
            </h2>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                onClick={saveData} 
                style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                title="Save"
              >
                <Save size={14} style={{ color: '#57534e' }} />
              </button>
              <button 
                onClick={loadData} 
                style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                title="Load"
              >
                <Upload size={14} style={{ color: '#57534e' }} />
              </button>
              <button 
                onClick={addJob} 
                style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                title="Add Job"
              >
                <Plus size={14} style={{ color: '#57534e' }} />
              </button>
            </div>
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                    handleJobDragStart(e, job.id);
                  }
                }}
                onDragEnd={handleJobDragEnd}
                style={{
                  border: '1px solid #e7e5e4',
                  borderLeft: `4px solid ${job.color}`,
                  borderRadius: '8px',
                  padding: '8px',
                  backgroundColor: 'white',
                  cursor: editingJob !== job.id ? 'move' : 'default'
                }}
              >
                {editingJob === job.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="text"
                      value={job.number}
                      onChange={(e) => updateJob(job.id, { number: e.target.value })}
                      style={{ width: '100%', padding: '4px 8px', border: '1px solid #d6d3d1', borderRadius: '4px', fontSize: '12px' }}
                      placeholder="000-0000"
                    />
                    <input
                      type="text"
                      value={job.name}
                      onChange={(e) => updateJob(job.id, { name: e.target.value })}
                      style={{ width: '100%', padding: '4px 8px', border: '1px solid #d6d3d1', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}
                      placeholder="Job Name"
                    />
                    <input
                      type="number"
                      value={job.totalHours}
                      onChange={(e) => updateJob(job.id, { totalHours: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '4px 8px', border: '1px solid #d6d3d1', borderRadius: '4px', fontSize: '12px' }}
                      placeholder="Total Hours"
                    />
                    <input
                      type="color"
                      value={job.color}
                      onChange={(e) => updateJob(job.id, { color: e.target.value })}
                      style={{ width: '100%', height: '32px', border: '1px solid #d6d3d1', borderRadius: '4px' }}
                    />
                    <textarea
                      value={job.notes}
                      onChange={(e) => updateJob(job.id, { notes: e.target.value })}
                      style={{ width: '100%', padding: '4px 8px', border: '1px solid #d6d3d1', borderRadius: '4px', fontSize: '12px' }}
                      placeholder="Notes"
                      rows="2"
                    />
                    <button
                      onClick={() => setEditingJob(null)}
                      style={{ width: '100%', padding: '4px 8px', backgroundColor: '#57534e', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#1c1917' }}>{job.number}</div>
                        <div style={{ fontSize: '12px', color: '#57534e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.name}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleJobComplete(job.id);
                          }}
                          style={{ padding: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                          title="Mark Complete"
                        >
                          <div style={{ width: '12px', height: '12px', border: '2px solid #059669', borderRadius: '2px' }} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingJob(job.id);
                          }}
                          style={{ padding: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                          title="Edit"
                        >
                          <Edit2 size={12} style={{ color: '#57534e' }} />
                        </button>
                        <button
                          onClick={(e) => deleteJob(e, job.id)}
                          style={{ padding: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                      <div style={{ flex: 1, backgroundColor: '#fafaf9', borderRadius: '4px', padding: '2px 6px' }}>
                        <span style={{ color: '#78716c' }}>Total:</span>
                        <span style={{ fontWeight: '500', color: '#44403c', marginLeft: '4px' }}>{job.totalHours}h</span>
                      </div>
                      <div style={{ flex: 1, backgroundColor: '#fafaf9', borderRadius: '4px', padding: '2px 6px' }}>
                        <span style={{ color: '#78716c' }}>Used:</span>
                        <span style={{ fontWeight: '500', color: '#44403c', marginLeft: '4px' }}>{allocated}h</span>
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      padding: '2px 6px', 
                      borderRadius: '4px',
                      backgroundColor: isOverAllocated ? '#fef2f2' : '#f0fdf4',
                      color: isOverAllocated ? '#b91c1c' : '#166534'
                    }}>
                      <span style={{ fontWeight: '600' }}>{remaining}h</span> remaining {isOverAllocated && '⚠️'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* REST OF THE APP */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e7e5e4', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1c1917' }}>Workshop Planner</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f5f5f4', borderRadius: '8px', padding: '4px' }}>
              <button
                onClick={() => setWeeksToShow(1)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  backgroundColor: weeksToShow === 1 ? 'white' : 'transparent',
                  color: weeksToShow === 1 ? '#1c1917' : '#57534e',
                  boxShadow: weeksToShow === 1 ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                1 Week
              </button>
              <button
                onClick={() => setWeeksToShow(2)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  backgroundColor: weeksToShow === 2 ? 'white' : 'transparent',
                  color: weeksToShow === 2 ? '#1c1917' : '#57534e',
                  boxShadow: weeksToShow === 2 ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                2 Weeks
              </button>
              <button
                onClick={() => setWeeksToShow(4)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  backgroundColor: weeksToShow === 4 ? 'white' : 'transparent',
                  color: weeksToShow === 4 ? '#1c1917' : '#57534e',
                  boxShadow: weeksToShow === 4 ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                4 Weeks
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button 
                onClick={() => moveWeek(-1)} 
                style={{ padding: '8px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '8px' }}
              >
                <ChevronLeft size={20} style={{ color: '#57534e' }} />
              </button>
              <span style={{ fontWeight: '500', color: '#44403c', minWidth: '200px', textAlign: 'center' }}>
                {formatDate(dates[0])} - {formatDate(dates[dates.length - 1])}
              </span>
              <button 
                onClick={() => moveWeek(1)} 
                style={{ padding: '8px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '8px' }}
              >
                <ChevronRight size={20} style={{ color: '#57534e' }} />
              </button>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#fafaf9' }}>
          <p style={{ padding: '40px', textAlign: 'center', color: '#57534e', fontSize: '16px' }}>
            ✅ JOBS SIDEBAR IS NOW VISIBLE!<br/><br/>
            This is a test version with inline styles to verify the sidebar appears.<br/>
            If you see the sidebar on the left, the issue is with Tailwind CSS configuration.
          </p>
        </div>
      </div>

      {/* Modals */}
      {showHoursModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%', margin: '0 16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1c1917', marginBottom: '16px' }}>
              {pendingAllocation?.isUpdate ? 'Update Hours' : 'Enter Hours'}
            </h3>
            <input
              type="number"
              value={hoursInput}
              onChange={(e) => setHoursInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (pendingAllocation?.isUpdate ? confirmUpdateHours() : confirmHours())}
              style={{ width: '100%', padding: '12px 16px', border: '2px solid #d6d3d1', borderRadius: '8px', fontSize: '16px' }}
              placeholder="Hours"
              autoFocus
            />
            {pendingAllocation?.isUpdate && (
              <p style={{ fontSize: '12px', color: '#78716c', marginTop: '8px' }}>Enter 0 to delete this allocation</p>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => {
                  setShowHoursModal(false);
                  setPendingAllocation(null);
                }}
                style={{ flex: 1, padding: '8px 16px', backgroundColor: '#e7e5e4', color: '#44403c', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={pendingAllocation?.isUpdate ? confirmUpdateHours : confirmHours}
                style={{ flex: 1, padding: '8px 16px', backgroundColor: '#57534e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && confirmAction && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%', margin: '0 16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1c1917', marginBottom: '16px' }}>Confirm Action</h3>
            <p style={{ color: '#57534e', marginBottom: '24px' }}>{confirmAction.message}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{ flex: 1, padding: '8px 16px', backgroundColor: '#e7e5e4', color: '#44403c', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmAction.onConfirm}
                style={{ flex: 1, padding: '8px 16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopPlanner;
