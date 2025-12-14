import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [sweets, setSweets] = useState([]);
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [search, setSearch] = useState('');
  const [newSweet, setNewSweet] = useState({
    name: '',
    category: '',
    price: '',
    quantity: ''
  });
  const [purchaseHistory, setPurchaseHistory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showHistory, setShowHistory] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [loadingSweets, setLoadingSweets] = useState(true);
  const [error, setError] = useState(null);

  // ================= LOAD DATA =================
  useEffect(() => {
    console.log('🎬 App component mounted');
    fetchSweets();
    fetchCategories();

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log('👤 Found saved user:', parsedUser.email);
        setUser(parsedUser);
        fetchPurchaseHistory(parsedUser.id);
      } catch (e) {
        console.error('Error parsing saved user:', e);
        localStorage.removeItem('user');
      }
    }
  }, []);

  // ================= FETCH SWEETS =================
  const fetchSweets = async () => {
    setLoadingSweets(true);
    setError(null);
    try {
      console.log('🔄 Fetching sweets from:', 'http://localhost:5000/api/sweets');
      const response = await axios.get('http://localhost:5000/api/sweets');
      console.log('✅ Sweets response:', response.data);
      console.log('📊 Number of sweets:', response.data.sweets?.length || 0);
      
      if (response.data && response.data.sweets) {
        setSweets(response.data.sweets);
      } else {
        console.error('❌ Invalid response structure:', response.data);
        setError('Invalid data received from server');
      }
    } catch (error) {
      console.error('❌ Error fetching sweets:', error);
      console.error('Error details:', error.response?.data || error.message);
      setError('Failed to load sweets. Please check if backend is running.');
    } finally {
      setLoadingSweets(false);
    }
  };

  // ================= FETCH CATEGORIES =================
  const fetchCategories = async () => {
    try {
      console.log('🔄 Fetching categories...');
      const response = await axios.get('http://localhost:5000/api/categories');
      console.log('✅ Categories:', response.data);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // ================= FETCH PURCHASE HISTORY =================
  const fetchPurchaseHistory = async (userId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/purchases/user/${userId}`);
      console.log('📋 Purchase history loaded:', response.data.purchases?.length || 0, 'purchases');
      setPurchaseHistory(response.data);
    } catch (error) {
      console.error('Error fetching purchase history:', error);
    }
  };

  // ================= LOGIN =================
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      console.log('🔐 Attempting login...');
      const response = await axios.post(
        'http://localhost:5000/api/auth/login',
        { email, password }
      );
      const userData = response.data.user;
      console.log('✅ Login successful:', userData.email);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      fetchPurchaseHistory(userData.id);
      fetchSweets(); // Refresh sweets after login
      alert('🎉 Login successful!');
      setEmail('');
      setPassword('');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Login failed. Please try again.';
      console.error('❌ Login failed:', errorMsg);
      alert('❌ ' + errorMsg);
    }
  };

  // ================= REGISTER =================
  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      console.log('📝 Attempting registration...');
      const response = await axios.post(
        'http://localhost:5000/api/auth/register',
        { email, password }
      );
      const userData = response.data.user;
      console.log('✅ Registration successful:', userData.email);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      fetchPurchaseHistory(userData.id);
      fetchSweets(); // Refresh sweets after registration
      alert('🎉 Registration successful!');
      setIsLogin(true);
      setEmail('');
      setPassword('');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Registration failed. Please try again.';
      console.error('❌ Registration failed:', errorMsg);
      alert('❌ ' + errorMsg);
    }
  };

  // ================= PURCHASE SWEET =================
  const handlePurchase = async (id, sweetName) => {
    if (!user || !user.id) {
      alert('⚠️ Please login first!');
      return;
    }

    try {
      console.log(`🛒 Purchasing sweet ${id}: ${sweetName}`);
      const response = await axios.post(
        `http://localhost:5000/api/sweets/${id}/purchase`,
        {
          user_id: user.id,
          quantity: 1
        }
      );

      const details = response.data.purchaseDetails;
      alert(`✅ Purchase Successful!\n\n🍬 ${details.sweetName}\n📦 Quantity: 1\n💰 Total: $${details.totalPrice}\n📅 ${details.date}`);
      
      fetchSweets(); // Refresh sweets list
      fetchPurchaseHistory(user.id); // Refresh purchase history
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Purchase failed. Please try again.';
      console.error('❌ Purchase failed:', errorMsg);
      alert('❌ ' + errorMsg);
    }
  };

  // ================= ADD SWEET (ADMIN) =================
  const handleAddSweet = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      console.log('➕ Adding new sweet:', newSweet);
      await axios.post('http://localhost:5000/api/sweets', newSweet);
      setNewSweet({ name: '', category: '', price: '', quantity: '' });
      fetchSweets(); // Refresh sweets list
      fetchCategories(); // Refresh categories
      alert('✅ Sweet added successfully!');
      setShowAdminPanel(false);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to add sweet. Please try again.';
      console.error('❌ Add sweet failed:', errorMsg);
      alert('❌ ' + errorMsg);
    }
  };

  // ================= DELETE SWEET =================
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      console.log(`🗑️ Deleting sweet ${id}: ${name}`);
      await axios.delete(`http://localhost:5000/api/sweets/${id}`);
      fetchSweets();
      alert('🗑️ Sweet deleted!');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Delete failed. Please try again.';
      alert('❌ ' + errorMsg);
    }
  };

  // ================= RESTOCK =================
  const handleRestock = async (id, name) => {
    try {
      console.log(`📦 Restocking sweet ${id}: ${name}`);
      await axios.post(`http://localhost:5000/api/sweets/${id}/restock`);
      fetchSweets();
      alert(`✅ Restocked 10 more "${name}"!`);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Restock failed. Please try again.';
      alert('❌ ' + errorMsg);
    }
  };

  // ================= SEARCH =================
  const handleSearch = async () => {
    if (!search.trim() && selectedCategory === 'All') {
      fetchSweets();
      return;
    }
    
    try {
      console.log(`🔍 Searching: "${search}", Category: "${selectedCategory}"`);
      const response = await axios.get(
        `http://localhost:5000/api/sweets/search?name=${search}&category=${selectedCategory === 'All' ? '' : selectedCategory}`
      );
      console.log(`🔍 Found ${response.data.sweets?.length || 0} sweets`);
      setSweets(response.data.sweets || []);
    } catch (error) {
      console.error('Search failed:', error);
      setSweets([]);
    }
  };

  // ================= LOGOUT =================
  const handleLogout = () => {
    console.log('👋 Logging out user:', user?.email);
    setUser(null);
    setPurchaseHistory(null);
    localStorage.removeItem('user');
    fetchSweets(); // Reset sweets list
    alert('👋 Logged out successfully!');
  };

  // ================= RESET DATABASE =================
  const handleResetDatabase = async () => {
    if (!window.confirm('⚠️ This will reset the entire database! Are you sure?')) return;
    
    try {
      console.log('🔄 Resetting database...');
      await axios.post('http://localhost:5000/api/reset-database?secret=reset123');
      alert('✅ Database reset successfully!');
      fetchSweets();
      fetchCategories();
      if (user) {
        fetchPurchaseHistory(user.id);
      }
    } catch (error) {
      console.error('Reset failed:', error);
      alert('❌ Reset failed: ' + (error.response?.data?.error || 'Check console for details'));
    }
  };

  // ================= FILTER SWEETS =================
  const filteredSweets = sweets.filter(sweet => {
    if (!sweet || !sweet.name || !sweet.category) return false;
    
    const matchesSearch = sweet.name.toLowerCase().includes(search.toLowerCase()) ||
                         sweet.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || sweet.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // ================= CALCULATE TOTALS =================
  const calculateTotalValue = () => {
    return sweets.reduce((total, sweet) => {
      if (!sweet || !sweet.price || !sweet.quantity) return total;
      return total + (parseFloat(sweet.price) * parseInt(sweet.quantity));
    }, 0).toFixed(2);
  };

  const calculateLowStockCount = () => {
    return sweets.filter(sweet => sweet && sweet.quantity < 10).length;
  };

  // ================= TEST BACKEND CONNECTION =================
  const testBackendConnection = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/test');
      console.log('✅ Backend test response:', response.data);
      alert(`✅ Backend is working!\n\nMessage: ${response.data.message}\nTime: ${response.data.time}`);
    } catch (error) {
      console.error('❌ Backend test failed:', error);
      alert('❌ Backend connection failed! Check if backend is running on port 5000.');
    }
  };

  // ================= CHECK DATABASE STATS =================
  const checkDatabaseStats = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/stats');
      console.log('📊 Database stats:', response.data);
      alert(`📊 Database Stats:\n\nSweets: ${response.data.totalSweets}\nUsers: ${response.data.totalUsers}\nPurchases: ${response.data.totalPurchases}\nTotal Value: $${response.data.totalValue}`);
    } catch (error) {
      console.error('Stats check failed:', error);
    }
  };

  return (
    <div className="container">
      {/* ================= HEADER ================= */}
      <header className="header">
        <div className="header-content">
          <h1>🍬 Sweet Shop Delight</h1>
          <p className="tagline">Your one-stop destination for delicious sweets!</p>
          <div className="header-buttons">
            <button onClick={testBackendConnection} className="btn-test">
              🧪 Test Backend
            </button>
            <button onClick={checkDatabaseStats} className="btn-stats">
              📊 Database Stats
            </button>
            <button onClick={handleResetDatabase} className="btn-reset">
              🔄 Reset DB
            </button>
          </div>
        </div>
        
        {user && (
          <div className="user-info">
            <div className="user-details">
              <span className="user-avatar">
                {user.email.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="user-email">{user.email}</p>
                <p className="user-role">
                  {user.isAdmin ? '👑 Administrator' : '👤 Customer'}
                </p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ================= DEBUG INFO ================= */}
      {error && (
        <div className="error-alert">
          <p>⚠️ {error}</p>
          <button onClick={fetchSweets}>🔄 Retry</button>
        </div>
      )}

      {/* ================= AUTH SECTION ================= */}
      {!user ? (
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h2>{isLogin ? 'Welcome Back!' : 'Create Account'}</h2>
              <p>{isLogin ? 'Sign in to your account' : 'Join our sweet community'}</p>
            </div>
            
            <form onSubmit={isLogin ? handleLogin : handleRegister} className="auth-form">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
              
              <button type="submit" className="btn-primary btn-large">
                {isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>
            
            <div className="auth-footer">
              <button 
                onClick={() => setIsLogin(!isLogin)} 
                className="btn-link"
              >
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </button>
              
              <div className="demo-credentials">
                <h4>Demo Accounts:</h4>
                <div className="demo-account">
                  <span>👑 Admin:</span>
                  <span>admin@shop.com / admin123</span>
                </div>
                <div className="demo-account">
                  <span>👤 User:</span>
                  <span>user@shop.com / user123</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ================= NAVBAR ================= */}
          <nav className="navbar">
            <div className="search-container">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search sweets by name or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
                  className="search-input"
                />
                <button onClick={handleSearch} className="btn-search">
                  🔍 Search
                </button>
              </div>
              
              <div className="category-filter">
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="category-select"
                >
                  <option value="All">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <button onClick={() => { 
                setSearch(''); 
                setSelectedCategory('All'); 
                fetchSweets(); 
              }} className="btn-secondary">
                🔄 Clear Filters
              </button>
            </div>
            
            <div className="navbar-actions">
              {user.isAdmin && (
                <button 
                  onClick={() => setShowAdminPanel(!showAdminPanel)} 
                  className={showAdminPanel ? "btn-admin-active" : "btn-admin"}
                >
                  {showAdminPanel ? '✖ Close Admin Panel' : '➕ Add New Sweet'}
                </button>
              )}
              
              <button 
                onClick={() => setShowHistory(!showHistory)} 
                className={showHistory ? "btn-history-active" : "btn-history"}
              >
                {showHistory ? '✖ Close History' : '📋 View Purchase History'}
              </button>
              
              <button onClick={handleLogout} className="btn-logout">
                👋 Logout
              </button>
            </div>
          </nav>

          {/* ================= LOADING STATE ================= */}
          {loadingSweets && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>Loading sweets...</p>
            </div>
          )}

          {/* ================= STATS CARDS ================= */}
          {!loadingSweets && sweets.length > 0 && (
            <div className="stats-container">
              <div className="stat-card">
                <h3>🎂 Total Sweets</h3>
                <p className="stat-number">{sweets.length}</p>
                <p className="stat-sub">In database</p>
              </div>
              <div className="stat-card">
                <h3>💰 Total Value</h3>
                <p className="stat-number">${calculateTotalValue()}</p>
                <p className="stat-sub">Inventory worth</p>
              </div>
              <div className="stat-card">
                <h3>⚠️ Low Stock</h3>
                <p className="stat-number">{calculateLowStockCount()}</p>
                <p className="stat-sub">Need restocking</p>
              </div>
              {purchaseHistory && (
                <div className="stat-card">
                  <h3>🛍️ Your Purchases</h3>
                  <p className="stat-number">{purchaseHistory.summary.purchaseCount}</p>
                  <p className="stat-sub">Spent: ${purchaseHistory.summary.totalAmount}</p>
                </div>
              )}
            </div>
          )}

          {/* ================= ADMIN PANEL ================= */}
          {user.isAdmin && showAdminPanel && (
            <div className="admin-panel">
              <h2 className="panel-title">➕ Add New Sweet</h2>
              <form onSubmit={handleAddSweet} className="admin-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Sweet Name *</label>
                    <input
                      placeholder="e.g., Chocolate Bar"
                      value={newSweet.name}
                      onChange={(e) => setNewSweet({ ...newSweet, name: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Category *</label>
                    <input
                      placeholder="e.g., Chocolate, Candy, Bakery"
                      value={newSweet.category}
                      onChange={(e) => setNewSweet({ ...newSweet, category: e.target.value })}
                      required
                      className="form-input"
                      list="categories-list"
                    />
                    <datalist id="categories-list">
                      {categories.map(cat => <option key={cat} value={cat} />)}
                    </datalist>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Price ($) *</label>
                    <input
                      type="number"
                      placeholder="4.99"
                      step="0.01"
                      min="0.01"
                      value={newSweet.price}
                      onChange={(e) => setNewSweet({ ...newSweet, price: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Initial Stock *</label>
                    <input
                      type="number"
                      placeholder="50"
                      min="0"
                      value={newSweet.quantity}
                      onChange={(e) => setNewSweet({ ...newSweet, quantity: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                </div>
                
                <button type="submit" className="btn-primary btn-large">
                  🎉 Add Sweet to Store
                </button>
              </form>
            </div>
          )}

          {/* ================= PURCHASE HISTORY ================= */}
          {showHistory && purchaseHistory && (
            <div className="history-panel">
              <h2 className="panel-title">📋 Your Purchase History</h2>
              
              <div className="history-summary-cards">
                <div className="summary-card">
                  <h4>Total Purchases</h4>
                  <p className="summary-number">{purchaseHistory.summary.purchaseCount}</p>
                </div>
                <div className="summary-card">
                  <h4>Total Items</h4>
                  <p className="summary-number">{purchaseHistory.summary.totalItems}</p>
                </div>
                <div className="summary-card">
                  <h4>Total Spent</h4>
                  <p className="summary-number">${purchaseHistory.summary.totalAmount}</p>
                </div>
              </div>
              
              <div className="history-table-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Sweet Name</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Total</th>
                      <th>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseHistory.purchases.slice(0, 20).map((purchase) => (
                      <tr key={purchase.id}>
                        <td className="sweet-name-cell">
                          <span className="sweet-icon">🍬</span>
                          {purchase.sweet_name}
                        </td>
                        <td>{purchase.quantity}</td>
                        <td>${purchase.price}</td>
                        <td className="total-cell">${(purchase.price * purchase.quantity).toFixed(2)}</td>
                        <td className="date-cell">{purchase.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {purchaseHistory.purchases.length === 0 && (
                  <div className="empty-history">
                    <p>📭 No purchases yet. Start shopping!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= SWEETS GRID ================= */}
          <div className="sweets-container">
            <div className="section-header">
              <h2 className="section-title">
                🍭 Available Sweets ({filteredSweets.length})
                <span className="category-tag">{selectedCategory}</span>
              </h2>
              <button onClick={fetchSweets} className="btn-refresh">
                🔄 Refresh
              </button>
            </div>
            
            {!loadingSweets && filteredSweets.length === 0 ? (
              <div className="empty-sweets">
                <p>😔 No sweets found. Try a different search or add new sweets!</p>
                <button onClick={() => { setSearch(''); setSelectedCategory('All'); fetchSweets(); }} className="btn-primary">
                  Show All Sweets
                </button>
              </div>
            ) : (
              <div className="sweets-grid">
                {filteredSweets.map((sweet) => (
                  <div key={sweet.id} className="sweet-card">
                    <div className="sweet-header">
                      <span className="sweet-icon-large">
                        {sweet.category === 'Chocolate' ? '🍫' : 
                         sweet.category === 'Candy' ? '🍬' : 
                         sweet.category === 'Bakery' ? '🥐' : 
                         sweet.category === 'Frozen' ? '🍦' : '🍭'}
                      </span>
                      <h3 className="sweet-name">{sweet.name}</h3>
                      <span className="sweet-id">ID: {sweet.id}</span>
                    </div>
                    
                    <div className="sweet-details">
                      <div className="detail-row">
                        <span className="detail-label">Category:</span>
                        <span className="detail-value category-badge">{sweet.category}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Price:</span>
                        <span className="detail-value price-tag">${parseFloat(sweet.price).toFixed(2)}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Stock:</span>
                        <span className={`detail-value stock-status ${sweet.quantity < 10 ? 'low' : sweet.quantity < 30 ? 'medium' : 'high'}`}>
                          {sweet.quantity} {sweet.quantity < 10 && '⚠️'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="sweet-actions">
                      <button
                        className={`btn-purchase ${sweet.quantity === 0 ? 'disabled' : ''}`}
                        onClick={() => handlePurchase(sweet.id, sweet.name)}
                        disabled={sweet.quantity === 0}
                      >
                        {sweet.quantity === 0 ? 'Out of Stock' : `Buy Now - $${parseFloat(sweet.price).toFixed(2)}`}
                      </button>
                      
                      {user.isAdmin && (
                        <div className="admin-actions">
                          <button 
                            className="btn-restock"
                            onClick={() => handleRestock(sweet.id, sweet.name)}
                          >
                            📦 Restock (+10)
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDelete(sweet.id, sweet.name)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================= FOOTER ================= */}
          <footer className="footer">
            <div className="footer-content">
              <p>🍬 Sweet Shop Delight - Made with ❤️ for sweet lovers everywhere</p>
              <p className="footer-stats">
                {sweets.length} sweets available • ${calculateTotalValue()} total value • {calculateLowStockCount()} low stock items
              </p>
              <p className="footer-debug">
                Backend: http://localhost:5000 • Frontend: http://localhost:3000
              </p>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;