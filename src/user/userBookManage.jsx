// src/pages/UserBookManage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './userBookManage.css';
import Sidebar from './sideBar.jsx';
import Message from './components/message.jsx';
import BookDetailsModal from './components/BookDetailsModal'; // Import the BookDetailsModal component

function UserBookManage() {
  const navigate = useNavigate();
  const authToken = localStorage.getItem('authToken');

  const API_BASE_URL = 'http://192.168.33.92:8000';

  const [error, setError] = useState('');
  const [books, setBooks] = useState([]);
  const [totalBookQuantity, setTotalBookQuantity] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isMessageVisible, setIsMessageVisible] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [borrowedBooksCount, setBorrowedBooksCount] = useState(0);
  const [selectedBookId, setSelectedBookId] = useState(null); // State to store the selected book's ID
  const [detailedBook, setDetailedBook] = useState(null); // State to store the detailed book information

  const borrowedBooksCountRef = useRef(0);
  const isFirstLoad = useRef(true);

  const fetchUserRequestCount = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/auth/user/request-count/`,
        { headers: { Authorization: `Token ${authToken}` } }
      );
      setRequestCount(res.data.requestCount);
    } catch (err) {
      console.error('Could not load user request count', err);
      if (err.response?.status === 401) {
        navigate('/login');
      }
    }
  }, [authToken, navigate]);

  const fetchBooksAndBorrowingRecords = useCallback(async () => {
    try {
      const booksResponse = await axios.get(`${API_BASE_URL}/api/library/books/`);
      setBooks(booksResponse.data.books);
      setTotalBookQuantity(booksResponse.data.books.reduce((sum, book) => sum + book.quantity, 0));

      const borrowingRecordsResponse = await axios.get(
        `${API_BASE_URL}/api/library/borrowing-records/`,
        { headers: { Authorization: `Token ${authToken}` } }
      );
      const currentUserActiveBorrows = borrowingRecordsResponse.data.borrowingRecords.filter(
        record => !record.is_returned
      );
      setBorrowedBooksCount(currentUserActiveBorrows.length);
      borrowedBooksCountRef.current = currentUserActiveBorrows.length;
    } catch (error) {
      console.error('Error fetching books or borrowing records:', error);
      setError('Failed to fetch data.');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  }, [authToken, navigate]);

  useEffect(() => {
    fetchBooksAndBorrowingRecords();
    fetchUserRequestCount();

    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/library/borrowing-records/`,
          { headers: { Authorization: `Token ${authToken}` } }
        );
        const curr = res.data.borrowingRecords.filter(r => !r.is_returned).length;
        if (borrowedBooksCountRef.current > curr) {
          await fetchUserRequestCount();
          await fetchBooksAndBorrowingRecords();
          setMessageText('A book has been returned. You may borrow again.');
          setIsMessageVisible(true);
        }
        borrowedBooksCountRef.current = curr;
      } catch (err) {
        console.error('Error in interval fetching borrowing records:', err);
        if (err.response?.status === 401) {
          clearInterval(interval);
          navigate('/login');
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [authToken, navigate, fetchUserRequestCount, fetchBooksAndBorrowingRecords]);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value.toLowerCase());
  };

  const handleCategoryChange = (event) => {
    setCategoryFilter(event.target.value.toLowerCase());
  };

  const handleCloseMessage = () => {
    setIsMessageVisible(false);
    setMessageText('');
  };

    const handleRowClick = (bookId) => {
        setSelectedBookId(bookId);
        const selectedBook = books.find(book => book.book_id === bookId);
        setDetailedBook(selectedBook);
    };

  const handleSendRequest = async (bookId, availableQuantity) => {
    console.log('Attempting to send request for book:', bookId);

    if (!authToken) {
      setMessageText('You must be logged in to send a request.');
      setIsMessageVisible(true);
      navigate('/login');
      return;
    }

    if (borrowedBooksCount >= 3) {
      setMessageText('You have reached your limit of 3 borrowed books.');
      setIsMessageVisible(true);
      return;
    }
    if (requestCount >= 3) {
      setMessageText('You can only have up to 3 active book requests.');
      setIsMessageVisible(true);
      return;
    }
    if (availableQuantity <= 0) {
      setMessageText('This book is currently unavailable.');
      setIsMessageVisible(true);
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/library/requests/`,
        { book: bookId },
        {
          headers: {
            'Authorization': `Token ${authToken}`,
          },
        }
      );
      console.log('Borrow request sent successfully:', response.data);

      setMessageText(`Your request for "${response.data.book_detail.title}" was sent.`);
      setIsMessageVisible(true);

      await fetchUserRequestCount();
      await fetchBooksAndBorrowingRecords();

    } catch (error) {
      console.error('Error sending borrow request:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Failed to send request.';
      setMessageText(errorMessage);
      setIsMessageVisible(true);
      if (error.response && error.response.status === 401) {
        navigate('/login');
      }
    }
  };

  const filteredBooks = books.filter(book => {
    const searchMatch =
      book.title.toLowerCase().includes(searchQuery) ||
      book.author.toLowerCase().includes(searchQuery) ||
      book.book_id.toLowerCase().includes(searchQuery) ||
      (book.publisher && book.publisher.toLowerCase().includes(searchQuery));

    const categoryMatch =
      !categoryFilter || (book.category && book.category.toLowerCase().includes(categoryFilter));

    return searchMatch && categoryMatch;
  });

  return (
    <div className='dashboard'>
      <Sidebar />
      {isMessageVisible && (
        <Message message={messageText} onClose={handleCloseMessage} />
      )}

      <section className='searchBooks'>
        <input
          className='searchBar'
          placeholder='Search Book (Title, Author, ID, Publisher)'
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <input
          className='categoryBar'
          placeholder='Filter by Category'
          value={categoryFilter}
          onChange={handleCategoryChange}
        />
        <section className='totalBooks'>
          <p className='label' style={{ alignSelf: 'flex-start' }}>Total Books</p>
          <p className='label' style={{ alignSelf: 'flex-start', fontSize: '80px', marginTop: '-20px' }}>{totalBookQuantity}</p>
        </section>
      </section>

      {/* Display Request Count prominently */}
      <section className='request-count-display' style={{ marginTop: '-250px', marginBottom: '-250px' }}>
        <p>Your remaining requests: <strong>{requestCount}</strong> / 3</p>
      </section>

      <section className='booksTable'>
        {error && <p className='error'>{error}</p>}
        {!error && filteredBooks.length > 0 ? (
          <table>
            <thead>
              <tr className='head'>
                <th>Cover</th>
                <th>Book ID</th>
                <th>Title</th>
                <th>Author</th>
                <th>Yr. Published</th>
                <th>Publisher</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map(book => (
                <tr key={book.book_id} onClick={() => handleRowClick(book.book_id)}>
                  <td>
                    {book.cover_image && (
                      <img
                        src={book.cover_image}
                        alt={`Cover of ${book.title}`}
                        style={{ width: '50px', height: '70px', objectFit: 'cover' }}
                      />
                    )}
                    {!book.cover_image && (
                      <span>No Cover</span>
                    )}
                  </td>
                  <td>{book.book_id}</td>
                  <td>{book.title}</td>
                  <td>{book.author}</td>
                  <td>{book.publication_year}</td>
                  <td>{book.publisher}</td>
                  <td>
                    <button
                      className='borrow-btn'
                      onClick={(e) => {e.stopPropagation(); handleSendRequest(book.book_id, book.available_quantity)}}
                      disabled={
                        book.available_quantity <= 0 ||
                        borrowedBooksCount >= 3 ||
                        requestCount >= 3
                      }
                      style={{
                        opacity: (book.available_quantity <= 0 || borrowedBooksCount >= 3 || requestCount >= 3) ? 0.6 : 1,
                        cursor: (book.available_quantity <= 0 || borrowedBooksCount >= 3 || requestCount >= 3) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {book.available_quantity <= 0 ? 'Unavailable' : 'Request'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !error && <p>No books found matching your search criteria.</p>
        )}
      </section>
        {detailedBook && (
            <BookDetailsModal book={detailedBook} onClose={() => setDetailedBook(null)} />
        )}
    </div>
  );
}

export default UserBookManage;