// components/BookDetailsModal.jsx
import React from 'react';
import './BookDetailsModal.css';
import { FaBook, FaUser, FaCalendar, FaBuilding, FaList, FaCalendarCheck, FaMapMarkerAlt } from 'react-icons/fa';

function BookDetailsModal({ book, onClose }) {
    if (!book) {
        return null;
    }

    return (
        <div className="bookDetailsModalOverlay">
            <div className="bookDetailsModal">
                <h2>Book Details</h2>
                <div className="bookDetailsContent">
                    <div className="bookCover">
                        {book.cover_image ? (
                            <img src={book.cover_image} alt={`Cover of ${book.title}`} />
                        ) : (
                            <span>No Cover</span>
                        )}
                    </div>
                    <div className="bookInformation">
                        <p><FaBook /> <strong>Title:</strong> {book.title}</p>
                        <p><FaUser /> <strong>Author:</strong> {book.author}</p>
                        <p><FaCalendar /> <strong>Publication Year:</strong> {book.publication_year}</p>
                        <p><FaBuilding /> <strong>Publisher:</strong> {book.publisher}</p>
                        <p><FaList /> <strong>Category:</strong> {book.category}</p>
                        <p><FaCalendarCheck /> <strong>Date Added:</strong> {new Date(book.date_added).toLocaleDateString()}</p>
                        <p><FaMapMarkerAlt /> <strong>Location:</strong> {book.location}</p>
                        <p><strong>Quantity:</strong> {book.quantity}</p>
                        <p><strong>Available Quantity:</strong> {book.available_quantity}</p>
                        <p><strong>Book ID:</strong> {book.book_id}</p>
                    </div>
                </div>
                <button onClick={onClose}>Close</button>
            </div>
        </div>
    );
}

export default BookDetailsModal;