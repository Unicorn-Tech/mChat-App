import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import moment from "moment";
import { FaBell, FaBellSlash, FaPaperPlane, FaSearch, FaSignOutAlt, FaTimes, FaUser } from "react-icons/fa";
import { useAppDispatch } from "../hooks/useAppDispatch";
import { useAppSelector } from "../hooks/useAppSelector";
import { logout } from "../features/auth/slice/authSlice";
import {
  loadChatsRequest,
  upsertChat,
  setActiveChat,
  sendMessageRequest,
  newMessage,
  messagesRead,
  setOnlineUsers,
  clearChat,
} from "../features/chat/slice/chatSlice";
import { listUsersAPI, createDirectChatAPI } from "../features/chat/api/chatAPI";
import socket from "../services/socket";
import "../css/Chat.css";

const formatDateLabel = (dateValue) => {
  const date = moment(dateValue);
  if (date.isSame(moment(), "day")) return "Today";
  if (date.isSame(moment().subtract(1, "day"), "day")) return "Yesterday";
  return date.format("MMMM D, YYYY");
};

const groupMessagesByDate = (messages) => {
  const groups = [];
  let currentDay = null;

  messages.forEach((message) => {
    const messageDay = moment(message.createdAt).format("YYYY-MM-DD");
    if (messageDay !== currentDay) {
      currentDay = messageDay;
      groups.push({ date: message.createdAt, messages: [message] });
    } else {
      groups[groups.length - 1].messages.push(message);
    }
  });

  return groups;
};

const getUserId = (value) => {
  if (typeof value === "string" || typeof value === "number") return value;
  return value?._id ?? value?.id ?? value?.sub;
};
const toIdString = (value) => getUserId(value)?.toString();
const isSameId = (a, b) => {
  const aId = toIdString(a);
  const bId = toIdString(b);
  return Boolean(aId && bId && aId === bId);
};
const getDirectPartner = (chat, currentUserId) => {
  if (!chat || chat.isGroup) return null;
  if (chat.directPartner && !isSameId(chat.directPartner, currentUserId)) {
    return chat.directPartner;
  }
  return (chat.members ?? []).find((member) => !isSameId(member, currentUserId)) ?? null;
};

const getInitial = (person, fallback = "U") =>
  (person?.name || person?.email || fallback).charAt(0).toUpperCase();

const ProfileAvatar = ({ person, online = false, className = "", fallback = "U", style }) => (
  <div className={`avatar ${online ? "online" : ""} ${className}`.trim()} style={style}>
    {person?.avatarUrl ? (
      <img src={person.avatarUrl} alt={person.name || person.email || "Profile"} />
    ) : (
      getInitial(person, fallback)
    )}
  </div>
);

