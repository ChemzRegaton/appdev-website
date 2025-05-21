// src/components/UserReturnedList.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './sideBar.jsx';
import './userNewFeature.css'; // <— new CSS file

function UserReturnedList() {
  const [error, setError] = useState('');
  const [returnedRecords, setReturnedRecords] = useState([]);
  const authToken = localStorage.getItem('authToken');
  const API_BASE_URL = 'http://192.168.33.92:8000'; // Define the base URL

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(
          `${API_BASE_URL}/api/library/my-borrowing-records/`, // Use API_BASE_URL here
          { headers: { Authorization: `Token ${authToken}` } }
        );
        // some endpoints wrap it in { borrowingRecords: [...] }
        const records = Array.isArray(data)
          ? data
          : data.borrowingRecords || [];
        setReturnedRecords(records.filter(r => r.is_returned));
      } catch (err) {
        console.error(err);
        setError('Could not load your returned books.');
      }
    })();
  }, [authToken]);

  return (
    <div className='dashboard'>
      <Sidebar />
      <section className='borrowedBooksTable'>
        <h1>Your Returned Books ({returnedRecords.length})</h1>

        {error && <p className='error'>{error}</p>}

        {!error && returnedRecords.length === 0 && (
          <p className='no-data'>You haven’t returned any books yet.</p>
        )}

        {!error && returnedRecords.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Borrowed On</th>
                <th>Returned On</th>
              </tr>
            </thead>
            <tbody>
              {returnedRecords.map(rec => (
                <tr key={rec.id}>
                  <td>{rec.id}</td>
                  <td>{rec.book_title}</td>
                  <td>{new Date(rec.borrow_date).toLocaleDateString()}</td>
                  <td>{new Date(rec.return_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default UserReturnedList;