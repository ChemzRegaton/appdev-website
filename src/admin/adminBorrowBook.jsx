// src/components/AdminBorrowBook.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import logoImage from '../assets/LOGO_WORD.png';
import { useNavigate } from 'react-router-dom';
import './adminBorrowBook.css';
import Sidebar from './sideBar.jsx';
import Message from './components/message.jsx';
import AddBookPanel from './components/addBookPanel.jsx';
import EditBookPanel from './components/editBookPanel.jsx';
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

  // fetch the current per-user request count
  const refreshUserRequestCount = async () => {
    try {
      const res = await axios.get(
        'https://library-management-system-3qap.onrender.com/api/library/user/request-count/',
        { headers: { Authorization: `Token ${authToken}` } }
      );
      if (onBookReturned) onBookReturned(res.data.request_count);
    } catch (err) {
      console.error('Could not refresh user request count', err);
    }
  };

  const fetchAcceptedBorrowingRecords = async () => {
    try {
      const response = await axios.get(
        'https://library-management-system-3qap.onrender.com/api/library/borrowing-records/',
        { headers: { Authorization: `Token ${authToken}` } }
      );
      const activeBorrows = response.data.borrowingRecords.filter(r => !r.is_returned);
      setBorrowingRecords(activeBorrows);
      setBorrowedBooksCount(activeBorrows.length);
    } catch (error) {
      console.error('Error fetching borrowing records:', error);
      setError('Failed to fetch borrowing records.');
    }
  };

  useEffect(() => {
    fetchAcceptedBorrowingRecords();
  }, []);

  const handleReturnBook = async (recordId) => {
    try {
      const response = await axios.patch(
        `https://library-management-system-3qap.onrender.com/api/library/borrowing-records/${recordId}/return/`,
        {},
        { headers: { Authorization: `Token ${authToken}` } }
      );

      setBorrowingRecords(br => br.filter(r => r.id !== recordId));
      setBorrowedBooksCount(c => c - 1);
      setMessageText(response.data.message);
      setIsMessageVisible(true);

      // refresh the authoritative user request count
      await refreshUserRequestCount();

    } catch (error) {
      console.error('Error returning book:', error);
      setMessageText('Failed to return book.');
      setIsMessageVisible(true);
    }
  };

  const handleSearchChange = e => setSearchQuery(e.target.value.toLowerCase());
  const handleCloseMessage = () => setIsMessageVisible(false);

  const filteredBorrowingRecords = borrowingRecords.filter(record =>
    record.book_title.toLowerCase().includes(searchQuery) ||
    record.user.toLowerCase().includes(searchQuery)
  );

  const calculateDueDateInfo = (borrowDate, returnDate) => {
    const today = new Date();
    const due = new Date(returnDate);
    const diff = due.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    if (days >= 0) return { text: `${days} day${days !== 1 ? 's' : ''} left`, overdue: false };
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
        {!error && filteredBorrowingRecords.length > 0 && (
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
                const dueInfo = calculateDueDateInfo(record.borrow_date, record.return_date);
                return (
                  <tr key={record.id} className={dueInfo.overdue ? 'overdue-row' : ''}>
                    <td>{record.id}</td>
                    <td>{record.user}</td>
                    <td>{record.book_title}</td>
                    <td>{new Date(record.borrow_date).toLocaleDateString()}</td>
                    <td>{new Date(record.return_date).toLocaleDateString()}</td>
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
        )}
        {!error && filteredBorrowingRecords.length === 0 && <p>No active borrowing records found.</p>}
        {isMessageVisible && <Message message={messageText} onClose={handleCloseMessage} />}
      </section>
    </div>
  );
}

export default AdminBorrowBook;
