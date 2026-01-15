import { useState, useEffect } from 'react';
import './App.css';

function App() {
  // --- STANY APLIKACJI ---
  const [view, setView] = useState('ranking'); // Przełącznik widoku: 'ranking' lub 'detail'
  const [tasks, setTasks] = useState([]); // Lista dostępnych zadań
  const [allResults, setAllResults] = useState({}); // Wyniki wszystkich studentów (obiekt)
  const [loading, setLoading] = useState(false); // Stan ładowania danych
  const [error, setError] = useState(null); // Przechowywanie komunikatów o błędach
  
  const [selectedStudentId, setSelectedStudentId] = useState(''); // ID obecnie przeglądanego studenta
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' }); // Konfiguracja sortowania tabeli
  const [highlightedRow, setHighlightedRow] = useState(null); // ID ostatnio klikniętego wiersza w rankingu

  // --- POBIERANIE DANYCH Z SERWERA ---
  useEffect(function() {
    async function fetchData() {
      setLoading(true);
      try {
        // Pobieranie definicji zadań
        const tasksResponse = await fetch('/tin/tasks');
        const tasksData = await tasksResponse.json();
        
        // Pobieranie wyników studentów
        const resultsResponse = await fetch('/tin/results');
        const resultsData = await resultsResponse.json();

        // Przekształcenie obiektu zadań na tablicę dla łatwiejszego renderowania
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

  // --- OBSŁUGA SORTOWANIA ---
  function handleSort(key) {
    let direction = 'desc';
    // Jeśli kliknięto tę samą kolumnę, która jest już sortowana, odwróć kierunek
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key: key, direction: direction });
  }

  // --- LOGIKA RANKINGU (SORTOWANIE I PRZYGOTOWANIE DANYCH) ---
  function getSortedRanking() {
    const data = [];
    // Konwersja obiektu wyników na tablicę obiektów
    for (const id in allResults) {
      data.push({
        id: id,
        totalScore: allResults[id].score,
        tasks: allResults[id].tasks || {}
      });
    }

    // Sortowanie danych na podstawie konfiguracji sortConfig
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
        // Sortowanie po konkretnym zadaniu
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

  // --- LOGIKA SZCZEGÓŁÓW STUDENTA ---
  function getStudentDetailData() {
    if (!selectedStudentId || !allResults[selectedStudentId]) {
      return [];
    }
    
    const studentData = allResults[selectedStudentId];
    
    // Mapowanie wszystkich zadań i sprawdzanie, czy dany student je oddał i czy w terminie
    return tasks.map(function(task) {
      const studentResult = studentData.tasks ? studentData.tasks[task.id] : null;
      let status = "brak"; 
      let isLate = false;
      
      if (studentResult) {
          status = "oddano";
          const completionDate = new Date(studentResult.time);
          const deadlineDate = new Date(task.Deadline);
          if (completionDate > deadlineDate) {
            isLate = true; // Flaga spóźnienia
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

  // --- RENDEROWANIE INTERFEJSU ---
  return (
    <div className="container">
      <header>
        <h1>Sprawdzarka Wyników TIN</h1>
        {/* Przełącznik widoków */}
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

      {/* Komunikaty stanu */}
      {loading && <div className="loading">Ładowanie danych...</div>}
      {error && <div className="error-msg">{error}</div>}

      {/* WIDOK: RANKING */}
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
                        {/* Dynamiczne kolumny dla każdego zadania */}
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

                                    // Klasy kolorystyczne dla wyników
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

      {/* WIDOK: SZCZEGÓŁY STUDENTA */}
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
                    {/* Karta podsumowania */}
                    <div className="summary-card">
                        <h2>Suma punktów: <span className="highlight">{allResults[selectedStudentId].score}</span></h2>
                        <p>Student ID: {selectedStudentId}</p>
                    </div>

                    {/* Szczegółowa tabela zadań studenta */}
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
                                            {/* Odznaki statusu */}
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