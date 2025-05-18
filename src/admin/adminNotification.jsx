import { useState, useEffect } from 'react';
import axios from 'axios';
import './adminNotification.css';
import Sidebar from './sideBar.jsx';

function AdminNotification() {
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState('');
    const [newMessagesCount, setNewMessagesCount] = useState(0);
    const [replyBoxes, setReplyBoxes] = useState({}); // Track which reply boxes are open
    const [replies, setReplies] = useState({}); // Store reply text
    const authToken = localStorage.getItem('authToken');
    const pollingInterval = 5000; // 5 seconds

    const fetchNewMessagesCount = async () => {
        try {
            const response = await axios.get('https://library-management-system-3qap.onrender.com/api/auth/admin/messages/unread/count/', {
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
            const response = await axios.get('https://library-management-system-3qap.onrender.com/api/auth/admin/messages/', {
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
                `https://library-management-system-3qap.onrender.com/api/library/admin/messages/${messageId}/reply/`,
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
                                <div className="message-header" style={{ backgroundColor: 'white', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <p><strong>Sender:</strong> {message.user.username}</p>
                                    <p><strong>Sent At:</strong> {new Date(message.sent_at).toLocaleString()}</p>
                                </div>
                                <div className="message-content">
                                    <p><strong>Subject:</strong> {message.subject}</p>
                                    <p style={{ fontWeight: 'lighter' }}>{message.message}</p>

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
