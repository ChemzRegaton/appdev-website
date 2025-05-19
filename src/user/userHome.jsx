// src/pages/UserHome.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './userHome.css';
import Sidebar from './sideBar.jsx';
import AddBookPanel from './components/additionalInfo.jsx';
import Message from './components/message.jsx';
import defaultBookCover from '../assets/Default_book_cover.webp';

function UserHome() {
  const navigate = useNavigate();
  const authToken = localStorage.getItem('authToken');

  const [isAddBookPanelVisible, setAddBookPanelVisible] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [errorProfile, setErrorProfile] = useState('');
  const [totalBooks, setTotalBooks] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [allBooks, setAllBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isMessageVisible, setIsMessageVisible] = useState(false);
  const [borrowedBooksCount, setBorrowedBooksCount] = useState(0);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const isFirstLoad = useRef(true);
  const borrowedBooksCountRef = useRef(0);

  // get server‐side request count
  const fetchUserRequestCount = async () => {
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

  const fetchUserProfileAndBooks = useCallback(async () => {
    setLoadingProfile(true);
    setErrorProfile('');
    try {
      const profileRes = await axios.get(
        'https://library-management-system-3qap.onrender.com/api/auth/profile/',
        { headers: { Authorization: `Token ${authToken}` } }
      );
      setUserProfile(profileRes.data);
      setAddBookPanelVisible(!(
        profileRes.data.fullname &&
        profileRes.data.role &&
        profileRes.data.course &&
        profileRes.data.birthdate &&
        profileRes.data.address
      ));

      const booksRes = await axios.get(
        'https://library-management-system-3qap.onrender.com/api/library/books/',
        { headers: { Authorization: `Token ${authToken}` } }
      );
      setTotalBooks(booksRes.data.total_books);
      setAllBooks(booksRes.data.books);
      setFilteredBooks(booksRes.data.books);

      const borrowRes = await axios.get(
        'https://library-management-system-3qap.onrender.com/api/library/borrowing-records/',
        { headers: { Authorization: `Token ${authToken}` } }
      );
      const active = borrowRes.data.borrowingRecords.filter(r => !r.is_returned);
      setBorrowedBooksCount(active.length);
      borrowedBooksCountRef.current = active.length;
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorProfile('Failed to fetch data.');
      if (error.response?.status === 401) navigate('/login');
    } finally {
      setLoadingProfile(false);
    }
  }, [authToken, navigate]);

  useEffect(() => {
    fetchUserProfileAndBooks();
    fetchUserRequestCount();
  }, [fetchUserProfileAndBooks, refreshFlag]);

  const handleCloseAddBookPanel = () => setAddBookPanelVisible(false);
  const handleCloseMessage = () => setIsMessageVisible(false);

  const handleSearch = e => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    setFilteredBooks(allBooks.filter(b =>
      b.title.toLowerCase().includes(term) ||
      b.author.toLowerCase().includes(term) ||
      b.category.toLowerCase().includes(term)
    ));
  };

  const BookCoverImage = ({ imageUrl, altText }) => {
    const src = imageUrl?.startsWith('http') ? imageUrl : defaultBookCover;
    return <img src={src} alt={altText} style={{ width: '100%', height: '40vh', objectFit: 'cover' }} />;
  };

  const resetRequestCount = () => {
    setRequestCount(0);
    setMessageText('Request count has been reset.');
    setIsMessageVisible(true);
    setRefreshFlag(f => !f);
  };

  const handleSendRequest = async (bookId, availableQuantity) => {
    if (borrowedBooksCount >= 3) {
      setMessageText('You can only borrow up to 3 books.');
      return setIsMessageVisible(true);
    }
    if (requestCount >= 3) {
      setMessageText('You can only send up to 3 requests.');
      return setIsMessageVisible(true);
    }
    if (availableQuantity <= 0) {
      setMessageText('This book is unavailable.');
      return setIsMessageVisible(true);
    }

    try {
      const res = await axios.post(
        'https://library-management-system-3qap.onrender.com/api/library/requests/',
        { book: bookId },
        { headers: { Authorization: `Token ${authToken}` } }
      );
      setMessageText(`Your request for "${res.data.book_detail.title}" was sent.`);
      setIsMessageVisible(true);
      await fetchUserRequestCount();
      setRefreshFlag(f => !f);
    } catch (err) {
      console.error('Error sending request:', err);
      setMessageText('Failed to send request.');
      setIsMessageVisible(true);
    }
  };

  useEffect(() => {
    // skip first
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    const interval = setInterval(async () => {
      const res = await axios.get(
        'https://library-management-system-3qap.onrender.com/api/library/borrowing-records/',
        { headers: { Authorization: `Token ${authToken}` } }
      );
      const curr = res.data.borrowingRecords.filter(r => !r.is_returned).length;
      if (borrowedBooksCountRef.current > curr) {
        await fetchUserRequestCount();
        setMessageText('A book has been returned. You may borrow again.');
        setIsMessageVisible(true);
      }
      borrowedBooksCountRef.current = curr;
    }, 2000);
    return () => clearInterval(interval);
  }, [authToken, fetchUserRequestCount]);

  return (
    <div className='dashboard'>
      <Sidebar onResetRequestCount={resetRequestCount} />
      {isAddBookPanelVisible && <AddBookPanel onClose={handleCloseAddBookPanel} />}
      {isMessageVisible && <Message message={messageText} onClose={handleCloseMessage} />}

      <section
        className='searchBooks'
        style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10, padding: '10px 0', marginBottom: '10px' }}
      >
        <input className='btn' placeholder='Search Title, Author and Category' value={searchTerm} onChange={handleSearch} />
      </section>

      <section className='card-container'>
        {filteredBooks.map(book => (
          <section key={book.book_id} className='book-card'>
            <div className='book-cover'>
              <BookCoverImage imageUrl={book.cover_image} altText={book.title} />
            </div>
            <div className='book-details'>
              <h3 className='book-title'>{book.title}</h3>
              <p className='book-info'>Author: {book.author}</p>
              <p className='book-info' style={{ color: 'orange' }}>Category: {book.category}</p>
              <p className='book-info' style={{ color: 'lightgreen' }}>Available: {book.available_quantity}</p>
            </div>
            <button
              className='book-request-button'
              onClick={() => handleSendRequest(book.book_id, book.available_quantity)}
              disabled={book.available_quantity <= 0}
              style={{
                opacity: book.available_quantity <= 0 ? 0.6 : 1,
                cursor: book.available_quantity <= 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {book.available_quantity <= 0 ? 'Unavailable' : 'Send Request'}
            </button>
          </section>
        ))}
        {filteredBooks.length === 0 && searchTerm && <p>No books found matching your search.</p>}
      </section>
    </div>
  );
}

export default UserHome;
