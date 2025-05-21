// src/pages/UserNotification.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './userNotification.css';
import Sidebar from './sideBar.jsx';

function UserNotification() {
    const [notifications, setNotifications] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');
    //const API_BASE_URL = 'http://192.168.33.92:8000'; // Make sure this is correct for your setup
    const API_BASE_URL = 'https://library-management-system-3qap.onrender.com';

    const fetchNotifications = async () => {
        if (!authToken) {
            console.error('Authentication token not found.');
            setError('You must be logged in to view notifications.');
            return;
        }

        try {
            // 1. Fetch Contact Messages (user messages + admin replies)
            const contactMessagesResponse = await axios.get(`${API_BASE_URL}/api/auth/messages/user/`, {
                headers: { 'Authorization': `Token ${authToken}` },
            });
            // Map to add a 'type' identifier for consistent rendering
            const contactMessages = contactMessagesResponse.data.map(msg => ({
                ...msg,
                type: 'contact_message'
            }));


            // 2. Fetch Other Notifications (e.g., from library app)
            // Assuming your /api/library/notifications/ endpoint exists and
            // returns data about book actions (accepted, rejected, returned).
            // This might also be ContactMessages if you chose Option B above.
            const libraryNotificationsResponse = await axios.get(`${API_BASE_URL}/api/library/notifications/`, {
                headers: { 'Authorization': `Token ${authToken}` },
            });
            const libraryNotifications = libraryNotificationsResponse.data.map(notif => ({
                ...notif,
                type: 'book_notification' // Assign a type to distinguish
            }));

            // Combine and sort all notifications by date (newest first)
            // You might need to adjust the date field based on your Notification model
            const combinedNotifications = [...contactMessages, ...libraryNotifications]
                .sort((a, b) => {
                    const dateA = new Date(a.sent_at || a.created_at); // Use sent_at for ContactMessage, created_at for Notification
                    const dateB = new Date(b.sent_at || b.created_at);
                    return dateB - dateA; // Newest first
                });

            setNotifications(combinedNotifications);
            setError('');

        } catch (error) {
            console.error('Error fetching notifications:', error);
            setError('Failed to fetch notifications.');
            if (error.response && error.response.status === 401) {
                setError('You are not authorized to view notifications.');
            }
        }
    };

    const deleteNotification = async (notificationId, type) => {
        if (!authToken) {
            console.error('Authentication token not found.');
            setError('You must be logged in to delete notifications.');
            return;
        }

        let deleteUrl = '';
        if (type === 'contact_message') {
            deleteUrl = `${API_BASE_URL}/api/auth/messages/${notificationId}/`;
        } else if (type === 'book_notification') {
            // Assuming there's an endpoint to delete library-specific notifications
            // You'll need to define this in your library_app/urls.py and views.py if it doesn't exist.
            deleteUrl = `${API_BASE_URL}/api/library/notifications/${notificationId}/`;
        } else {
            console.error('Unknown notification type for deletion:', type);
            return;
        }

        try {
            await axios.delete(deleteUrl, {
                headers: { 'Authorization': `Token ${authToken}` },
            });
            fetchNotifications(); // Refresh the list after deletion
        } catch (error) {
            console.error(`Error deleting notification ${notificationId} (${type}):`, error);
            setError(`Failed to delete notification.`);
            if (error.response && error.response.status === 401) {
                setError('You are not authorized to delete notifications.');
            } else if (error.response && error.response.status === 404) {
                setError('Notification not found.');
            }
        }
    };

    useEffect(() => {
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 5000); // Poll every 5 seconds
        return () => clearInterval(intervalId); // Cleanup on component unmount
    }, [authToken]);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' };
        return date.toLocaleDateString(undefined, options);
    };

    return (
        <div className='dashboard'>
            <Sidebar />
            <h1>Notifications</h1>
            <div className='notification-container'>
                {error && <p className='error'>{error}</p>}
                {notifications.length === 0 && !error && <p>No new notifications.</p>}
                {notifications.map(notification => (
                    <div key={notification.id} className='notification-item' style={{display: 'flex', justifyContent: 'left'}}>
                        {/* Render based on notification type */}
                        {notification.type === 'contact_message' && (
                            <>
            
                                <div style={{display: 'flex', flexDirection: 'column', backgroundColor: 'white'}}>
                                    {notification.subject && <p style={{ fontWeight: 'bold' }}>Subject: {notification.subject}</p>}
                                    {notification.content && <p>Your message: {notification.content}</p>}
                                </div>
                                {notification.response && (
                                    <div className="admin-reply-section" style={{backgroundColor: 'white', display: 'flex', flexDirection: 'column', textAlign: 'left'}}>
                                        <p style={{ fontWeight: 'bold', color: '#007bff' }}>Admin Reply:</p>
                                        <p>{notification.response}</p>
                                        {notification.responded_at && (
                                            <p style={{ fontSize: '0.5em', color: '#666' }}>Responded At: {formatDate(notification.responded_at)}</p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {notification.type === 'book_notification' && (
                            <>
                                {/* Using 'message' field from the library notification as the main text */}
                                {notification.message && <p>{notification.message}</p>}
                                {notification.book_title && <p>Book: {notification.book_title}</p>}
                                {notification.notification_type === 'borrow_accepted' && <p className='success'>Status: Accepted</p>}
                                {notification.notification_type === 'borrow_rejected' && <p className='error'>Status: Rejected</p>}
                                {notification.notification_type === 'book_returned' && <p className='success'>Status: Returned</p>}
                                {notification.created_at && (
                                    <p style={{ fontSize: '0.8em', color: '#666' }}>Date: {formatDate(notification.created_at)}</p>
                                )}
                            </>
                        )}

                        {/* Always show delete button, passing type for correct endpoint */}
                        <button className='delete-button' style={{marginLeft: 'auto'}} onClick={() => deleteNotification(notification.id, notification.type)}>
                            Delete
                        </button>
                        <hr />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default UserNotification;