export default function ChatPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector((s) => s.auth);
  const { chats, activeChatId, messages, onlineUsers, loading, error } = useAppSelector((s) => s.chat);

  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [userHits, setUserHits] = useState([]);
  const [hasSearchedUsers, setHasSearchedUsers] = useState(false);
  const [searching, setSearching] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [mutedChatIds, setMutedChatIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mchat_muted_chats") ?? "[]");
    } catch {
      return [];
    }
  });
  const [readReceiptTooltip, setReadReceiptTooltip] = useState(null);
  const menuRef = useRef(null);
  const activeChatIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setChatMenuOpen(false);
      }
    };
    if (chatMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [chatMenuOpen]);

  const currentUserId = getUserId(user);
  const visibleChats = useMemo(() => {
    if (!currentUserId) return [];
    return chats.filter((chat) => {
      if (chat.isGroup) return true;
      return Boolean(getDirectPartner(chat, currentUserId));
    });
  }, [chats, currentUserId]);
  const activeChat = useMemo(
    () => visibleChats.find((c) => isSameId(c?._id ?? c?.id, activeChatId)) ?? null,
    [visibleChats, activeChatId],
  );
  const onlineUserIds = useMemo(() => new Set((onlineUsers ?? []).map(toIdString).filter(Boolean)), [onlineUsers]);
  const isUserOnline = (candidate) => {
    const candidateId = toIdString(candidate);
    return Boolean(candidateId && (onlineUserIds.has(candidateId) || candidate?.status === "online"));
  };
  const otherUser = useMemo(() => {
    return getDirectPartner(activeChat, currentUserId);
  }, [activeChat, currentUserId]);
  const isOnline = isUserOnline(otherUser);
  const otherStatus = useMemo(() => {
    if (!otherUser) return "Offline";
    if (isOnline) return "Online";
    const lastSeen = otherUser.lastSeenAt ?? otherUser.updatedAt;
    return lastSeen ? `Last seen ${moment(lastSeen).fromNow()}` : "Offline";
  }, [otherUser, isOnline]);
  const visibleMessages = useMemo(() => {
    const term = chatSearch.trim().toLowerCase();
    if (!term) return messages;
    return messages.filter((message) => (message.text ?? "").toLowerCase().includes(term));
  }, [messages, chatSearch]);
  const displayedGroups = useMemo(() => groupMessagesByDate(visibleMessages), [visibleMessages]);
  const activeChatMuted = mutedChatIds.some((chatId) => isSameId(chatId, activeChatId));

  useEffect(() => {
    dispatch(loadChatsRequest());
  }, [dispatch]);

  useEffect(() => {
    if (!visibleChats.length) return;
    const activeExists = visibleChats.some((chat) => isSameId(chat?._id ?? chat?.id, activeChatId));
    if (!activeChatId || !activeExists) {
      dispatch(setActiveChat(visibleChats[0]._id ?? visibleChats[0].id));
    }
  }, [visibleChats, activeChatId, dispatch]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeChatId, messages.length]);

  useEffect(() => {
    localStorage.setItem("mchat_muted_chats", JSON.stringify(mutedChatIds));
  }, [mutedChatIds]);

  useEffect(() => {
    if (!token) return undefined;

    const authenticateSocket = () => {
      socket.emit("authenticate", { token }, (ack) => {
        if (Array.isArray(ack?.onlineUsers)) {
          dispatch(setOnlineUsers(ack.onlineUsers));
        }
        const currentChatId = activeChatIdRef.current;
        if (currentChatId) {
          socket.emit("joinChat", { chatId: currentChatId });
        }
      });
    };

    const handleNewMessage = (data) => {
      dispatch(newMessage(data));
      dispatch(loadChatsRequest());

      const incomingChatId = data?.chatId ?? data?.message?.chat;
      const senderId = getUserId(data?.message?.sender);
      if (
        isSameId(incomingChatId, activeChatIdRef.current) &&
        !isSameId(senderId, currentUserId)
      ) {
        socket.emit("markAsRead", { chatId: incomingChatId });
      }
    };

    const handleOnlineUsers = (userIds) => {
      dispatch(setOnlineUsers(userIds));
    };

    const handleMessagesRead = (data) => {
      dispatch(messagesRead(data));
    };

    const handleConnect = () => {
      authenticateSocket();
    };

    const handleConnectError = (error) => {
      console.error("Socket connection error:", error);
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("onlineUsers", handleOnlineUsers);
    socket.on("messagesRead", handleMessagesRead);
    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);

    if (!socket.connected) {
      socket.connect();
    } else {
      authenticateSocket();
    }

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("onlineUsers", handleOnlineUsers);
      socket.off("messagesRead", handleMessagesRead);
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
    };
  }, [token, dispatch, currentUserId]);

  useEffect(() => {
    if (!token || !activeChatId || !socket.connected) return;
    socket.emit("joinChat", { chatId: activeChatId });
  }, [token, activeChatId]);

  const handleLogout = () => {
    socket.disconnect();
    dispatch(clearChat());
    dispatch(logout());
    navigate("/messenger/login", { replace: true });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    setSearching(true);
    setHasSearchedUsers(true);
    try {
      const res = await listUsersAPI({ q: trimmed, limit: 10 });
      const list = res.data?.users ?? [];
      // Avoid showing self in results
      setUserHits(list.filter((u) => {
        return currentUserId ? !isSameId(u, currentUserId) : true;
      }));
    } catch (err) {
      toast.error(err.response?.data?.error ?? err.message ?? "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const startDirect = async (selectedUser) => {
    try {
      const otherUserId = getUserId(selectedUser);
      if (!otherUserId && !selectedUser?.email) {
        throw new Error("Selected user is invalid");
      }
      const res = await createDirectChatAPI({ userId: otherUserId, email: selectedUser?.email });
      const created = res.data?.chat;
      if (!created?._id) throw new Error("Chat not created");
      const memberIds = (created.members ?? []).map(toIdString).filter(Boolean);
      const selectedMember = (created.members ?? []).find((member) => {
        return isSameId(member, otherUserId) || (
          selectedUser?.email &&
          member?.email?.toLowerCase() === selectedUser.email.toLowerCase()
        );
      });
      if (memberIds.length < 2 || !selectedMember) {
        throw new Error("Chat members did not match selected user");
      }
      dispatch(upsertChat({ ...created, directPartner: selectedMember ?? selectedUser }));
      setChatMenuOpen(false);
      setChatSearchOpen(false);
      setChatSearch("");
      setProfileOpen(false);
      dispatch(setActiveChat(created._id));
      dispatch(loadChatsRequest());
      setQ("");
      setUserHits([]);
      setHasSearchedUsers(false);
    } catch (err) {
      toast.error(err.response?.data?.error ?? err.message ?? "Failed to start chat");
    }
  };

  const selectChat = (chatId) => {
    setChatMenuOpen(false);
    setChatSearchOpen(false);
    setChatSearch("");
    setProfileOpen(false);
    dispatch(setActiveChat(chatId));
  };

  const toggleMuteActiveChat = () => {
    if (!activeChatId) return;
    setMutedChatIds((ids) => {
      if (ids.some((chatId) => isSameId(chatId, activeChatId))) {
        return ids.filter((chatId) => !isSameId(chatId, activeChatId));
      }
      return [...ids, activeChatId];
    });
    setChatMenuOpen(false);
  };

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    dispatch(sendMessageRequest({
      text: trimmed,
      clientTempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sender: user,
    }));
    setText("");
  };

  return (
    <div className="whatsapp-layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <ProfileAvatar person={user} online className="profile-avatar" fallback="U" />
          <div>
            <h2>Chats</h2>
            <div className="logged-user">{user?.name || user?.email || "Unknown"}</div>
          </div>
          <button onClick={handleLogout} aria-label="Logout">
            <FaSignOutAlt /> Logout
          </button>
        </div>
        <div className="search-bar">
          <form onSubmit={handleSearch}>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (!e.target.value.trim()) {
                  setUserHits([]);
                  setHasSearchedUsers(false);
                }
              }}
              placeholder="Search users..."
              aria-label="Search users"
            />
            <button type="submit" disabled={searching}>
              <FaSearch /> {searching ? "Searching" : "Search"}
            </button>
          </form>
        </div>
        {userHits.length > 0 && (
          <div className="user-hits">
            {userHits.map((u) => {
              const userId = u._id ?? u.id;
              return (
                <div key={userId} className="user-hit">
                  <div className="user-hit-profile">
                    <ProfileAvatar person={u} online={isUserOnline(u)} className="search-avatar" fallback="G" />
                    <span>{u.name || u.email}</span>
                  </div>
                  <button onClick={() => startDirect(u)}>Chat</button>
                </div>
              );
            })}
          </div>
        )}
        {hasSearchedUsers && !searching && q.trim() && userHits.length === 0 && (
          <div className="sidebar-state">No matching users found.</div>
        )}
        <div className="chats-list">
          {loading && visibleChats.length === 0 && <div className="sidebar-state">Loading chats...</div>}
          {error && <div className="sidebar-state error">{error}</div>}
          {!loading && !error && visibleChats.length === 0 && (
            <div className="sidebar-state">Search for a teammate to start a conversation.</div>
          )}
          {visibleChats.map((c) => {
            const other = getDirectPartner(c, currentUserId);
            const online = isUserOnline(other);
            return (
              <div
                key={c._id}
                className={`chat-item ${isSameId(activeChatId, c._id) ? "active" : ""}`}
                onClick={() => selectChat(c._id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") selectChat(c._id);
                }}
              >
                <ProfileAvatar person={other} online={online} fallback="G" />
                <div className="chat-info">
                  <div className="name">{c.isGroup ? c.name : other?.name || other?.email}</div>
                  <div className="last-msg">{c.lastMessage?.text || "No messages yet"}</div>
                </div>
                <div className="status">
                  {mutedChatIds.some((chatId) => isSameId(chatId, c._id)) && <FaBellSlash className="muted-icon" />}
                  {online && <span className="online-dot"></span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="main-chat">
        {activeChat ? (
          <>
            <div className="chat-header">
              <ProfileAvatar person={otherUser} online={isOnline} fallback="G" />
              <div className="info">
                <div className="name">{activeChat.isGroup ? activeChat.name : otherUser?.name || otherUser?.email}</div>
                <div className="status">{activeChatMuted ? "Muted" : otherStatus}</div>
              </div>
              <div className="chat-menu-wrap" ref={menuRef}>
                <button 
                  className="icon-button"
                  onClick={() => setChatMenuOpen(!chatMenuOpen)}
                  aria-label="Chat options"
                  aria-expanded={chatMenuOpen}
                >
                  ⋮
                </button>
                {chatMenuOpen && (
                  <div className="chat-menu">
                    <button 
                      onClick={() => {
                        setChatSearchOpen(true);
                        setChatMenuOpen(false);
                      }}
                    >
                      <FaSearch /> Search in chat
                    </button>
                    <button 
                      onClick={() => {
                        setProfileOpen(true);
                        setChatMenuOpen(false);
                      }}
                    >
                      <FaUser /> View profile
                    </button>
                    <button onClick={toggleMuteActiveChat}>
                      {activeChatMuted ? <FaBell /> : <FaBellSlash />}
                      {activeChatMuted ? "Unmute notifications" : "Mute notifications"}
                    </button>
                  </div>
                )}
              </div>
            </div>
            {chatSearchOpen && (
              <div className="chat-search">
                <FaSearch />
                <input
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Search this conversation"
                  aria-label="Search this conversation"
                  autoFocus
                />
                <button
                  type="button"
                  aria-label="Close conversation search"
                  onClick={() => {
                    setChatSearchOpen(false);
                    setChatSearch("");
                  }}
                >
                  <FaTimes />
                </button>
              </div>
            )}
            <div className="messages">
              {displayedGroups.length === 0 && (
                <div className="empty-messages">
                  {chatSearch.trim() ? "No messages match your search." : "No messages yet. Send the first one."}
                </div>
              )}
              {displayedGroups.map((group) => (
                <div key={group.date} className="message-group">
                  <div className="date-divider">{formatDateLabel(group.date)}</div>
                  {group.messages.map((m) => {
                    const senderId = getUserId(m.sender);
                    const isMine = isSameId(senderId, currentUserId);
                    const read = isMine && Array.isArray(m.readBy) && m.readBy.some((r) => !isSameId(r, senderId));
                    const receiptText = isMine ? (read ? 'Read' : 'Sent') : null;
                    
                    // Get list of users who read this message
                    const readByUsers = isMine && Array.isArray(m.readBy) 
                      ? m.readBy
                          .map((id) => {
                            return (activeChat.members ?? []).find((u) => isSameId(u, id));
                          })
                          .filter(Boolean)
                          .filter((u) => !isSameId(u, senderId))
                      : [];
                    
                    return (
                      <div key={m._id} className={`message-line ${isMine ? 'sent' : 'received'}`}>
                        {!isMine && (
                          <ProfileAvatar
                            person={m.sender}
                            online={isUserOnline(m.sender)}
                            className="message-avatar"
                            fallback="G"
                          />
                        )}
                        <div className={`message ${isMine ? 'sent' : 'received'}`}>
                          <div className="text">{m.text}</div>
                          <div className="meta">
                            <span className="time">{moment(m.createdAt).format('h:mm A')}</span>
                            {isMine && (
                              <div className="read-receipt">
                                <span 
                                  className={`read-status ${read ? 'read' : 'unread'}`}
                                  onMouseEnter={() => read && setReadReceiptTooltip(m._id)}
                                  onMouseLeave={() => setReadReceiptTooltip(null)}
                                >
                                  {receiptText}
                                </span>
                                {readReceiptTooltip === m._id && readByUsers.length > 0 && (
                                  <div className="read-tooltip">
                                    Read by: {readByUsers.map((u) => u.name || u.email).join(', ')}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="message-input" onSubmit={handleSend}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                aria-label="Message text"
                disabled={!activeChatId}
              />
              <button type="submit" disabled={!activeChatId || !text.trim()}>
                <FaPaperPlane /> Send
              </button>
            </form>
            {profileOpen && (
              <aside className="profile-panel" aria-label="Conversation profile">
                <button className="profile-close" onClick={() => setProfileOpen(false)} aria-label="Close profile">
                  <FaTimes />
                </button>
                <ProfileAvatar person={otherUser} online={isOnline} className="profile-large" fallback="G" />
                <h3>{activeChat.isGroup ? activeChat.name : otherUser?.name || "Unknown user"}</h3>
                <p>{otherUser?.email}</p>
                <div className="profile-status">{otherStatus}</div>
              </aside>
            )}
          </>
        ) : (
          <div className="no-chat">Select a chat to start messaging</div>
        )}
      </div>
    </div>
  );
}
