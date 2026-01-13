import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [view, setView] = useState('ranking');
  const [tasks, setTasks] = useState([]);
  const [allResults, setAllResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });
  const [highlightedRow, setHighlightedRow] = useState(null);

  useEffect(function() {
    async function fetchData() {
      setLoading(true);
      try {
        const tasksResponse = await fetch('/tin/tasks');
        const tasksData = await tasksResponse.json();
        
        const resultsResponse = await fetch('/tin/results');
        const resultsData = await resultsResponse.json();

        const tasksArray = [];
        for (const key in tasksData) {
          tasksArray.push({
            id: key,
            ...tasksData[key]
          });
        }
        
        setTasks(tasksArray);
        setAllResults(resultsData);
      } catch (err) {
        setError("Błąd pobierania danych");
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  function handleSort(key) {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key: key, direction: direction });
  }

  function getSortedRanking() {
    const data = [];
    for (const id in allResults) {
      data.push({
        id: id,
        totalScore: allResults[id].score,
        tasks: allResults[id].tasks || {}
      });
    }

    data.sort(function(a, b) {
      let valA;
      let valB;

      if (sortConfig.key === 'id') {
        valA = a.id;
        valB = b.id;
      } else if (sortConfig.key === 'score') {
        valA = a.totalScore;
        valB = b.totalScore;
      } else {
        const taskKey = sortConfig.key;
        valA = a.tasks[taskKey] ? a.tasks[taskKey].score : 0;
        valB = b.tasks[taskKey] ? b.tasks[taskKey].score : 0;
      }

      if (valA < valB) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return data;
  }

  function getStudentDetailData() {
    if (!selectedStudentId || !allResults[selectedStudentId]) {
      return [];
    }
    
    const studentData = allResults[selectedStudentId];
    
    return tasks.map(function(task) {
      const studentResult = studentData.tasks ? studentData.tasks[task.id] : null;
      let status = "brak"; 
      let isLate = false;
      
      if (studentResult) {
          status = "oddano";
          const completionDate = new Date(studentResult.time);
          const deadlineDate = new Date(task.Deadline);
          if (completionDate > deadlineDate) {
            isLate = true;
          }
      }

      return {
          ...task,
          studentPoints: studentResult ? studentResult.score : 0,
          completionDate: studentResult ? studentResult.time : '-',
          isLate: isLate,
          status: status
      };
    });
  }

  const sortedRanking = getSortedRanking();
  const studentDetailData = getStudentDetailData();

  return (
    <div className="container">
      <header>
        <h1>Sprawdzarka Wyników TIN</h1>
        <div className="nav-buttons">
            <button 
                className={view === 'ranking' ? 'active' : ''} 
                onClick={function() { setView('ranking'); }}>
                Ranking
            </button>
            <button 
                className={view === 'detail' ? 'active' : ''} 
                onClick={function() { setSelectedStudentId(''); setView('detail'); }}>
                Sprawdź Studenta
            </button>
        </div>
      </header>

      {loading && <div className="loading">Ładowanie danych...</div>}
      {error && <div className="error-msg">{error}</div>}

      {!loading && view === 'ranking' && (
        <div className="ranking-container">
            <div className="table-wrapper">
            <table className="results-table ranking-table">
                <thead>
                    <tr>
                        <th onClick={function() { handleSort('id'); }} className="sortable">
                            Indeks
                        </th>
                        <th onClick={function() { handleSort('score'); }} className="sortable">
                            Suma
                        </th>
                        {tasks.map(function(task) {
                            return (
                                <th key={task.id} onClick={function() { handleSort(task.id); }} className="sortable small-th">
                                    {task.id}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {sortedRanking.map(function(student) {
                        return (
                            <tr 
                                key={student.id} 
                                onClick={function() { 
                                  setSelectedStudentId(student.id);
                                  setView('detail');
                                  setHighlightedRow(student.id);
                                }}
                                className={highlightedRow === student.id ? 'highlighted-row' : ''}
                            >
                                <td>{student.id}</td>
                                <td><strong>{student.totalScore}</strong></td>
                                {tasks.map(function(task) {
                                    const taskData = student.tasks[task.id];
                                    let isLate = false;
                                    if (taskData) {
                                      const t1 = new Date(taskData.time);
                                      const t2 = new Date(task.Deadline);
                                      if (t1 > t2) isLate = true;
                                    }

                                    let cellClass = 'muted';
                                    if (taskData) {
                                      cellClass = isLate ? 'text-red' : 'text-green';
                                    }

                                    return (
                                        <td key={task.id} className={cellClass}>
                                            {taskData ? taskData.score : '-'}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            </div>
        </div>
      )}

      {!loading && view === 'detail' && (
        <div className="detail-view">
             <div className="search-box">
                <input 
                  type="text" 
                  placeholder="np. 498817" 
                  value={selectedStudentId}
                  onChange={function(e) { setSelectedStudentId(e.target.value); }}
                />
            </div>

            {selectedStudentId && allResults[selectedStudentId] ? (
                 <div className="results-container">
                    <div className="summary-card">
                        <h2>Suma punktów: <span className="highlight">{allResults[selectedStudentId].score}</span></h2>
                        <p>Student ID: {selectedStudentId}</p>
                    </div>

                    <table className="results-table">
                        <thead>
                            <tr>
                                <th>Zadanie</th>
                                <th>Termin</th>
                                <th>Data oddania</th>
                                <th>Punkty</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentDetailData.map(function(item) {
                                return (
                                    <tr key={item.id} className={item.status === 'brak' ? 'row-empty' : ''}>
                                        <td>{item.id}</td>
                                        <td>{item.Deadline ? new Date(item.Deadline).toLocaleDateString() : '-'}</td>
                                        <td>
                                            {item.completionDate !== '-' 
                                                ? new Date(item.completionDate).toLocaleString() 
                                                : '-'}
                                        </td>
                                        <td>
                                            <b>{item.studentPoints}</b> / {item.Score}
                                        </td>
                                        <td>
                                            {item.status === 'brak' && <span className="badge gray">Brak</span>}
                                            {item.status === 'oddano' && !item.isLate && <span className="badge green">W terminie</span>}
                                            {item.status === 'oddano' && item.isLate && <span className="badge red">Opóźnienie</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                selectedStudentId && <p className="error-msg">Nie znaleziono studenta</p>
            )}
        </div>
      )}
    </div>
  );
}

export default App;