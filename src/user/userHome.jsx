// src/pages/UserHome.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './userHome.css';
import Sidebar from './sideBar.jsx';
import AddBookPanel from './components/additionalInfo.jsx';
import Message from './components/message.jsx';

function UserHome() {
  const navigate = useNavigate();
  const authToken = localStorage.getItem('authToken');

  // Define the base URL for your API
  // **IMPORTANT: Ensure this IP address matches your Django server's actual IP.**
  // If your Django server is running on a different IP, this will cause issues.
  //const API_BASE_URL = 'http://192.168.33.92:8000'; // Make sure this matches your Django server's IP
  const API_BASE_URL = 'https://library-management-system-3qap.onrender.com';

  const [isAddBookPanelVisible, setAddBookPanelVisible] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [errorProfile, setErrorProfile] = useState('');
  const [totalBooks, setTotalBooks] = useState(0);
  const [requestCount, setRequestCount] = useState(0); // This is where the request count will be stored
  const [allBooks, setAllBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isMessageVisible, setIsMessageVisible] = useState(false);
  const [borrowedBooksCount, setBorrowedBooksCount] = useState(0);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const isFirstLoad = useRef(true);
  const borrowedBooksCountRef = useRef(0);

  // --- Fetch Request Count ---
  const fetchUserRequestCount = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/auth/user/request-count/`, // Correct URL: /api/auth/user/request-count/
        { headers: { Authorization: `Token ${authToken}` } }
      );
      // The backend now returns { requestCount: X } not { request_count: X } based on your @api_view
      // If your backend get_request_count returns { 'requestCount': request.user.request_count }
      // then you should use res.data.requestCount here.
      // If your backend get_request_count returns { 'request_count': request.user.request_count }
      // then you should use res.data.request_count here.
      // Assuming it's `requestCount` based on the previous output you've shared.
      setRequestCount(res.data.requestCount); // <-- **UPDATED: Accessing `requestCount`**
    } catch (err) {
      console.error('Could not load request count', err);
    }
  };

  const fetchUserProfileAndBooks = useCallback(async () => {
    setLoadingProfile(true);
    setErrorProfile('');
    try {
      const profileRes = await axios.get(
        `${API_BASE_URL}/api/auth/profile/`,
        { headers: { Authorization: `Token ${authToken}` } }
      );
      setUserProfile(profileRes.data);
      // Check if profile fields are missing to show AddBookPanel
      setAddBookPanelVisible(!(
        profileRes.data.fullname &&
        profileRes.data.role &&
        profileRes.data.course &&
        profileRes.data.birthdate &&
        profileRes.data.address
      ));

      const booksRes = await axios.get(
        `${API_BASE_URL}/api/library/books/`,
        { headers: { Authorization: `Token ${authToken}` } }
      );
      setTotalBooks(booksRes.data.total_books);
      setAllBooks(booksRes.data.books);
      setFilteredBooks(booksRes.data.books);

      const borrowRes = await axios.get(
        `${API_BASE_URL}/api/library/borrowing-records/`,
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
    fetchUserRequestCount(); // Fetch request count on component mount and refreshFlag change
  }, [fetchUserProfileAndBooks, refreshFlag]);

  const handleCloseAddBookPanel = () => setAddBookPanelVisible(false);
  const handleCloseMessage = () => setIsMessageVisible(false);

  const handleSearch = e => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    setFilteredBooks(allBooks.filter(b =>
      b.title.toLowerCase().includes(term) ||
      b.author.toLowerCase().includes(term) ||
      (b.category && b.category.toLowerCase().includes(term)) // Added null check for category
    ));
  };

  const BookCoverImage = ({ imageUrl, altText }) => {
    // **IMPORTANT: Replace with your actual default image path**
    // Make sure this path is accessible by your frontend application.
    const defaultBookCover = '/path/to/your/default/book/cover.jpg';
    const src = imageUrl?.startsWith('http') || imageUrl?.startsWith('/') ? imageUrl : defaultBookCover;
    return <img src={src} alt={altText} style={{ width: '100%', height: '40vh', objectFit: 'cover' }} />;
  };

  // This `resetRequestCount` function would typically be called by an admin
  // or via specific business logic (e.g., end of the semester).
  // If you intend for users to reset their own count, you'd need a backend endpoint for this.
  const resetRequestCount = () => {
    // This frontend function just resets the state, it doesn't talk to the backend.
    // If you need a backend reset, implement an API endpoint for it.
    // For now, it's illustrative.
    setRequestCount(0); // Visual reset
    setMessageText('Request count has been reset (frontend only, if no backend endpoint).');
    setIsMessageVisible(true);
    setRefreshFlag(f => !f); // Trigger a re-fetch to ensure sync with backend
  };

  const handleSendRequest = async (bookId, availableQuantity) => {
    // Frontend checks to provide immediate feedback
    if (borrowedBooksCount >= 3) {
      setMessageText('You can only borrow up to 3 books.');
      return setIsMessageVisible(true);
    }
    // Use the `requestCount` state variable directly for frontend validation
    if (requestCount >= 3) { // <-- **UPDATED: Using `requestCount` state**
      setMessageText('You can only send up to 3 requests.');
      return setIsMessageVisible(true);
    }
    if (availableQuantity <= 0) {
      setMessageText('This book is unavailable.');
      return setIsMessageVisible(true);
    }

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/library/requests/`,
        { book: bookId },
        { headers: { Authorization: `Token ${authToken}` } }
      );
      setMessageText(`Your request for "${res.data.book_detail.title}" was sent.`);
      setIsMessageVisible(true);

      // --- Crucial: Re-fetch request count after a successful request ---
      await fetchUserRequestCount(); // <-- **UPDATED: Re-fetch after request**
      // You might also want to re-fetch all books to update `available_quantity`
      // or at least update the specific book's quantity in your `allBooks` state.
      setRefreshFlag(f => !f); // This will trigger fetchUserProfileAndBooks and fetchUserRequestCount again
    } catch (err) {
      console.error('Error sending request:', err);
      // Improved error message from backend if available
      const errorMessage = err.response?.data?.message || err.response?.data?.detail || 'Failed to send request.';
      setMessageText(errorMessage);
      setIsMessageVisible(true);
    }
  };

  useEffect(() => {
    // This interval checks for returned books.
    // It should also re-fetch the request count as a book return could free up a slot.
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/library/borrowing-records/`,
          { headers: { Authorization: `Token ${authToken}` } }
        );
        const curr = res.data.borrowingRecords.filter(r => !r.is_returned).length;
        if (borrowedBooksCountRef.current > curr) {
          // A book was returned, so update counts and notify
          await fetchUserRequestCount(); // Re-fetch request count
          setMessageText('A book has been returned. You may borrow again.');
          setIsMessageVisible(true);
        }
        borrowedBooksCountRef.current = curr;
      } catch (err) {
        console.error('Error in interval fetching borrowing records:', err);
        // Handle error, e.g., if token expires
        if (err.response?.status === 401) {
            clearInterval(interval); // Stop the interval
            navigate('/login'); // Redirect to login
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [authToken, fetchUserRequestCount, navigate]); // Added navigate to dependencies

  if (loadingProfile) {
    return <div className='dashboard'>Loading profile and books...</div>;
  }

  if (errorProfile) {
    return <div className='dashboard error-message'>{errorProfile}</div>;
  }

  return (
    <div className='dashboard'>
      <Sidebar onResetRequestCount={resetRequestCount} />
      {isAddBookPanelVisible && userProfile && ( // Ensure userProfile is loaded before showing panel
        <AddBookPanel onClose={handleCloseAddBookPanel} userProfile={userProfile} />
      )}
      {isMessageVisible && <Message message={messageText} onClose={handleCloseMessage} />}

      <section
        className='searchBooks'
        style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10, padding: '10px 0', marginBottom: '10px' }}
      >
        <input className='btn' placeholder='Search Title, Author and Category' value={searchTerm} onChange={handleSearch} />
      </section>

      {/* Display Request Count prominently */}
      <section className='request-count-display'>
        <p>Your remaining requests: <strong>{requestCount}</strong> / 3</p>
      </section>

      <section className='card-container'>
        {filteredBooks.length > 0 ? (
          filteredBooks.map(book => (
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
                disabled={
                  book.available_quantity <= 0 || // Book is unavailable
                  borrowedBooksCount >= 3 ||     // User has too many borrowed books
                  requestCount >= 3              // User has too many pending requests
                }
                style={{
                  opacity: (book.available_quantity <= 0 || borrowedBooksCount >= 3 || requestCount >= 3) ? 0.6 : 1,
                  cursor: (book.available_quantity <= 0 || borrowedBooksCount >= 3 || requestCount >= 3) ? 'not-allowed' : 'pointer'
                }}
              >
                {book.available_quantity <= 0 ? 'Unavailable' : 'Send Request'}
              </button>
            </section>
          ))
        ) : (
          <p>No books found.</p>
        )}
        {filteredBooks.length === 0 && searchTerm && <p>No books found matching your search.</p>}
      </section>
    </div>
  );
}

export default UserHome;