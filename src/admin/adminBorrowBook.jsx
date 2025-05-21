// src/components/AdminBorrowBook.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './adminBorrowBook.css';
import Sidebar from './sideBar.jsx';
import Message from './components/message.jsx';
import { FaCheckCircle } from 'react-icons/fa';

function AdminBorrowBook({ onBookReturned }) {
  const [error, setError] = useState('');
  const [borrowingRecords, setBorrowingRecords] = useState([]);
  const [borrowedBooksCount, setBorrowedBooksCount] = useState(0);
  const navigate = useNavigate();
  const authToken = localStorage.getItem('authToken');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isMessageVisible, setIsMessageVisible] = useState(false);

  //const API_BASE_URL = 'http://192.168.33.92:8000'; // Ensure this matches your Django server's IP!
  const API_BASE_URL = 'https://library-management-system-3qap.onrender.com';

  const fetchAcceptedBorrowingRecords = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/library/borrowing-records/`,
        { headers: { Authorization: `Token ${authToken}` } }
      );
      const activeBorrows = response.data.borrowingRecords.filter(r => !r.is_returned);
      setBorrowingRecords(activeBorrows);
      setBorrowedBooksCount(activeBorrows.length);
    } catch (error) {
      console.error('Error fetching borrowing records:', error);
      setError('Failed to fetch borrowing records.');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    fetchAcceptedBorrowingRecords();
  }, []);

  const handleReturnBook = async (recordId) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/library/borrowing-records/${recordId}/return/`,
        {}, // Empty body for status update
        { headers: { Authorization: `Token ${authToken}` } }
      );

      setBorrowingRecords(prevRecords => prevRecords.filter(r => r.id !== recordId));
      setBorrowedBooksCount(prevCount => prevCount - 1);

      setMessageText(response.data.message);
      setIsMessageVisible(true);

      // Re-fetch all records to update display and ensure consistency after a return.
      fetchAcceptedBorrowingRecords();

      // Notify parent component if a callback is provided.
      if (onBookReturned) {
        onBookReturned();
      }

    } catch (error) {
      console.error('Error returning book:', error);
      const errorMessage = error.response?.data?.message || 'Failed to return book.';
      setMessageText(errorMessage);
      setIsMessageVisible(true);
    }
  };

  const handleSearchChange = e => setSearchQuery(e.target.value.toLowerCase());
  const handleCloseMessage = () => setIsMessageVisible(false);

  const filteredBorrowingRecords = borrowingRecords.filter(record =>
    record.book_title.toLowerCase().includes(searchQuery) ||
    // Adjust 'record.user' based on how your backend returns borrower's name (e.g., record.user.username)
    record.user.toLowerCase().includes(searchQuery)
  );

  const calculateDueDateInfo = (borrowDate, dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));

    if (days >= 0) {
      return { text: `${days} day${days !== 1 ? 's' : ''} left`, overdue: false };
    }
    return { text: `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`, overdue: true };
  };

  return (
    <div className='dashboard'>
      <Sidebar />
      <section className='searchBooks' style={{ display: 'flex', marginBottom: '40px' }}>
        <input
          className='searchBar'
          placeholder='Search by Book Title or Borrower'
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <section className='totalBorrowed' style={{ marginLeft: '10px', display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          <p className='label' style={{ color: 'black' }}>Borrowed Books</p>
          <p className='label' style={{ fontSize: '100px', marginTop: '-10px' }}>{borrowedBooksCount}</p>
        </section>
      </section>
      <section className='borrowedBooksTable'>
        {error && <p className="error-message">{error}</p>}
        {!error && filteredBorrowingRecords.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Borrow ID</th>
                <th>Borrower</th>
                <th>Title</th>
                <th>Borrow Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBorrowingRecords.map(record => {
                const dueInfo = calculateDueDateInfo(record.borrow_date, record.due_date);
                return (
                  <tr key={record.id} className={dueInfo.overdue ? 'overdue-row' : ''}>
                    <td>{record.id}</td>
                    {/* Display borrower's username or full name. Adjust 'record.user' as needed. */}
                    <td>{record.user_username || record.user}</td>
                    <td>{record.book_title}</td>
                    <td>{new Date(record.borrow_date).toLocaleDateString()}</td>
                    <td>{new Date(record.due_date).toLocaleDateString()}</td>
                    <td className={dueInfo.overdue ? 'overdue-text' : 'due-date-text'}>{dueInfo.text}</td>
                    <td>
                      {!record.is_returned && (
                        <button className='rtn-btn' onClick={() => handleReturnBook(record.id)}>
                          <FaCheckCircle className='return-icon' /> Mark as Returned
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          !error && <p>No active borrowing records found.</p>
        )}
        {isMessageVisible && <Message message={messageText} onClose={handleCloseMessage} />}
      </section>
    </div>
  );
}

export default AdminBorrowBook;