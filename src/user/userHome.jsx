// src/components/UserHome.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './userHome.css';
import Sidebar from './sideBar.jsx';
import AddBookPanel from './components/additionalInfo.jsx';
import Message from './components/message.jsx';
import defaultBookCover from './assets/Default_book_cover.webp';

function UserHome() {
  const [userProfile, setUserProfile] = useState(null);
  const [allBooks, setAllBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [requestCount, setRequestCount] = useState(0);
  const [messageText, setMessageText] = useState('');
  const [isMessageVisible, setIsMessageVisible] = useState(false);
  const navigate = useNavigate();
  const authToken = localStorage.getItem('authToken');

  // Fetch profile & book list
  const fetchUserProfileAndBooks = useCallback(async () => {
    try {
      const [profileRes, booksRes] = await Promise.all([
        axios.get('https://library-management-system-3qap.onrender.com/api/auth/profile/', {
          headers: { Authorization: `Token ${authToken}` },
        }),
        axios.get('https://library-management-system-3qap.onrender.com/api/library/books/', {
          headers: { Authorization: `Token ${authToken}` },
        }),
      ]);
      setUserProfile(profileRes.data);
      setAllBooks(booksRes.data.books);
      setFilteredBooks(booksRes.data.books);
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
      console.error(err);
    }
  }, [authToken, navigate]);

  // Fetch the per‑user request count
  const fetchRequestCount = async () => {
    try {
      const res = await axios.get(
        'https://library-management-system-3qap.onrender.com/api/library/user/request-count/',
        { headers: { Authorization: `Token ${authToken}` } }
      );
      setRequestCount(res.data.request_count);
    } catch (err) {
      console.error('Could not load request count', err);
    }
  };

  useEffect(() => {
    fetchUserProfileAndBooks();
    fetchRequestCount();
  }, [fetchUserProfileAndBooks]);

  // Called after a successful borrow request
  const handleSendRequest = async (bookId, availableQuantity) => {
    if (requestCount >= 3) {
      setMessageText('You can only send up to 3 book requests.');
      setIsMessageVisible(true);
      return;
    }
    if (availableQuantity <= 0) {
      setMessageText('This book is currently unavailable.');
      setIsMessageVisible(true);
      return;
    }
    try {
      const res = await axios.post(
        'https://library-management-system-3qap.onrender.com/api/library/requests/',
        { book: bookId },
        { headers: { Authorization: `Token ${authToken}` } }
      );
      setMessageText(`Your request for "${res.data.book_detail.title}" was sent.`);
      setIsMessageVisible(true);
      // re‑fetch the up‑to‑date count
      fetchRequestCount();
    } catch (err) {
      console.error(err);
      setMessageText('Failed to send request.');
      setIsMessageVisible(true);
    }
  };

  // When an admin marks a book returned, we’ll call this to refresh count
  const handleBookReturnedFromAdmin = () => {
    fetchRequestCount();
  };

  return (
    <div className="dashboard">
      <Sidebar onBookReturned={handleBookReturnedFromAdmin} />
      {isMessageVisible && <Message message={messageText} onClose={() => setIsMessageVisible(false)} />}
      <header>
        <p>Your active requests: {requestCount}</p>
      </header>
      <div className="book-grid">
        {filteredBooks.map(b => (
          <div key={b.id} className="book-card">
            <img src={b.cover_image || defaultBookCover} alt={b.title} className="cover" />
            <h3>{b.title}</h3>
            <button
              onClick={() => handleSendRequest(b.book_id, b.available_quantity)}
              disabled={b.available_quantity === 0}
            >
              {b.available_quantity ? 'Send Request' : 'Unavailable'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserHome;
