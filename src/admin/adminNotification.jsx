import { useState, useEffect } from 'react';
import axios from 'axios';
import './adminNotification.css';
import Sidebar from './sideBar.jsx';

function AdminNotification() {
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState('');
    const [newMessagesCount, setNewMessagesCount] = useState(0);
    const [replyBoxes, setReplyBoxes] = useState({}); // Track which reply boxes are open
    const [replies, setReplies] = useState({}); // Store reply text // Store reply text
    const authToken = localStorage.getItem('authToken');
    const pollingInterval = 5000; // 5 seconds

    // Define the base URL for your API
    //const API_BASE_URL = 'http://192.168.33.92:8000';
    const API_BASE_URL = 'https://library-management-system-3qap.onrender.com';

    const fetchNewMessagesCount = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/auth/admin/messages/unread/count/`, {
                headers: { 'Authorization': `Token ${authToken}` },
            });
            setNewMessagesCount(response.data.count);
        } catch (error) {
            console.error('Error fetching new messages count:', error);
            setError('Failed to check for new messages.');
        }
    };

    const fetchMessages = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/auth/admin/messages/`, {
                headers: { 'Authorization': `Token ${authToken}` },
            });
            setMessages(response.data);
        } catch (error) {
            console.error('Error fetching messages:', error);
            setError('Failed to fetch messages.');
        }
    };

    const handleReplyToggle = (messageId) => {
        setReplyBoxes(prev => ({ ...prev, [messageId]: !prev[messageId] }));
    };

    const handleReplyChange = (messageId, value) => {
        setReplies(prev => ({ ...prev, [messageId]: value }));
    };

    const handleSendReply = async (messageId) => {
        const replyText = replies[messageId];
        if (!replyText || !replyText.trim()) {
            alert('Reply cannot be empty.');
            return;
        }

        try {
            await axios.post(
                `${API_BASE_URL}/api/auth/admin/messages/${messageId}/reply/`,
                { reply: replyText },
                { headers: { 'Authorization': `Token ${authToken}` } }
            );
            alert('Reply sent successfully!');
            setReplies(prev => ({ ...prev, [messageId]: '' }));
            setReplyBoxes(prev => ({ ...prev, [messageId]: false }));
        } catch (error) {
            console.error('Error sending reply:', error);
            alert('Failed to send reply.');
        }
    };

    useEffect(() => {
        fetchMessages();
        const intervalId = setInterval(fetchNewMessagesCount, pollingInterval);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (newMessagesCount > 0) {
            console.log(`You have ${newMessagesCount} new unread messages!`);
            fetchMessages();
        }
    }, [newMessagesCount]);

    return (
        <div className='dashboard'>
            <Sidebar />
            <section className='received-messages-container'>
                <h1>Inbox</h1>
                {error && <p className='error'>{error}</p>}
                {messages.length > 0 ? (
                    <div className="message-list">
                        {messages.map((message) => (
                            <div key={message.id} className={`message-item ${message.is_read ? 'read' : 'unread'}`}>
                                <div className="message-content">
                                    <div style={{gap: '10px'}}>
                                        <p><strong>Subject:</strong> {message.subject}</p>
                                        <p><strong>Sender:</strong> {message.user.username}</p>
                                        <p><strong>Sent At:</strong> {new Date(message.sent_at).toLocaleString()}</p>
                                    </div>
                                    
                                    <p style={{ fontWeight: 'lighter' }}>{message.content}</p>
                                    

                                    <button onClick={() => handleReplyToggle(message.id)} className="reply-toggle">
                                        {replyBoxes[message.id] ? 'Cancel' : 'Reply'}
                                    </button>

                                    {replyBoxes[message.id] && (
                                        <div className="reply-section">
                                            <textarea
                                                value={replies[message.id] || ''}
                                                onChange={(e) => handleReplyChange(message.id, e.target.value)}
                                                placeholder="Type your reply..."
                                            />
                                            <button onClick={() => handleSendReply(message.id)} className="send-reply">Send</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No messages to display.</p>
                )}
            </section>
        </div>
    );
}

export default AdminNotification;