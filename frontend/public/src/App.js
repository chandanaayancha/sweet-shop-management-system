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
  const [newSweet, setNewSweet] = useState({ name: '', category: '', price: '', quantity: '' });

  // Load sweets
  useEffect(() => {
    fetchSweets();
  }, []);

  const fetchSweets = async () => {
    const res = await axios.get('http://localhost:5000/api/sweets');
    setSweets(res.data);
  };

  // ================= LOGIN =================
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        'http://localhost:5000/api/auth/login',
        { email, password }
      );

      setUser(res.data.user);

      // ✅ SAVE USER INFO
      localStorage.setItem('userId', res.data.user.id);
      localStorage.setItem('userEmail', res.data.user.email);
      localStorage.setItem('isAdmin', res.data.user.isAdmin);

      alert('Login successful');
    } catch {
      alert('Login failed');
    }
  };

  // ================= REGISTER =================
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        'http://localhost:5000/api/auth/register',
        { email, password }
      );

      alert('Registration successful. Please login.');
      setIsLogin(true);
    } catch {
      alert('Registration failed');
    }
  };

  // ================= PURCHASE =================
  const handlePurchase = async (id) => {
    try {
      const userId = localStorage.getItem('userId');

      await axios.post(
        `http://localhost:5000/api/sweets/${id}/purchase`,
        { user_id: userId }
      );

      fetchSweets();
      alert('Purchase successful');
    } catch {
      alert('Purchase failed');
    }
  };

  // ================= ADMIN =================
  const handleAddSweet = async (e) => {
    e.preventDefault();
    await axios.post('http://localhost:5000/api/sweets', newSweet);
    setNewSweet({ name: '', category: '', price: '', quantity: '' });
    fetchSweets();
  };

  const handleDelete = async (id) => {
    await axios.delete(`http://localhost:5000/api/sweets/${id}`);
    fetchSweets();
  };

  const handleRestock = async (id) => {
    await axios.post(`http://localhost:5000/api/sweets/${id}/restock`);
    fetchSweets();
  };

  // ================= UI =================
  const filteredSweets = sweets.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container">
      <h1>🍬 Sweet Shop</h1>

      {!user ? (
        <form onSubmit={isLogin ? handleLogin : handleRegister}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button type="submit">{isLogin ? 'Login' : 'Register'}</button>

          <p onClick={() => setIsLogin(!isLogin)} style={{ cursor: 'pointer' }}>
            {isLogin ? 'Create account' : 'Already have account'}
          </p>
        </form>
      ) : (
        <>
          <p>Welcome {user.email} {user.isAdmin && '(Admin)'}</p>

          <button
            onClick={() => {
              localStorage.clear();
              setUser(null);
            }}
          >
            Logout
          </button>

          <input
            placeholder="Search sweets"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {user.isAdmin && (
            <form onSubmit={handleAddSweet}>
              <input placeholder="Name" onChange={e => setNewSweet({ ...newSweet, name: e.target.value })} />
              <input placeholder="Category" onChange={e => setNewSweet({ ...newSweet, category: e.target.value })} />
              <input type="number" placeholder="Price" onChange={e => setNewSweet({ ...newSweet, price: e.target.value })} />
              <input type="number" placeholder="Quantity" onChange={e => setNewSweet({ ...newSweet, quantity: e.target.value })} />
              <button>Add Sweet</button>
            </form>
          )}

          {filteredSweets.map(s => (
            <div key={s.id}>
              <h3>{s.name}</h3>
              <p>{s.category}</p>
              <p>₹{s.price}</p>
              <p>Stock: {s.quantity}</p>

              <button disabled={s.quantity === 0} onClick={() => handlePurchase(s.id)}>
                Buy
              </button>

              {user.isAdmin && (
                <>
                  <button onClick={() => handleRestock(s.id)}>Restock</button>
                  <button onClick={() => handleDelete(s.id)}>Delete</button>
                </>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default App;
