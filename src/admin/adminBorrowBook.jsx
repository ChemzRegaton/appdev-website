// src/components/AdminBorrowBook.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './adminBorrowBook.css';
import Sidebar from './sideBar.jsx';
import Message from './components/message.jsx';
import { FaCheckCircle } from 'react-icons/fa';

function AdminBorrowBook({ onBookReturned }) {
  const [records, setRecords] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isMessageVisible, setIsMessageVisible] = useState(false);
  const authToken = localStorage.getItem('authToken');

  useEffect(() => {
    (async () => {
      const res = await axios.get(
        'https://library-management-system-3qap.onrender.com/api/library/borrowing-records/',
        { headers: { Authorization: `Token ${authToken}` } }
      );
      setRecords(res.data.borrowingRecords.filter(r => !r.is_returned));
    })();
  }, [authToken]);

  const handleReturn = async id => {
    try {
      const res = await axios.patch(
        `https://library-management-system-3qap.onrender.com/api/library/borrowing-records/${id}/return/`,
        {},
        { headers: { Authorization: `Token ${authToken}` } }
      );
      setMessageText(res.data.message);
      setIsMessageVisible(true);
      setRecords(rs => rs.filter(r => r.id !== id));
      // tell the UserHome to re-fetch their count
      if (onBookReturned) onBookReturned();
    } catch (err) {
      console.error(err);
      setMessageText('Failed to return book.');
      setIsMessageVisible(true);
    }
  };

  return (
    <div className="dashboard">
      <Sidebar />
      {isMessageVisible && <Message message={messageText} onClose={() => setIsMessageVisible(false)} />}
      <table className="borrowed-table">
        <thead>
          <tr>
            <th>ID</th><th>User</th><th>Title</th><th>Borrowed</th><th>Due</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {records.map(r => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.user}</td>
              <td>{r.book_title}</td>
              <td>{new Date(r.borrow_date).toLocaleDateString()}</td>
              <td>{new Date(r.return_date).toLocaleDateString()}</td>
              <td>
                <button onClick={() => handleReturn(r.id)}>
                  <FaCheckCircle /> Return
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminBorrowBook;
